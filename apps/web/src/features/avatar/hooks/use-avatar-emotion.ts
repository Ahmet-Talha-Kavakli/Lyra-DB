'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSessionStore } from '../../session/session.store';
import { BLEND_SHAPES, type TBlendShapeKey } from '../constants/blend-shapes';
import { EMOTION_PRESETS } from '../constants/emotion-presets';
import type { MorphControls } from './use-morph-targets';

/** How fast emotion shapes lerp to their new target (units/second).
 *  2.0 → ~500 ms transition at full range — feels therapeutic, not jumpy. */
const LERP_SPEED = 2.0;

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
 * Smoothly transitions blend shapes to match the current emotion from the
 * session store. All values lerp at LERP_SPEED — even returning to neutral
 * is animated, not instant.
 *
 * Reads emotion via `useSessionStore.getState()` — transient read, no re-render.
 */
export function useAvatarEmotion(morphs: MorphControls) {
  const { setMorph } = morphs;

  // Track current interpolated value for each key so we can lerp frame-to-frame
  const currentRef = useRef<Partial<Record<TBlendShapeKey, number>>>({});

  useFrame((_state, delta) => {
    const emotion = useSessionStore.getState().currentEmotion;
    const preset  = EMOTION_PRESETS[emotion] ?? {};
    const t       = Math.min(1, LERP_SPEED * delta);

    for (const key of ALL_EMOTION_KEYS) {
      const target  = (preset[key] ?? 0) as number;
      const current = currentRef.current[key] ?? 0;

      // Skip computation when already at target (saves CPU on neutral state)
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
