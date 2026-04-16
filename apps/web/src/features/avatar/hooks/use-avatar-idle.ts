'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSessionStore } from '../../session/session.store';
import type { MorphControls } from './use-morph-targets';

// ── Head sway ──────────────────────────────────────────────────────────────────
const SWAY_Y_AMP  = 0.013;  // lateral sway amplitude (radians)
const SWAY_X_AMP  = 0.007;  // fore/aft drift amplitude
const SWAY_Y_FREQ = 0.28;   // Hz
const SWAY_X_FREQ = 0.18;   // Hz

// ── Blink ──────────────────────────────────────────────────────────────────────
const BLINK_DURATION_S   = 0.12;
const BLINK_MIN_INTERVAL = 2.5;
const BLINK_MAX_INTERVAL = 5.5;

// ── Breathing (subtle Y position oscillation) ─────────────────────────────────
const BREATH_AMP  = 0.006;  // units — imperceptible except as aliveness
const BREATH_FREQ = 0.22;   // Hz ≈ 13 breaths per minute (calm, therapeutic)

// ── Listening tilt (when user is speaking, not Lyra) ─────────────────────────
const LISTEN_TILT_Z   = 0.025; // radians — slight head tilt toward user
const LISTEN_LERP     = 3.0;   // speed

function randomBlinkInterval(): number {
  return BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
}

/**
 * Brings Lyra to life with continuous micro-animations:
 *   - Randomised eye blinks (3–6 s interval)
 *   - Subtle sinusoidal head sway (attentive, not robotic)
 *   - Breathing: slow Y position oscillation (~13 breaths/min)
 *   - Listening mode: gentle head tilt while user is speaking
 *
 * Sets the BASE rotation/position values.
 * useAvatarSpeaking runs after and adds its offsets on top.
 */
export function useAvatarIdle(
  groupRef: React.RefObject<THREE.Group | null>,
  morphs: MorphControls,
) {
  const { setMorph } = morphs;

  const elapsedRef       = useRef(0);
  const blinkTimeRef     = useRef(0);
  const nextBlinkAtRef   = useRef(randomBlinkInterval());
  const isBlinkingRef    = useRef(false);
  const listenTiltRef    = useRef(0);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    elapsedRef.current += delta;
    const t = elapsedRef.current;

    // ── Head sway (base rotation — speaking hook adds offsets after) ──────
    groupRef.current.rotation.y = Math.sin(t * SWAY_Y_FREQ * Math.PI * 2) * SWAY_Y_AMP;
    groupRef.current.rotation.x = Math.sin(t * SWAY_X_FREQ * Math.PI * 2) * SWAY_X_AMP;

    // ── Breathing (Y position oscillation) ───────────────────────────────
    groupRef.current.position.y = Math.sin(t * BREATH_FREQ * Math.PI * 2) * BREATH_AMP;

    // ── Listening tilt (Z axis, when Lyra is not speaking) ────────────────
    const isSpeaking = useSessionStore.getState().isAvatarSpeaking;
    const phase      = useSessionStore.getState().phase;
    const targetTilt = (!isSpeaking && phase === 'active') ? LISTEN_TILT_Z : 0;
    listenTiltRef.current += (targetTilt - listenTiltRef.current) * Math.min(1, LISTEN_LERP * delta);
    groupRef.current.rotation.z = listenTiltRef.current;

    // ── Eye blink state machine ───────────────────────────────────────────
    if (isBlinkingRef.current) {
      blinkTimeRef.current += delta;
      const progress = blinkTimeRef.current / BLINK_DURATION_S;

      // Triangle wave: close (0→0.5) then open (0.5→1)
      const blinkValue = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      const clamped    = Math.max(0, Math.min(1, blinkValue));
      setMorph('eyeBlinkL', clamped);
      setMorph('eyeBlinkR', clamped);

      if (blinkTimeRef.current >= BLINK_DURATION_S) {
        setMorph('eyeBlinkL', 0);
        setMorph('eyeBlinkR', 0);
        isBlinkingRef.current = false;
        blinkTimeRef.current  = 0;
        nextBlinkAtRef.current = t + randomBlinkInterval();
      }
    } else if (t >= nextBlinkAtRef.current) {
      isBlinkingRef.current = true;
      blinkTimeRef.current  = 0;
    }
  });
}
