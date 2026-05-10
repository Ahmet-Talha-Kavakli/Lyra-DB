import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';

interface ConversationMessage {
  role:    string;
  content: string;
}

/**
 * Shared post-session processing logic.
 *
 * Used by both the Inngest async job (preferred) and the inline fallback
 * (when Inngest is unavailable). Keeping the logic in one place prevents
 * drift between the two paths.
 *
 * Steps:
 *   1. SOAP note generation (clinical documentation)
 *   2. Key memory extraction + embedding (long-term memory)
 *   3. Risk level update (safety)
 */
@Injectable()
export class PostSessionService {
  private readonly logger = new Logger(PostSessionService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly memory: MemoryService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async process(
    sessionId: string,
    userId: string,
    conversationHistory: ConversationMessage[],
  ): Promise<void> {
    if (!conversationHistory.length) return;

    await this.generateSoapNote(sessionId, conversationHistory);
    await this.extractMemories(sessionId, userId, conversationHistory);
    await this.extractHomework(sessionId, conversationHistory);
    await this.autoLogMood(sessionId, userId, conversationHistory);
    await this.updatePersonalitySnapshot(userId, conversationHistory);
    await this.updateRiskLevel(userId);

    this.logger.log(`Post-session done for ${sessionId}`);
  }

  // ── Step 1: SOAP note ──────────────────────────────────────────────────

  private async generateSoapNote(
    sessionId: string,
    history: ConversationMessage[],
  ): Promise<void> {
    const transcript = history
      .map((m) => `${m.role === 'user' ? 'Client' : 'Therapist'}: ${m.content}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical documentation assistant. Generate a concise SOAP note ' +
            '(Subjective, Objective, Assessment, Plan) from the therapy session transcript. ' +
            'Be clinical but compassionate. Max 400 words.',
        },
        { role: 'user', content: transcript },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const soap = response.choices[0]?.message?.content;
    if (soap) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data:  { soapNotes: { soap } },
      });
    }
  }

  // ── Step 2: Extract + embed memories ───────────────────────────────────

  private async extractMemories(
    sessionId: string,
    userId: string,
    history: ConversationMessage[],
  ): Promise<void> {
    const transcript = history.map((m) => `${m.role}: ${m.content}`).join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Extract 2-4 key therapeutic insights from this session. ' +
            'Each insight should be one sentence, clinically relevant, and capture ' +
            'beliefs, patterns, emotional breakthroughs, or progress. ' +
            'Return as a JSON object: {"insights": ["...", "..."]}',
        },
        { role: 'user', content: transcript },
      ],
      max_tokens: 300,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    let insights: string[] = [];
    try {
      const parsed = JSON.parse(
        response.choices[0]?.message?.content ?? '{}',
      ) as { insights?: string[]; memories?: string[] };
      insights = parsed.insights ?? parsed.memories ?? [];
    } catch {
      return;
    }

    for (const content of insights.slice(0, 4)) {
      await this.memory.saveMemory({
        userId,
        sessionId,
        content,
        memoryType: 'pattern',
      });
    }
  }

  // ── Step 3: Extract homework ─────────────────────────────────────────────

  private async extractHomework(
    sessionId: string,
    history: ConversationMessage[],
  ): Promise<void> {
    const transcript = history
      .map((m) => `${m.role === 'user' ? 'Client' : 'Therapist'}: ${m.content}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Extract any homework, exercises, or between-session practices that the therapist suggested. ' +
            'Return JSON: {"homework": [{"description": "...", "category": "reflection" | "behavioral" | "mindfulness" | "journaling"}]}. ' +
            'If nothing was suggested, return {"homework": []}.',
        },
        { role: 'user', content: transcript },
      ],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    try {
      const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}') as {
        homework?: Array<{ description: string; category: string }>;
      };
      const items = (parsed.homework ?? []).slice(0, 3);
      if (!items.length) return;

      const homeworkData = items.map((item, i) => ({
        id:          `${sessionId}-hw-${i}`,
        description: item.description,
        category:    item.category || 'reflection',
        status:      'pending' as const,
        assignedAt:  new Date().toISOString(),
      }));

      await this.prisma.session.update({
        where: { id: sessionId },
        data:  { homework: homeworkData },
      });
    } catch {
      this.logger.warn('Failed to extract homework');
    }
  }

  // ── Step 4: Auto-log mood ──────────────────────────────────────────────

  private async autoLogMood(
    sessionId: string,
    userId: string,
    history: ConversationMessage[],
  ): Promise<void> {
    const transcript = history
      .slice(-6) // last 6 messages = session end tone
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Rate the client\'s emotional state at the END of this therapy session on a 1-10 scale ' +
            '(1=very distressed, 10=very positive). Consider expressed feelings, emotional shifts, ' +
            'and closing tone. Return JSON: {"score": N}',
        },
        { role: 'user', content: transcript },
      ],
      max_tokens: 20,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    try {
      const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}') as { score?: number };
      const score = Math.min(10, Math.max(1, Math.round(Number(parsed.score ?? 5))));
      await this.prisma.moodLog.create({
        data: { userId, score },
      });
    } catch {
      this.logger.warn('Failed to auto-log mood');
    }
  }

  // ── Step 5: Update personality snapshot ──────────────────────────────────

  private async updatePersonalitySnapshot(
    userId: string,
    history: ConversationMessage[],
  ): Promise<void> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return;

    const currentSnapshot = (profile.personalitySnapshot ?? {}) as Record<string, unknown>;
    const transcript = history
      .map((m) => `${m.role === 'user' ? 'Client' : 'Therapist'}: ${m.content}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical psychologist analyzing a therapy session transcript. ' +
            'Update the client personality profile based on this session. ' +
            'MERGE with the existing profile — don\'t overwrite, only add new observations or update if clearly contradicted.\n\n' +
            'Return JSON:\n' +
            '{\n' +
            '  "communicationStyle": "direct" | "reflective" | "avoidant" | "analytical" | null,\n' +
            '  "recurringThemes": ["theme1", "theme2"],\n' +
            '  "attachmentPattern": "secure" | "anxious" | "avoidant" | "disorganized" | null,\n' +
            '  "copingMechanisms": ["mechanism1"],\n' +
            '  "progressTrajectory": "improving" | "plateau" | "fluctuating" | "early-stage" | null,\n' +
            '  "effectiveFrameworks": ["cbt", "dbt", "act", "psychodynamic", "somatic"]\n' +
            '}\n\n' +
            'Only include frameworks in effectiveFrameworks if the session showed clear positive response to them.',
        },
        {
          role: 'user',
          content: `EXISTING PROFILE:\n${JSON.stringify(currentSnapshot, null, 2)}\n\nSESSION TRANSCRIPT:\n${transcript}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    try {
      const updates = JSON.parse(response.choices[0]?.message?.content ?? '{}');
      const existingThemes = (currentSnapshot as { recurringThemes?: string[] }).recurringThemes ?? [];
      const existingCoping = (currentSnapshot as { copingMechanisms?: string[] }).copingMechanisms ?? [];
      const existingFrameworks = (currentSnapshot as { effectiveFrameworks?: string[] }).effectiveFrameworks ?? [];
      const sessionCount = ((currentSnapshot as { sessionCount?: number }).sessionCount ?? 0) + 1;

      const merged = {
        communicationStyle: updates.communicationStyle ?? currentSnapshot.communicationStyle ?? null,
        recurringThemes:    [...new Set([...existingThemes, ...(updates.recurringThemes ?? [])])].slice(0, 10),
        attachmentPattern:  updates.attachmentPattern ?? currentSnapshot.attachmentPattern ?? null,
        copingMechanisms:   [...new Set([...existingCoping, ...(updates.copingMechanisms ?? [])])].slice(0, 8),
        progressTrajectory: updates.progressTrajectory ?? currentSnapshot.progressTrajectory ?? null,
        effectiveFrameworks: [...new Set([...existingFrameworks, ...(updates.effectiveFrameworks ?? [])])].slice(0, 5),
        sessionCount,
        lastUpdated: new Date().toISOString(),
      };

      await this.prisma.userProfile.update({
        where: { userId },
        data:  { personalitySnapshot: merged },
      });
    } catch {
      this.logger.warn('Failed to parse personality snapshot update');
    }
  }

  // ── Step 4: Update risk level ──────────────────────────────────────────

  private async updateRiskLevel(userId: string): Promise<void> {
    const recentCrises = await this.prisma.crisisLog.count({
      where: {
        userId,
        detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const riskLevel =
      recentCrises >= 3 ? 'high' :
      recentCrises >= 1 ? 'medium' :
      'low';

    await this.prisma.userProfile.updateMany({
      where: { userId },
      data:  { riskLevel },
    });
  }
}
