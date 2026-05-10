import type { TEmotionLabel } from '@ai-therapist/types';
import type { TBlendShapeKey } from './blend-shapes';

/**
 * Lyra's EMPATHETIC RESPONSE presets — what Lyra's face shows in response
 * to the user's detected emotion. A therapist does NOT mirror the patient;
 * she responds with warmth, concern, reassurance, or engaged curiosity
 * depending on what the patient is feeling.
 *
 * Used by useAvatarEmotion when Lyra is listening.
 */
export const THERAPIST_RESPONSES: Record<TEmotionLabel, Partial<Record<TBlendShapeKey, number>>> = {
  // Baseline: warm attentive presence
  neutral: {
    mouthSmile:  0.18,
    cheekRaiseL: 0.10,
    cheekRaiseR: 0.10,
  },

  // User is happy → Lyra mirrors genuine warmth / joy
  happy: {
    mouthSmile:  0.65,
    cheekRaiseL: 0.45,
    cheekRaiseR: 0.45,
    eyeSquintL:  0.22,
    eyeSquintR:  0.22,
  },

  // User is sad → Lyra shows compassion (not sadness): inner brow concern + gentle softness
  sad: {
    browInnerUp: 0.52,
    browRaiseL:  0.12,
    browRaiseR:  0.12,
    mouthSmile:  0.08,
    eyeSquintL:  0.12,
    eyeSquintR:  0.12,
  },

  // User is angry → Lyra stays calm and grounded: composed, open, non-threatening
  angry: {
    browInnerUp: 0.22,
    browRaiseL:  0.10,
    browRaiseR:  0.10,
    mouthSmile:  0.12,
    eyeSquintL:  0.06,
    eyeSquintR:  0.06,
  },

  // User is fearful → Lyra reassures: warm smile, open eyes, engaged
  fearful: {
    mouthSmile:  0.32,
    cheekRaiseL: 0.22,
    cheekRaiseR: 0.22,
    browRaiseL:  0.18,
    browRaiseR:  0.18,
  },

  // User is disgusted → Lyra: patient, non-judgmental, empathetic
  disgusted: {
    browInnerUp: 0.18,
    mouthSmile:  0.14,
    cheekRaiseL: 0.08,
    cheekRaiseR: 0.08,
  },

  // User is surprised → Lyra: engaged curiosity, interested
  surprised: {
    browRaiseL:  0.42,
    browRaiseR:  0.42,
    mouthSmile:  0.28,
    eyeWideL:    0.20,
    eyeWideR:    0.20,
  },

  // User shows contempt → Lyra: patient warmth, does NOT mirror contempt
  contempt: {
    mouthSmile:  0.22,
    cheekRaiseL: 0.14,
    cheekRaiseR: 0.14,
    browInnerUp: 0.10,
  },
};

/**
 * Lyra's SPEAKING expression — maintained while Lyra is actively talking.
 * Warm, engaged, confident: a therapist speaking to you.
 */
export const SPEAKING_EXPRESSION: Partial<Record<TBlendShapeKey, number>> = {
  mouthSmile:  0.25,
  cheekRaiseL: 0.15,
  cheekRaiseR: 0.15,
  eyeSquintL:  0.10,
  eyeSquintR:  0.10,
};

/**
 * @deprecated — kept for reference only. Emotion presets are no longer
 * applied directly to Lyra's face; use THERAPIST_RESPONSES instead.
 */
export const EMOTION_PRESETS: Record<TEmotionLabel, Partial<Record<TBlendShapeKey, number>>> = {
  neutral:   {},
  happy:     { mouthSmile: 0.65, cheekRaiseL: 0.45, cheekRaiseR: 0.45, eyeSquintL: 0.20, eyeSquintR: 0.20 },
  sad:       { mouthSad: 0.55, browInnerUp: 0.50, browDropL: 0.15, browDropR: 0.15 },
  angry:     { browDropL: 0.65, browDropR: 0.65, eyeSquintL: 0.35, eyeSquintR: 0.35, noseSneer: 0.25, mouthPress: 0.30 },
  fearful:   { browRaiseL: 0.55, browRaiseR: 0.55, browInnerUp: 0.40, eyeWideL: 0.50, eyeWideR: 0.50 },
  disgusted: { noseSneer: 0.60, browDropL: 0.25, browDropR: 0.25, eyeSquintL: 0.20, eyeSquintR: 0.20, mouthPress: 0.15 },
  surprised: { browRaiseL: 0.75, browRaiseR: 0.75, eyeWideL: 0.65, eyeWideR: 0.65 },
  contempt:  { mouthSmile: 0.20, noseSneer: 0.20, eyeSquintL: 0.15 },
};
