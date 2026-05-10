import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { buildTherapistSystemPrompt, selectFrameworksFast, getFrameworkText, DEFAULT_SELECTION } from '@ai-therapist/ai-core';
import type { IUserProfile, IMemoryChunk, IEmotionSnapshot, IHomeworkItem } from '@ai-therapist/types';

export interface StreamChunkEvent {
  type: 'chunk';
  text: string;
}

export interface StreamDoneEvent {
  type:        'done';
  fullText:    string;
  /** Crisis risk score 0–10. ≥7 triggers the crisis overlay on the client. */
  crisisScore: number;
}

export type StreamEvent = StreamChunkEvent | StreamDoneEvent;

export interface TherapistStreamOptions {
  userName:            string;
  userProfile:         IUserProfile;
  recentMemories:      IMemoryChunk[];
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentTranscript:   string;
  currentEmotion:      IEmotionSnapshot | null;
  visionContext:       string | null;
  sessionNumber:       number;
  journalEntries?:     Array<{ entryDate: Date | string; content: string }>;
  pendingHomework?:    IHomeworkItem[];
  /** Switches Lyra into "warm companion in the journal" mode. */
  journalChatContext?: {
    mode:          'shelf' | 'notebook';
    notebookName?: string;
    todayDraft?:   string;
    /** False = user disabled AI access for this notebook; Lyra must not speculate about content. */
    aiAccessible?: boolean;
  };
  /** Skip the crisis-scoring LLM call after the stream completes (journal-chat). */
  skipCrisisScoring?:  boolean;
  onChunk:            (event: StreamChunkEvent)  => void;
  /** Fires immediately after the stream closes, before crisis scoring. */
  onStreamComplete?:  (fullText: string)          => void;
  onDone:             (event: StreamDoneEvent)    => void | Promise<void>;
  onError:            (err: Error)                => void;
}

/** Keywords that immediately set crisis score to 9 without an extra LLM call. */
const CRISIS_KEYWORDS = [
  'intihar', 'öldürmek istiyorum', 'ölmek istiyorum', 'kendime zarar',
  'suicide', 'kill myself', 'want to die', 'hurt myself', 'self-harm',
  'end my life', 'no reason to live',
];

@Injectable()
export class TherapistService {
  private readonly logger = new Logger(TherapistService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey:  this.config.getOrThrow<string>('OPENAI_API_KEY'),
      timeout: 45_000, // 45s — prevents hanging forever on network issues
    });
  }

  /**
   * Streams a GPT-4o mini response for the current session turn.
   *
   * After the stream closes, runs a parallel crisis scoring call
   * (or fast-paths via keyword match) and calls onDone with
   * { fullText, crisisScore }.
   *
   * Never throws — errors go to onError so the gateway can surface them.
   */
  async streamResponse(opts: TherapistStreamOptions): Promise<void> {
    const {
      userName, userProfile, recentMemories, conversationHistory,
      currentTranscript, currentEmotion, visionContext,
      sessionNumber, journalEntries, pendingHomework,
      journalChatContext, skipCrisisScoring,
      onChunk, onStreamComplete, onDone, onError,
    } = opts;

    // Dynamic framework selection — picks 1-2 relevant frameworks instead of all 5
    const frameworkSelection = selectFrameworksFast({
      userGoals:           userProfile.goals,
      currentEmotion:      currentEmotion?.dominant ?? null,
      userMessage:         currentTranscript,
      personalitySnapshot: userProfile.personalitySnapshot,
    }) ?? DEFAULT_SELECTION;

    const systemPrompt = buildTherapistSystemPrompt({
      userName,
      userProfile,
      recentMemories,
      currentEmotion,
      visionContext,
      sessionNumber,
      selectedFrameworks: getFrameworkText(frameworkSelection),
      journalEntries,
      pendingHomework,
      journalChatContext,
    });

    // Keep last 12 messages to prevent context overflow and slow responses on long sessions
    const trimmedHistory = conversationHistory.slice(-12);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: currentTranscript },
    ];

    // Per-request abort controller — kills the stream after 28s even if data is trickling
    const abortController = new AbortController();
    const streamTimeout = setTimeout(() => {
      this.logger.warn('OpenAI stream timeout after 28s — aborting');
      abortController.abort();
    }, 28_000);

    try {
      const stream = await this.openai.chat.completions.create(
        {
          model:       'gpt-4o',
          messages,
          stream:      true,
          max_tokens:  600,
          temperature: 0.75,
        },
        { signal: abortController.signal },
      );

      let fullText = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onChunk({ type: 'chunk', text: delta });
        }
      }

      // Notify gateway immediately so it can start TTS in parallel
      onStreamComplete?.(fullText);

      let crisisScore = 0;
      if (!skipCrisisScoring) {
        // Fast-path: keyword match skips the LLM scoring call for clear signals
        const lowerTranscript = currentTranscript.toLowerCase();
        const keywordHit = CRISIS_KEYWORDS.some((kw) => lowerTranscript.includes(kw));
        crisisScore = keywordHit
          ? 9
          : await this.scoreCrisisRisk(currentTranscript, fullText);
      }

      await onDone({ type: 'done', fullText, crisisScore });
    } catch (err) {
      this.logger.error('OpenAI stream error', err);
      onError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      clearTimeout(streamTimeout);
    }
  }

  // ── Crisis scoring ──────────────────────────────────────────────────────

  /**
   * Quick GPT-4o mini JSON call returning crisis risk 0–10.
   * Returns 0 on any error — deliberately fail-safe to avoid false positives.
   */
  private async scoreCrisisRisk(
    userMessage: string,
    aiResponse:  string,
  ): Promise<number> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a crisis risk classifier for a therapy app. ' +
              'Return JSON {"score": N} where N is 0-10 representing immediate crisis risk. ' +
              '0 = no risk, 7-10 = requires immediate intervention. ' +
              'Only score ≥7 for explicit suicidal ideation, self-harm intent, or acute danger.',
          },
          {
            role: 'user',
            content: `User: "${userMessage}"\nTherapist response preview: "${aiResponse.slice(0, 150)}"`,
          },
        ],
        max_tokens:      20,
        temperature:     0,
        response_format: { type: 'json_object' },
      });

      const raw    = response.choices[0]?.message?.content ?? '{"score":0}';
      const parsed = JSON.parse(raw) as { score?: number };
      return Math.min(10, Math.max(0, Math.round(Number(parsed.score ?? 0))));
    } catch {
      return 0;
    }
  }
}
