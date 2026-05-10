import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TherapistService } from '../ai-therapist/therapist.service';
import { TtsService } from '../ai-therapist/tts.service';
import { SessionService } from './session.service';
import { PostSessionService } from './post-session.service';
import { inngest } from '../../inngest/inngest.client';
import type { IUserProfile, IEmotionSnapshot } from '@ai-therapist/types';

interface StartSessionPayload {
  clerkUserId: string;
  userName:    string;
}

interface MessagePayload {
  clerkUserId:         string;
  userName:            string;
  sessionId:           string;
  transcript:          string;
  emotion?:            IEmotionSnapshot | null;
  visionContext?:      string | null;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface EndSessionPayload {
  sessionId:           string;
  userId:              string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const FALLBACK_PROFILE: IUserProfile = {
  id:                  'unknown',
  userId:              'unknown',
  goals:               [],
  mentalHealthHistory: {},
  therapyPreferences:  {},
  personalitySnapshot: {},
  riskLevel:           'low',
  disclaimerAcceptedAt: null,
  updatedAt:           new Date(),
};

/**
 * WebSocket gateway — the real-time backbone of the therapy session.
 *
 * Client → server events:
 *   session:start   → creates DB session, emits session:started { sessionId }
 *   session:message → transcript + emotion, runs AI pipeline, streams back
 *   session:end     → marks session completed in DB, triggers post-session job
 *
 * Server → client events:
 *   session:started    → { sessionId }
 *   ai:chunk           → { text }          — streaming GPT-4o mini token
 *   ai:audio           → { audioSrc }      — TTS base64 data URI (full response)
 *   ai:done            → { crisisScore }   — stream finished + crisis score 0-10
 *   session:ended      → { sessionId }
 *   session:error      → { message }
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/session' })
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(SessionGateway.name);

  /**
   * Per-client lock: prevents concurrent AI pipeline calls from the same socket.
   * If user speaks while Lyra is still generating a response, the second message
   * is queued once the first finishes (or dropped after a short wait if busy).
   */
  private readonly processingClients = new Set<string>();

  constructor(
    private readonly therapist:   TherapistService,
    private readonly tts:         TtsService,
    private readonly sessions:    SessionService,
    private readonly postSession: PostSessionService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up lock if client disconnects mid-stream
    this.processingClients.delete(client.id);
  }

  @SubscribeMessage('session:start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartSessionPayload,
  ) {
    try {
      const sessionId = await this.sessions.startSession(payload.clerkUserId);
      client.emit('session:started', { sessionId });

      // Send personalized AI welcome message immediately
      const [userProfile, recentMemories, sessionCount, journalEntries, pendingHomework] = await Promise.all([
        this.sessions.getUserProfile(payload.clerkUserId),
        this.sessions.getRecentMemories(payload.clerkUserId, 8),
        this.sessions.getSessionCount(payload.clerkUserId),
        this.sessions.getRecentJournalEntries(payload.clerkUserId, 5),
        this.sessions.getLastHomework(payload.clerkUserId),
      ]);

      // Sentence-level TTS for welcome message too
      let welcomeBuffer = '';
      const welcomeTtsQueue: Promise<string | null>[] = [];

      await this.therapist.streamResponse({
        userName:            payload.userName || 'there',
        userProfile:         userProfile ?? { ...FALLBACK_PROFILE, userId: payload.clerkUserId },
        recentMemories,
        conversationHistory: [],
        currentTranscript:   '[SESSION_START] Generate a warm, personalized opening greeting for this session. Greet the user by name. If this is not their first session, reference something specific from the memories provided. If there is pending homework from last session, ask about it naturally after greeting. Keep it natural and brief — 2-3 sentences max.',
        currentEmotion:      null,
        visionContext:       null,
        sessionNumber:       sessionCount + 1,
        journalEntries,
        pendingHomework,

        onChunk: (event) => {
          client.emit('ai:chunk', { text: event.text });
          welcomeBuffer += event.text;
          let extracted = this.extractSentence(welcomeBuffer);
          while (extracted) {
            welcomeTtsQueue.push(this.tts.synthesise(extracted.sentence));
            welcomeBuffer = extracted.rest;
            extracted = this.extractSentence(welcomeBuffer);
          }
        },

        onStreamComplete: () => {
          if (welcomeBuffer.trim()) {
            welcomeTtsQueue.push(this.tts.synthesise(welcomeBuffer.trim()));
            welcomeBuffer = '';
          }
        },

        onDone: async () => {
          for (const ttsPromise of welcomeTtsQueue) {
            const audioSrc = await ttsPromise;
            if (audioSrc && client.connected) client.emit('ai:audio', { audioSrc, sessionId });
          }
          client.emit('ai:done', { crisisScore: 0 });
        },

        onError: (err) => {
          this.logger.error('welcome message error', err);
        },
      });
    } catch (err) {
      this.logger.error('session:start', err);
      client.emit('session:error', { message: 'Failed to start session' });
    }
  }

  /**
   * Splits accumulated text buffer into complete sentences (≥15 chars ending
   * with . ! ? followed by whitespace or end-of-string). Returns the first
   * complete sentence and the remaining buffer.
   */
  private extractSentence(buf: string): { sentence: string; rest: string } | null {
    // Need at least 15 chars to avoid splitting on "Dr." "Mr." etc.
    const match = buf.match(/^(.{15,}?[.!?…])(\s+|$)/s);
    if (!match) return null;
    return { sentence: match[1].trim(), rest: buf.slice(match[0].length) };
  }

  @SubscribeMessage('session:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessagePayload,
  ) {
    const { clerkUserId, userName, sessionId, transcript, emotion, visionContext, conversationHistory } = payload;
    if (!transcript?.trim()) return;

    // Drop concurrent messages from the same client — prevents parallel AI pipeline calls
    if (this.processingClients.has(client.id)) {
      this.logger.warn(`[${client.id}] Dropping message — previous turn still processing`);
      return;
    }
    this.processingClients.add(client.id);

    // Safety: auto-release lock after 35s — just above the 28s stream abort timeout
    const lockTimeout = setTimeout(() => {
      if (this.processingClients.has(client.id)) {
        this.logger.warn(`[${client.id}] Lock timeout — force-releasing after 35s`);
        this.processingClients.delete(client.id);
      }
    }, 35_000);

    try {
      // Hybrid memory fetch: semantic search against user's message + recent fallback
      const [userProfile, semanticMemories, recentMemories, sessionCount, journalEntries] = await Promise.all([
        this.sessions.getUserProfile(clerkUserId),
        this.sessions.getSemanticMemories(clerkUserId, transcript, 5),
        this.sessions.getRecentMemories(clerkUserId, 3),
        this.sessions.getSessionCount(clerkUserId),
        this.sessions.getRecentJournalEntries(clerkUserId, 5),
      ]);

      // Merge: semantic (most relevant) first, then pad with recent (chronological context)
      const seenIds = new Set(semanticMemories.map((m) => m.id));
      const memories = [
        ...semanticMemories,
        ...recentMemories.filter((m) => !seenIds.has(m.id)),
      ].slice(0, 8);

      let sentenceBuffer  = '';
      const ttsQueue: Promise<string | null>[] = [];

      await this.therapist.streamResponse({
        userName:            userName || 'there',
        userProfile:         userProfile ?? { ...FALLBACK_PROFILE, userId: clerkUserId },
        recentMemories:      memories,
        conversationHistory,
        currentTranscript:   transcript,
        currentEmotion:      emotion ?? null,
        visionContext:       visionContext ?? null,
        sessionNumber:       sessionCount + 1,
        journalEntries,

        onChunk: (event) => {
          client.emit('ai:chunk', { text: event.text });
          sentenceBuffer += event.text;

          // Queue TTS for each complete sentence as it arrives
          let extracted = this.extractSentence(sentenceBuffer);
          while (extracted) {
            ttsQueue.push(this.tts.synthesise(extracted.sentence));
            sentenceBuffer = extracted.rest;
            extracted = this.extractSentence(sentenceBuffer);
          }
        },

        onStreamComplete: () => {
          // Queue TTS for any remaining text (last sentence without terminal punctuation)
          const remaining = sentenceBuffer.trim();
          if (remaining) {
            ttsQueue.push(this.tts.synthesise(remaining));
            sentenceBuffer = '';
          }
        },

        onDone: async (event) => {
          // Send audio segments in order as each TTS call resolves
          // Since they started in parallel, later segments often resolve before earlier ones finish playing
          for (const ttsPromise of ttsQueue) {
            const audioSrc = await ttsPromise;
            if (audioSrc && client.connected) {
              client.emit('ai:audio', { audioSrc, sessionId });
            }
          }
          client.emit('ai:done', { crisisScore: event.crisisScore ?? 0 });
        },

        onError: (err) => {
          client.emit('session:error', { message: err.message });
        },
      });
    } catch (err) {
      this.logger.error('session:message', err);
      client.emit('session:error', { message: 'AI pipeline error' });
    } finally {
      clearTimeout(lockTimeout);
      this.processingClients.delete(client.id);
    }
  }

  @SubscribeMessage('session:end')
  async handleEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: EndSessionPayload,
  ) {
    try {
      await this.sessions.endSession(payload.sessionId);
      client.emit('session:ended', { sessionId: payload.sessionId });

      const history = payload.conversationHistory ?? [];

      // Try Inngest first (async, retryable, preferred path)
      try {
        await inngest.send({
          name: 'session/ended',
          data: {
            sessionId:           payload.sessionId,
            userId:              payload.userId,
            conversationHistory: history,
          },
        });
        this.logger.log(`Inngest event sent for session ${payload.sessionId}`);
      } catch (inngestErr) {
        // Inngest unavailable — run post-session inline (fire-and-forget)
        this.logger.warn('Inngest send failed, running post-session inline', inngestErr);
        this.postSession
          .process(payload.sessionId, payload.userId, history)
          .catch((e) => this.logger.error('Inline post-session failed', e));
      }
    } catch (err) {
      this.logger.error('session:end', err);
      // Always notify client even on error — prevents "Ending..." stuck state
      client.emit('session:ended', { sessionId: payload.sessionId });
    }
  }
}
