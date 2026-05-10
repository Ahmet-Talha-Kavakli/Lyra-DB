import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { JournalService } from '../journal/journal.service';
import type { IUserProfile, IMemoryChunk, IHomeworkItem } from '@ai-therapist/types';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma:   PrismaService,
    private readonly memory:   MemoryService,
    private readonly journal:  JournalService,
  ) {}

  /** Resolve a Clerk user ID to the internal DB UUID, creating the user if missing. */
  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.upsert({
      where:  { clerkId },
      create: { clerkId },
      update: {},
      select: { id: true },
    });
    return user.id;
  }

  /** Create a session record and return its ID. */
  async startSession(clerkId: string): Promise<string> {
    const userId = await this.resolveUserId(clerkId);
    const session = await this.prisma.session.create({
      data: { userId, status: 'active', sessionType: 'regular' },
      select: { id: true },
    });
    return session.id;
  }

  /** Mark session as ended and record duration. */
  async endSession(sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where:  { id: sessionId },
      select: { startedAt: true },
    });
    if (!session) return;

    const durationSeconds = Math.round(
      (Date.now() - session.startedAt.getTime()) / 1000,
    );

    await this.prisma.session.update({
      where: { id: sessionId },
      data:  { endedAt: new Date(), durationSeconds, status: 'completed' },
    });
  }

  /**
   * Fetch the user's Prisma profile (cast to IUserProfile shape).
   * Returns null if profile not found (e.g. onboarding incomplete).
   */
  async getUserProfile(clerkId: string): Promise<IUserProfile | null> {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return null;
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
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

  /** Count completed sessions for a user (for session number in prompt). */
  async getSessionCount(clerkId: string): Promise<number> {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return 0;
    return this.prisma.session.count({
      where: { userId, status: 'completed' },
    });
  }

  /**
   * Paginated session history for a user.
   * Returns completed sessions ordered newest-first, with SOAP notes included.
   */
  async getHistory(
    clerkId: string,
    page    = 1,
    perPage = 20,
  ) {
    const user = await this.prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true },
    });
    if (!user) return { sessions: [], total: 0 };

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where:   { userId: user.id, status: 'completed' },
        orderBy: { startedAt: 'desc' },
        skip:    (page - 1) * perPage,
        take:    perPage,
        select: {
          id:              true,
          startedAt:       true,
          endedAt:         true,
          durationSeconds: true,
          summary:         true,
          soapNotes:       true,
        },
      }),
      this.prisma.session.count({
        where: { userId: user.id, status: 'completed' },
      }),
    ]);

    return { sessions, total };
  }

  /** Fetch pending homework from the most recent completed session. */
  async getLastHomework(clerkId: string): Promise<IHomeworkItem[]> {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return [];
    const session = await this.prisma.session.findFirst({
      where:   { userId, status: 'completed', homework: { not: Prisma.JsonNull } },
      orderBy: { endedAt: 'desc' },
      select:  { homework: true },
    });
    if (!session?.homework) return [];
    const items = session.homework as unknown as IHomeworkItem[];
    return items.filter((h) => h.status === 'pending');
  }

  /** Fetch recent journal entries for session context (Lyra references diary naturally). */
  async getRecentJournalEntries(clerkId: string, limit = 5) {
    return this.journal.getRecentEntries(clerkId, limit).catch(() => []);
  }

  /**
   * Semantic memory search: embed the user's message, then find the most
   * relevant memories via pgvector cosine similarity. Falls back to empty
   * array if the user has no memories or embedding fails.
   */
  async getSemanticMemories(clerkId: string, query: string, limit = 5): Promise<IMemoryChunk[]> {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return [];
    return this.memory.semanticSearch({ userId, query, limit }).catch(() => []);
  }

  /**
   * Fetch the N most recent memory chunks for context injection.
   * Used at session start (no user message to search against) and as
   * fallback padding alongside semantic results.
   */
  async getRecentMemories(clerkId: string, limit = 5): Promise<IMemoryChunk[]> {
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
}
