'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { ttsAudio } from '../../session/tts-audio';
import type { MorphControls } from './use-morph-targets';

/** How fast mouth values chase the audio-derived target (per second). */
const LERP_SPEED = 18;

/**
 * Drives mouth morph targets from real-time FFT analysis of the TTS audio.
 *
 * Frequency band → viseme mapping:
 *   80–3000 Hz overall amplitude → mouthOpen  (jaw)
 *   200–600 Hz density           → mouthFunnel (O / U vowels)
 *   1000–3000 Hz density         → mouthStretch (A / E vowels / fricatives)
 *
 * When no audio is playing all values lerp back to 0, giving a natural
 * mouth-close animation instead of an abrupt snap.
 *
 * Replaces the crude sine-wave jaw oscillation in useAvatarSpeaking.
 */
export function useAvatarLipSync(morphs: MorphControls) {
  const { setMorph } = morphs;

  const jawRef     = useRef(0);
  const funnelRef  = useRef(0);
  const stretchRef = useRef(0);

  useFrame((_state, delta) => {
    const analyser = ttsAudio.analyser;
    const data     = ttsAudio.data;

    const t = Math.min(1, LERP_SPEED * delta);

    if (!analyser || !data) {
      // No audio context available — fade to neutral
      jawRef.current     += (0 - jawRef.current)     * t;
      funnelRef.current  += (0 - funnelRef.current)  * t;
      stretchRef.current += (0 - stretchRef.current) * t;
      setMorph('mouthOpen',    jawRef.current);
      setMorph('mouthFunnel',  funnelRef.current);
      setMorph('mouthStretch', stretchRef.current);
      return;
    }

    analyser.getByteFrequencyData(data);

    const binCount  = data.length;        // 128 for fftSize 256
    const sampleRate = (analyser.context as AudioContext).sampleRate;
    const binHz     = (sampleRate / 2) / binCount;

    /** Average normalised amplitude [0,1] within a Hz band. */
    const avgBand = (loHz: number, hiHz: number): number => {
      const lo  = Math.max(0, Math.floor(loHz / binHz));
      const hi  = Math.min(binCount - 1, Math.ceil(hiHz / binHz));
      let sum   = 0;
      for (let i = lo; i <= hi; i++) sum += (data[i] ?? 0);
      return hi >= lo ? sum / ((hi - lo + 1) * 255) : 0;
    };

    // ── Overall amplitude → jaw open ──────────────────────────────────────
    const overall     = avgBand(80, 3000);
    const targetJaw   = Math.pow(Math.max(0, overall), 0.65) * 0.90;

    // ── Low-mid density → round vowels (O / U) ────────────────────────────
    const lowMid        = avgBand(200, 600);
    const targetFunnel  = Math.max(0, lowMid * 0.55 - 0.08);

    // ── High-mid density → wide vowels / fricatives (A / E / S) ──────────
    const highMid        = avgBand(1000, 3000);
    const targetStretch  = Math.max(0, highMid * 0.45 - 0.06);

    // ── Smooth lerp ───────────────────────────────────────────────────────
    jawRef.current     += (targetJaw     - jawRef.current)     * t;
    funnelRef.current  += (targetFunnel  - funnelRef.current)  * t;
    stretchRef.current += (targetStretch - stretchRef.current) * t;

    setMorph('mouthOpen',    jawRef.current);
    setMorph('mouthFunnel',  funnelRef.current);
    setMorph('mouthStretch', stretchRef.current);
  });
}
