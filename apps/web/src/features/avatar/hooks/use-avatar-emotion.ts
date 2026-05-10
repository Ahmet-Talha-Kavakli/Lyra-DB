'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSessionStore } from '../../session/session.store';
import { BLEND_SHAPES, type TBlendShapeKey } from '../constants/blend-shapes';
import { THERAPIST_RESPONSES, SPEAKING_EXPRESSION } from '../constants/emotion-presets';
import type { MorphControls } from './use-morph-targets';

/** How fast expression shapes lerp to their new target (units/second).
 *  2.5 → ~400 ms transition — responsive but not jumpy. */
const LERP_SPEED = 2.5;

/** Morph keys driven by other hooks — excluded from emotion control to avoid conflicts. */
const EXCLUDED_KEYS = new Set<TBlendShapeKey>([
  'eyeBlinkL',
  'eyeBlinkR',
  'mouthOpen',    // lip sync hook owns these
  'mouthFunnel',
  'mouthStretch',
]);

const ALL_EMOTION_KEYS = (Object.keys(BLEND_SHAPES) as TBlendShapeKey[]).filter(
  (k) => !EXCLUDED_KEYS.has(k),
);

/**
 * Drives Lyra's facial expression based on the THERAPIST_RESPONSES preset map.
 *
 * Key difference from naive emotion mirroring:
 *   - While LISTENING → uses THERAPIST_RESPONSES[userEmotion] — Lyra shows
 *     empathy, compassion, reassurance (not a copy of the user's emotion).
 *   - While SPEAKING → uses SPEAKING_EXPRESSION — warm, engaged, confident.
 *
 * All values lerp at LERP_SPEED — transitions are always smooth.
 * Reads state via getState() — no re-renders triggered.
 */
export function useAvatarEmotion(morphs: MorphControls) {
  const { setMorph } = morphs;

  const currentRef = useRef<Partial<Record<TBlendShapeKey, number>>>({});

  useFrame((_state, delta) => {
    const isSpeaking = useSessionStore.getState().isAvatarSpeaking;
    const emotion    = useSessionStore.getState().currentEmotion;

    // While speaking Lyra holds her own warm expression, not the user's emotion
    const preset = isSpeaking
      ? SPEAKING_EXPRESSION
      : (THERAPIST_RESPONSES[emotion] ?? THERAPIST_RESPONSES.neutral);

    const t = Math.min(1, LERP_SPEED * delta);

    for (const key of ALL_EMOTION_KEYS) {
      const target  = (preset[key] ?? 0) as number;
      const current = currentRef.current[key] ?? 0;

      if (Math.abs(target - current) < 0.001) {
        if (current !== 0) {
          currentRef.current[key] = 0;
          setMorph(key, 0);
        }
        continue;
      }

      const next = current + (target - current) * t;
      currentRef.current[key] = next;
      setMorph(key, next);
    }
  });
}
