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
import { JournalChatService, type JournalChatContextPayload, type ConversationTurn } from './journal-chat.service';
import type { IUserProfile } from '@ai-therapist/types';

interface JournalMessagePayload {
  clerkUserId:         string;
  userName:            string;
  message:             string;
  conversationHistory: ConversationTurn[];
  context:             JournalChatContextPayload;
}

const FALLBACK_PROFILE: IUserProfile = {
  id:                   'unknown',
  userId:               'unknown',
  goals:                [],
  mentalHealthHistory:  {},
  therapyPreferences:   {},
  personalitySnapshot:  {},
  riskLevel:            'low',
  disclaimerAcceptedAt: null,
  updatedAt:            new Date(),
};

/**
 * Lightweight WS gateway for the in-journal Lyra chat. Distinct namespace
 * from /session — no STT/TTS, no crisis scoring, no DB session record.
 *
 * Client → server:
 *   journal:message → user text + context → streams Lyra reply
 *
 * Server → client:
 *   journal:chunk → { text }
 *   journal:done  → {}
 *   journal:error → { message }
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/journal-chat' })
export class JournalChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(JournalChatGateway.name);

  /** Per-client lock — prevent overlapping streams from the same socket. */
  private readonly processingClients = new Set<string>();

  constructor(
    private readonly therapist: TherapistService,
    private readonly chat:      JournalChatService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.processingClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('journal:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JournalMessagePayload,
  ) {
    const { clerkUserId, userName, message, conversationHistory, context } = payload ?? {};
    if (!message?.trim()) return;
    if (!clerkUserId) {
      client.emit('journal:error', { message: 'Missing clerkUserId' });
      return;
    }

    if (this.processingClients.has(client.id)) {
      this.logger.warn(`[${client.id}] Dropping journal message — previous turn still processing`);
      return;
    }
    this.processingClients.add(client.id);

    const lockTimeout = setTimeout(() => {
      if (this.processingClients.has(client.id)) {
        this.logger.warn(`[${client.id}] Lock timeout — force-releasing after 35s`);
        this.processingClients.delete(client.id);
      }
    }, 35_000);

    try {
      const [userProfile, recentMemories, sessionCount, journalEntries] = await Promise.all([
        this.chat.getUserProfile(clerkUserId),
        this.chat.getRecentMemories(clerkUserId, 3),
        this.chat.getSessionCount(clerkUserId),
        this.chat.getJournalEntriesForContext(clerkUserId, context ?? { mode: 'shelf' }),
      ]);

      await this.therapist.streamResponse({
        userName:            userName || 'there',
        userProfile:         userProfile ?? { ...FALLBACK_PROFILE, userId: clerkUserId },
        recentMemories,
        conversationHistory: conversationHistory ?? [],
        currentTranscript:   message,
        currentEmotion:      null,
        visionContext:       null,
        sessionNumber:       sessionCount + 1,
        journalEntries,
        journalChatContext: {
          mode:          context?.mode ?? 'shelf',
          notebookName:  context?.notebookName,
          todayDraft:    context?.aiAccessible === false ? undefined : context?.todayDraft,
          aiAccessible:  context?.aiAccessible,
        },
        skipCrisisScoring:   true,

        onChunk: (event) => {
          if (client.connected) client.emit('journal:chunk', { text: event.text });
        },

        onDone: () => {
          if (client.connected) client.emit('journal:done', {});
        },

        onError: (err) => {
          this.logger.error('journal stream error', err);
          if (client.connected) client.emit('journal:error', { message: err.message });
        },
      });
    } catch (err) {
      this.logger.error('journal:message handler failed', err);
      if (client.connected) {
        client.emit('journal:error', { message: 'Internal error' });
      }
    } finally {
      clearTimeout(lockTimeout);
      this.processingClients.delete(client.id);
    }
  }
}
