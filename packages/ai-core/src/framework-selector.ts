/**
 * Dynamic therapy framework selection.
 *
 * Instead of injecting all 5 frameworks (~2000 tokens) into every prompt,
 * selects 1-2 relevant ones based on user context. Saves ~1200 tokens/call.
 *
 * Fast-path: rule-based keyword matching (no LLM call, <1ms).
 * Fallback:  caller can use an LLM classifier when fast-path returns null.
 */

import type { TFrameworkName, IPersonalitySnapshot } from '@ai-therapist/types';
import {
  CBT_FRAMEWORK,
  DBT_FRAMEWORK,
  ACT_FRAMEWORK,
  SOMATIC_FRAMEWORK,
  PSYCHODYNAMIC_FRAMEWORK,
} from './therapy-frameworks';

// ── Public types ───────────────────────────────────────────────────────────

export interface FrameworkSelectionInput {
  userGoals:           string[];
  currentEmotion:      string | null;
  userMessage:         string;
  personalitySnapshot: Partial<IPersonalitySnapshot> | Record<string, unknown>;
}

export interface FrameworkSelection {
  primary:   TFrameworkName;
  secondary: TFrameworkName | null;
}

// ── Framework text lookup ──────────────────────────────────────────────────

export const FRAMEWORK_MAP: Record<TFrameworkName, string> = {
  cbt:           CBT_FRAMEWORK,
  dbt:           DBT_FRAMEWORK,
  act:           ACT_FRAMEWORK,
  psychodynamic: PSYCHODYNAMIC_FRAMEWORK,
  somatic:       SOMATIC_FRAMEWORK,
};

// ── Keyword → framework mapping ────────────────────────────────────────────

const GOAL_KEYWORDS: [string[], TFrameworkName][] = [
  [['anxiety', 'overthinking', 'worry', 'rumination', 'kaygı', 'endişe', 'düşünce'],        'cbt'],
  [['self-harm', 'anger', 'emotion regulation', 'öfke', 'duygusal düzenleme', 'kendine zarar'], 'dbt'],
  [['meaning', 'grief', 'purpose', 'values', 'transition', 'anlam', 'yas', 'değerler'],      'act'],
  [['childhood', 'family', 'attachment', 'relationships', 'parents', 'çocukluk', 'aile', 'ilişki'], 'psychodynamic'],
  [['trauma', 'body', 'ptsd', 'panic', 'somatic', 'travma', 'beden', 'panik'],               'somatic'],
];

const EMOTION_MAP: Record<string, TFrameworkName> = {
  angry:     'dbt',
  fearful:   'somatic',
  sad:       'psychodynamic',
  disgusted: 'dbt',
  contempt:  'psychodynamic',
};

// ── Fast-path selector ─────────────────────────────────────────────────────

/**
 * Rule-based framework selection. Returns null if no confident match —
 * caller should then use an LLM classifier or fall back to a default.
 */
export function selectFrameworksFast(
  input: FrameworkSelectionInput,
): FrameworkSelection | null {
  const lower = [
    ...input.userGoals.map((g) => g.toLowerCase()),
    input.userMessage.toLowerCase(),
  ].join(' ');

  // Check goals + message against keyword sets
  let primary: TFrameworkName | null = null;
  let bestScore = 0;

  for (const [keywords, framework] of GOAL_KEYWORDS) {
    const hits = keywords.filter((kw) => lower.includes(kw)).length;
    if (hits > bestScore) {
      bestScore = hits;
      primary = framework;
    }
  }

  // Emotion-based selection if no goal match
  if (!primary && input.currentEmotion) {
    primary = EMOTION_MAP[input.currentEmotion] ?? null;
  }

  if (!primary) return null;

  // Pick secondary from personality snapshot's effective frameworks
  const snapshot = input.personalitySnapshot as Partial<IPersonalitySnapshot>;
  const effective = snapshot.effectiveFrameworks ?? [];
  const secondary = effective.find((f) => f !== primary) ?? null;

  return { primary, secondary };
}

// ── Text builder ───────────────────────────────────────────────────────────

/** Returns the concatenated framework text for the selected frameworks. */
export function getFrameworkText(selection: FrameworkSelection): string {
  const texts = [FRAMEWORK_MAP[selection.primary]];
  if (selection.secondary) {
    texts.push(FRAMEWORK_MAP[selection.secondary]);
  }
  return texts.join('\n\n---\n\n');
}

/** Default selection when nothing else matches. */
export const DEFAULT_SELECTION: FrameworkSelection = {
  primary:   'cbt',
  secondary: 'act',
};
