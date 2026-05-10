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
const BREATH_AMP_BASE    = 0.006;  // calm resting amplitude
const BREATH_AMP_ENGAGED = 0.010;  // slightly deeper when user is emotional
const BREATH_FREQ        = 0.22;   // Hz ≈ 13 breaths per minute (calm, therapeutic)

// ── Listening tilt (when user is speaking, not Lyra) ─────────────────────────
const LISTEN_TILT_Z   = 0.025; // radians — slight head tilt toward user
const LISTEN_LERP     = 3.0;

// ── Micro-expressions ─────────────────────────────────────────────────────────
// Occasional subtle expressions (brow flicker, smile flash) to feel alive.
// Each micro-expression: { morph, peak, duration, minInterval, maxInterval }
interface MicroExpr {
  morph:       'browRaiseL' | 'browRaiseR' | 'browInnerUp' | 'mouthSmile' | 'eyeSquintL' | 'eyeSquintR';
  peak:        number;
  durationS:   number;
  minInterval: number;
  maxInterval: number;
}

const MICRO_EXPRESSIONS: MicroExpr[] = [
  // Subtle double brow raise — momentary curiosity / engagement
  { morph: 'browRaiseL',  peak: 0.22, durationS: 0.6, minInterval: 8,  maxInterval: 18 },
  { morph: 'browRaiseR',  peak: 0.22, durationS: 0.6, minInterval: 8,  maxInterval: 18 },
  // Inner brow sympathy flicker
  { morph: 'browInnerUp', peak: 0.25, durationS: 0.5, minInterval: 12, maxInterval: 22 },
  // Warmth smile pulse
  { morph: 'mouthSmile',  peak: 0.15, durationS: 0.8, minInterval: 10, maxInterval: 20 },
];

interface MicroExprState {
  currentValue: number;
  nextAt:       number;
  active:       boolean;
  elapsed:      number;
}

function randomInterval(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomBlinkInterval(): number {
  return BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
}

/**
 * Brings Lyra to life with continuous micro-animations:
 *   - Randomised eye blinks (3–6 s interval)
 *   - Subtle sinusoidal head sway (attentive, not robotic)
 *   - Breathing: slow Y position oscillation (~13 breaths/min)
 *     (amplitude scales up when user shows strong emotion)
 *   - Listening mode: gentle head tilt while user is speaking
 *   - Micro-expressions: occasional brow raises, smile pulses (~every 10–20 s)
 *     to break robotic stillness between speech turns
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
  const breathAmpRef     = useRef(BREATH_AMP_BASE);

  // Initialize micro-expression state for each expression
  const microStatesRef = useRef<MicroExprState[]>(
    MICRO_EXPRESSIONS.map((expr) => ({
      currentValue: 0,
      nextAt:       randomInterval(expr.minInterval, expr.maxInterval),
      active:       false,
      elapsed:      0,
    })),
  );

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    elapsedRef.current += delta;
    const t = elapsedRef.current;

    const isSpeaking = useSessionStore.getState().isAvatarSpeaking;
    const phase      = useSessionStore.getState().phase;
    const emotion    = useSessionStore.getState().currentEmotion;

    // ── Head sway (base rotation — speaking hook adds offsets after) ──────
    groupRef.current.rotation.y = Math.sin(t * SWAY_Y_FREQ * Math.PI * 2) * SWAY_Y_AMP;
    groupRef.current.rotation.x = Math.sin(t * SWAY_X_FREQ * Math.PI * 2) * SWAY_X_AMP;

    // ── Breathing — deeper when user is emotionally engaged ───────────────
    const isEmotional  = emotion !== 'neutral';
    const targetBreath = (isEmotional && !isSpeaking) ? BREATH_AMP_ENGAGED : BREATH_AMP_BASE;
    breathAmpRef.current += (targetBreath - breathAmpRef.current) * Math.min(1, 1.5 * delta);
    groupRef.current.position.y = Math.sin(t * BREATH_FREQ * Math.PI * 2) * breathAmpRef.current;

    // ── Listening tilt (Z axis, when Lyra is not speaking) ────────────────
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

    // ── Micro-expressions (only while listening, not while speaking) ──────
    // Each runs independently on its own timer. A smooth bell-curve envelope
    // (sin²) ramps the morph up then back down, so it never looks like a twitch.
    if (!isSpeaking && phase === 'active') {
      const states = microStatesRef.current;

      for (let i = 0; i < MICRO_EXPRESSIONS.length; i++) {
        const expr  = MICRO_EXPRESSIONS[i]!;
        const state = states[i]!;

        if (state.active) {
          state.elapsed += delta;
          const progress = state.elapsed / expr.durationS;

          if (progress >= 1) {
            // Done — reset morph and schedule next occurrence
            state.active       = false;
            state.elapsed      = 0;
            state.currentValue = 0;
            state.nextAt       = t + randomInterval(expr.minInterval, expr.maxInterval);
            setMorph(expr.morph, 0);
          } else {
            // Bell-curve envelope: sin²(π·progress) peaks at progress=0.5
            const envelope     = Math.sin(Math.PI * progress);
            state.currentValue = expr.peak * envelope;
            setMorph(expr.morph, state.currentValue);
          }
        } else if (t >= state.nextAt) {
          state.active  = true;
          state.elapsed = 0;
        }
      }
    }
  });
}
