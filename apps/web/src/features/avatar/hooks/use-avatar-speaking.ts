'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSessionStore } from '../../session/session.store';
import type { MorphControls } from './use-morph-targets';

/**
 * Adds natural body-language cues while Lyra is speaking:
 *   - Subtle head nods (rotation.x oscillation at ~0.4 Hz)
 *   - Slight forward presence (position.z lean)
 *
 * Mouth morphs (mouthOpen, mouthFunnel, mouthStretch) are now fully
 * driven by useAvatarLipSync from real audio FFT analysis.
 *
 * This hook runs AFTER useAvatarIdle, so it adds to idle's rotation
 * values rather than replacing them.
 */

const NOD_FREQ     = 0.40;  // Hz — slow, natural conversational nod
const NOD_AMP      = 0.012; // radians — subtle but perceptible
const LEAN_TARGET  = 0.04;  // units — slight forward presence when speaking
const LERP_SPEED   = 5;

export function useAvatarSpeaking(
  groupRef: React.RefObject<THREE.Group | null>,
  _morphs: MorphControls,
) {
  const speakTimeRef = useRef(0);
  const nodRef       = useRef(0);
  const leanRef      = useRef(0);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    const isSpeaking = useSessionStore.getState().isAvatarSpeaking;
    const t          = Math.min(1, LERP_SPEED * delta);

    if (isSpeaking) {
      speakTimeRef.current += delta;

      // Slow sinusoidal head nod — like nodding while explaining
      const targetNod = Math.sin(speakTimeRef.current * NOD_FREQ * Math.PI * 2) * NOD_AMP;
      nodRef.current  += (targetNod - nodRef.current)  * Math.min(1, 12 * delta);

      // Slight forward lean (lean in while engaged)
      leanRef.current += (LEAN_TARGET - leanRef.current) * t;
    } else {
      speakTimeRef.current = 0;
      nodRef.current  += (0 - nodRef.current)  * t;
      leanRef.current += (0 - leanRef.current) * t;
    }

    // Additive on top of idle rotation (idle sets base, we add offset)
    groupRef.current.rotation.x += nodRef.current;
    groupRef.current.position.z  = leanRef.current;
  });
}
