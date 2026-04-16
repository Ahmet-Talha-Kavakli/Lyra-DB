'use client';

import { useEffect, useRef } from 'react';
import { useSessionStore } from '../session.store';
import type { ICrisisSignal, TEmotionLabel } from '@ai-therapist/types';

/**
 * Crisis score thresholds — graduated response:
 *   5–6  → severity 'moderate'  (soft bottom banner)
 *   7–8  → severity 'high'      (side panel)
 *   9–10 → severity 'imminent'  (full overlay)
 */
const SCORE_THRESHOLD = 5;

/** How many consecutive high-distress emotion frames triggers crisis. */
const DISTRESS_FRAME_THRESHOLD = 15; // ~30s at 2s per batch

/** Emotions considered high distress for sustained-detection purposes. */
const HIGH_DISTRESS_EMOTIONS: TEmotionLabel[] = ['fearful', 'sad', 'angry'];

/** Keywords in the user's transcript that hard-trigger crisis (client side backup). */
const CRISIS_KEYWORDS = [
  'intihar', 'ölmek istiyorum', 'kendime zarar',
  'suicide', 'kill myself', 'want to die', 'hurt myself', 'self-harm',
];

interface UseCrisisDetectorOptions {
  /** AI crisis score returned with each ai:done event. */
  crisisScore: number;
  onCrisisDetected?: (signal: ICrisisSignal) => void;
}

/**
 * Monitors three crisis signals and calls setActiveCrisis in the session store
 * when any threshold is exceeded:
 *
 *   1. AI scoring  — crisisScore prop ≥ 7 (from TherapistService)
 *   2. Sustained distress — 15+ consecutive high-distress emotion frames (~30s)
 *   3. Transcript keywords — hard-coded clinical crisis phrases
 *
 * When crisis is detected, also POSTs to /api/crisis to log the event.
 */
export function useCrisisDetector({
  crisisScore,
  onCrisisDetected,
}: UseCrisisDetectorOptions) {
  const { setActiveCrisis, activeCrisis, currentEmotion, transcript, sessionId } =
    useSessionStore();

  const distressFramesRef = useRef(0);
  const lastCrisisSource  = useRef<string | null>(null);

  // ── Signal 1: AI crisis score ─────────────────────────────────────────────
  useEffect(() => {
    if (activeCrisis || crisisScore < SCORE_THRESHOLD) return;

    const signal: ICrisisSignal = {
      type:       'verbal',
      severity:   crisisScore >= 9 ? 'imminent' : crisisScore >= 7 ? 'high' : 'moderate',
      confidence: crisisScore / 10,
      detectedAt: Date.now(),
      description: 'AI detected elevated distress in session transcript.',
    };

    lastCrisisSource.current = 'ai_score';
    setActiveCrisis(signal);
    void logCrisis(signal, sessionId);
    onCrisisDetected?.(signal);
  }, [crisisScore]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Signal 2: Sustained high-distress emotion ─────────────────────────────
  useEffect(() => {
    if (activeCrisis) return;

    if (HIGH_DISTRESS_EMOTIONS.includes(currentEmotion)) {
      distressFramesRef.current += 1;
    } else {
      distressFramesRef.current = Math.max(0, distressFramesRef.current - 2);
    }

    if (distressFramesRef.current >= DISTRESS_FRAME_THRESHOLD) {
      const signal: ICrisisSignal = {
        type:        'self_harm',
        severity:    'high',
        confidence:  0.75,
        detectedAt:  Date.now(),
        description: 'Sustained high-distress facial expression detected (~30s).',
      };

      distressFramesRef.current = 0;
      lastCrisisSource.current  = 'face_emotion';
      setActiveCrisis(signal);
      void logCrisis(signal, sessionId);
      onCrisisDetected?.(signal);
    }
  }, [currentEmotion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Signal 3: Transcript keyword detection ────────────────────────────────
  useEffect(() => {
    if (activeCrisis || !transcript) return;

    const lower = transcript.toLowerCase();
    const hit   = CRISIS_KEYWORDS.find((kw) => lower.includes(kw));
    if (!hit) return;

    const signal: ICrisisSignal = {
      type:        'verbal',
      severity:    'imminent',
      confidence:  1,
      detectedAt:  Date.now(),
      description: `Crisis keyword detected in transcript: "${hit}"`,
    };

    lastCrisisSource.current = 'keyword';
    setActiveCrisis(signal);
    void logCrisis(signal, sessionId);
    onCrisisDetected?.(signal);
  }, [transcript]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset distress counter when crisis is dismissed
  useEffect(() => {
    if (!activeCrisis) {
      distressFramesRef.current = 0;
    }
  }, [activeCrisis]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function logCrisis(signal: ICrisisSignal, sessionId: string | null) {
  try {
    await fetch('/api/crisis', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ signal, sessionId }),
    });
  } catch {
    // Non-blocking — logging failure must never break session UX
  }
}
