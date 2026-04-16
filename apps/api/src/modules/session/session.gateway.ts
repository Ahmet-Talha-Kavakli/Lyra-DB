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
    private readonly therapist: TherapistService,
    private readonly tts:       TtsService,
    private readonly sessions:  SessionService,
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
      const [userProfile, recentMemories, sessionCount] = await Promise.all([
        this.sessions.getUserProfile(payload.clerkUserId),
        this.sessions.getRecentMemories(payload.clerkUserId, 8),
        this.sessions.getSessionCount(payload.clerkUserId),
      ]);

      let ttsPromise: Promise<string | null> | null = null;

      await this.therapist.streamResponse({
        userName:            payload.userName || 'there',
        userProfile:         userProfile ?? { ...FALLBACK_PROFILE, userId: payload.clerkUserId },
        recentMemories,
        conversationHistory: [],
        currentTranscript:   '[SESSION_START] Generate a warm, personalized opening greeting for this session. Greet the user by name. If this is not their first session, reference something specific from the memories provided. Keep it natural and brief — 2-3 sentences max.',
        currentEmotion:      null,
        visionContext:       null,
        sessionNumber:       sessionCount + 1,

        onChunk: (event) => {
          client.emit('ai:chunk', { text: event.text });
        },

        onStreamComplete: (fullText) => {
          ttsPromise = this.tts.synthesise(fullText);
        },

        onDone: async (event) => {
          const audioSrc = ttsPromise
            ? await ttsPromise
            : await this.tts.synthesise(event.fullText);
          if (audioSrc) client.emit('ai:audio', { audioSrc, sessionId });
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

  @SubscribeMessage('session:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MessagePayload,
  ) {
    const { clerkUserId, userName, sessionId, transcript, emotion, visionContext, conversationHistory } = payload;
    if (!transcript?.trim()) return;

    // Drop concurrent messages from the same client — prevents parallel AI pipeline calls
    // that would cause interleaved responses and repeated error floods
    if (this.processingClients.has(client.id)) {
      this.logger.warn(`[${client.id}] Dropping message — previous turn still processing`);
      return;
    }
    this.processingClients.add(client.id);

    try {
      const [userProfile, recentMemories, sessionCount] = await Promise.all([
        this.sessions.getUserProfile(clerkUserId),
        this.sessions.getRecentMemories(clerkUserId, 8),
        this.sessions.getSessionCount(clerkUserId),
      ]);

      // TTS starts as soon as stream closes (in parallel with crisis scoring)
      let ttsPromise: Promise<string | null> | null = null;

      await this.therapist.streamResponse({
        userName:            userName || 'there',
        userProfile:         userProfile ?? { ...FALLBACK_PROFILE, userId: clerkUserId },
        recentMemories,
        conversationHistory,
        currentTranscript:   transcript,
        currentEmotion:      emotion ?? null,
        visionContext:       visionContext ?? null,
        sessionNumber:       sessionCount + 1,

        onChunk: (event) => {
          client.emit('ai:chunk', { text: event.text });
        },

        onStreamComplete: (fullText) => {
          ttsPromise = this.tts.synthesise(fullText);
        },

        onDone: async (event) => {
          const audioSrc = ttsPromise
            ? await ttsPromise
            : await this.tts.synthesise(event.fullText);
          if (audioSrc) client.emit('ai:audio', { audioSrc, sessionId });
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
      // Always release lock so next message can be processed
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

      // Fire-and-forget: trigger post-session async job (SOAP + memory + risk)
      await inngest.send({
        name: 'session/ended',
        data: {
          sessionId:           payload.sessionId,
          userId:              payload.userId,
          conversationHistory: payload.conversationHistory ?? [],
        },
      });
    } catch (err) {
      this.logger.error('session:end', err);
    }
  }
}
