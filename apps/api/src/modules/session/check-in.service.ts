import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../shared/prisma/prisma.service';

/**
 * Generates a contextual Lyra check-in message for the dashboard.
 *
 * Based on: last session themes, time since last session, recent journal entries,
 * pending homework. Cached per-user for 6 hours.
 */
@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name);
  private readonly openai: OpenAI;
  private readonly cache = new Map<string, { message: string; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async getCheckIn(clerkId: string, userName: string): Promise<string | null> {
    // Cache check
    const cached = this.cache.get(clerkId);
    if (cached && cached.expiresAt > Date.now()) return cached.message;

    const user = await this.prisma.user.findUnique({
      where: { clerkId }, select: { id: true },
    });
    if (!user) return null;

    // Fetch context in parallel
    const [lastSession, recentJournal, recentMemories] = await Promise.all([
      this.prisma.session.findFirst({
        where:   { userId: user.id, status: 'completed' },
        orderBy: { endedAt: 'desc' },
        select:  { endedAt: true, soapNotes: true, homework: true },
      }),
      this.prisma.journalEntry.findMany({
        where:   { userId: user.id, content: { not: '' } },
        orderBy: { entryDate: 'desc' },
        take:    3,
        select:  { content: true },
      }),
      this.prisma.sessionMemory.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take:    3,
        select:  { content: true },
      }),
    ]);

    // No previous session → no check-in
    if (!lastSession?.endedAt) return null;

    const daysSince = Math.round(
      (Date.now() - lastSession.endedAt.getTime()) / 86400000,
    );

    // Same day → no check-in (just had a session)
    if (daysSince < 1) return null;

    const timingNote =
      daysSince <= 2 ? 'Last session was yesterday/today.' :
      daysSince <= 7 ? `Last session was ${daysSince} days ago.` :
      `It's been ${daysSince} days since last session — gentle re-engagement.`;

    const soap = lastSession.soapNotes as { soap?: string } | null;
    const soapSummary = soap?.soap ? soap.soap.slice(0, 300) : 'No session notes.';
    const journalSummary = recentJournal.map((j) => j.content.slice(0, 100)).join('; ') || 'No journal entries.';
    const memorySummary = recentMemories.map((m) => m.content).join('; ') || 'No memories.';

    const hw = lastSession.homework as Array<{ description: string; status: string }> | null;
    const pendingHw = hw?.filter((h) => h.status === 'pending').map((h) => h.description).join(', ') || 'None';

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are Lyra, a warm therapy companion. Generate a brief between-session check-in ' +
              'message (1-2 sentences max) for the user. Reference something specific from their ' +
              'recent context. Be caring and natural. Do NOT use emojis. Respond in the same language ' +
              'as the journal/session content (Turkish if Turkish, English if English).',
          },
          {
            role: 'user',
            content: `Name: ${userName}\n${timingNote}\nSession notes: ${soapSummary}\nRecent journal: ${journalSummary}\nMemories: ${memorySummary}\nPending homework: ${pendingHw}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      const message = response.choices[0]?.message?.content?.trim() ?? null;
      if (message) {
        this.cache.set(clerkId, { message, expiresAt: Date.now() + 6 * 3600 * 1000 });
      }
      return message;
    } catch (err) {
      this.logger.warn('Check-in generation failed', err);
      return null;
    }
  }
}
