import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { JournalService } from '../journal/journal.service';
import type { IUserProfile, IMemoryChunk } from '@ai-therapist/types';

export type JournalChatMode = 'shelf' | 'notebook';

export interface JournalChatContextPayload {
  mode:          JournalChatMode;
  notebookId?:   string;
  notebookName?: string;
  todayDraft?:   string;
  /**
   * Notebook modunda kullanıcının AI erişimi verip vermediği. False ise
   * fetch yapılmaz ve prompt'ta Lyra'ya "okuyamazsın" sinyali düşer.
   */
  aiAccessible?: boolean;
}

export interface ConversationTurn {
  role:    'user' | 'assistant';
  content: string;
}

@Injectable()
export class JournalChatService {
  private readonly logger = new Logger(JournalChatService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma:  PrismaService,
    private readonly config:  ConfigService,
    private readonly memory:  MemoryService,
    private readonly journal: JournalService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  /** Resolve Clerk → internal UUID; lazy-creates the user row. */
  async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.upsert({
      where:  { clerkId },
      create: { clerkId },
      update: {},
      select: { id: true },
    });
    return user.id;
  }

  async getUserProfile(clerkId: string): Promise<IUserProfile | null> {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return null;
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    return {
      id:                  profile.id,
      userId:              profile.userId,
      goals:               profile.goals,
      mentalHealthHistory: profile.mentalHealthHistory as Record<string, unknown>,
      therapyPreferences:  profile.therapyPreferences  as Record<string, unknown>,
      personalitySnapshot: profile.personalitySnapshot as Record<string, unknown>,
      riskLevel:           profile.riskLevel as IUserProfile['riskLevel'],
      disclaimerAcceptedAt: profile.disclaimerAcceptedAt,
      updatedAt:           profile.updatedAt,
    };
  }

  async getRecentMemories(clerkId: string, limit = 3): Promise<IMemoryChunk[]> {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return [];
    const rows = await this.prisma.sessionMemory.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      select:  { id: true, userId: true, sessionId: true, content: true, memoryType: true, createdAt: true },
    });
    return rows.map((r) => ({
      id:         r.id,
      userId:     r.userId,
      sessionId:  r.sessionId,
      content:    r.content,
      memoryType: r.memoryType as IMemoryChunk['memoryType'],
      createdAt:  r.createdAt,
    }));
  }

  async getSessionCount(clerkId: string): Promise<number> {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return 0;
    return this.prisma.session.count({ where: { userId, status: 'completed' } });
  }

  /**
   * Fetch the journal entries that should be injected as context.
   * - shelf mode: top 5 entries from all aiAccessible notebooks
   * - notebook mode: last 3 entries from the open notebook (if aiAccessible)
   */
  async getJournalEntriesForContext(
    clerkId: string,
    ctx:     JournalChatContextPayload,
  ): Promise<Array<{ entryDate: Date | string; content: string }>> {
    // Hard guard: AI erişimi açıkça kapatılmışsa hiç fetch yapma. Bu, mobile'ın
    // yanlışlıkla notebookId yollasa bile içeriğin sızmasını önler.
    if (ctx.aiAccessible === false) return [];

    if (ctx.mode === 'notebook' && ctx.notebookId) {
      return this.journal.getRecentEntriesForNotebook(clerkId, ctx.notebookId, 3);
    }
    const entries = await this.journal.getRecentEntries(clerkId, 5);
    return entries.map((e) => ({ entryDate: e.entryDate, content: e.content }));
  }

  /**
   * Summarize a closed journal-chat conversation into 1-2 sentences and
   * persist it as a SessionMemory (sessionId: null). This is what gives
   * Lyra the "I remember our chat in your journal last week" continuity.
   *
   * No-op if conversation has fewer than 2 turns (not worth remembering).
   */
  async summarizeAndStore(
    clerkId:     string,
    history:     ConversationTurn[],
    ctx:         JournalChatContextPayload,
  ): Promise<{ stored: boolean; summary?: string }> {
    if (history.length < 2) return { stored: false };

    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return { stored: false };

    // Compact transcript for the summarizer
    const transcript = history
      .slice(-12) // safety cap
      .map((t) => `${t.role === 'user' ? 'User' : 'Lyra'}: ${t.content}`)
      .join('\n');

    const where = ctx.mode === 'notebook' && ctx.notebookName
      ? `in their "${ctx.notebookName}" notebook`
      : 'while browsing their bookshelf';

    let summary: string;
    try {
      const completion = await this.openai.chat.completions.create({
        model:       'gpt-4o-mini',
        max_tokens:  120,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'You are summarizing a brief written chat between a user and Lyra (their AI companion) ' +
              'that happened inside the user\'s journal app. Produce ONE OR TWO short sentences in TURKISH ' +
              'capturing what the user shared or worked through. Keep it specific (mention the topic), ' +
              'not generic. Write from a third-person observer\'s view (e.g. "Kullanıcı...", "X hakkında konuştu"). ' +
              'No quotes, no headers, just plain prose.',
          },
          {
            role: 'user',
            content: `Conversation (${where}):\n\n${transcript}`,
          },
        ],
      });
      summary = completion.choices[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      this.logger.warn(`summarize OpenAI failed: ${(err as Error).message}`);
      return { stored: false };
    }

    if (!summary) return { stored: false };

    const dateStr = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const stamped = `[Journal sohbeti, ${dateStr}] ${summary}`;

    try {
      await this.memory.saveMemory({
        userId,
        sessionId:  null,
        content:    stamped,
        memoryType: 'event',
      });
    } catch (err) {
      this.logger.warn(`saveMemory failed: ${(err as Error).message}`);
      return { stored: false, summary };
    }

    return { stored: true, summary: stamped };
  }
}
