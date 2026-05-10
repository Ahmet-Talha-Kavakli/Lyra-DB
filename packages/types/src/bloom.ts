// ─── Bloom — women's cycle & reproductive health ──────────────────────────

export type TCyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type TCycleStage =
  | 'unknown'
  | 'regular'
  | 'irregular'
  | 'pcos'
  | 'endo'
  | 'ttc'
  | 'pregnant'
  | 'loss'
  | 'postpartum'
  | 'perimenopause'
  | 'menopause';

export type TFlow = 'none' | 'spotting' | 'light' | 'medium' | 'heavy' | 'very_heavy';

/**
 * Per-category AI access. Default — every category false (Lyra sees nothing).
 * `all = true` short-circuits to allow everything; if explicitly false, fall
 * back to per-category checks.
 */
export interface IBloomAiAccess {
  mood?: boolean;
  symptoms?: boolean;
  sexual?: boolean;
  all?: boolean;
}

export interface ICycleProfile {
  id: string;
  userId: string;
  birthDate: string | null;
  averageCycleDays: number | null;
  lastPeriodStart: string | null;
  stage: TCycleStage;
  aiAccessLevel: IBloomAiAccess;
  createdAt: string;
  updatedAt: string;
}

// ── Mood & symptom tag enums ─────────────────────────────────────────────────

/**
 * Bloom-specific mood tags — broader than Home tab's 5-mood checkpoint. These
 * are emotional tones cycle users commonly report; multiselect.
 */
export type TBloomMood =
  | 'anxious' | 'irritable' | 'sad' | 'angry' | 'sensitive'
  | 'empowered' | 'calm' | 'motivated' | 'withdrawn' | 'energetic'
  | 'foggy' | 'connected';

export type TPainType = 'cramp' | 'ache' | 'sharp' | 'dull' | 'throbbing';

/**
 * Body region — front-only female silhouette. See ADR-006 / mimari karar #2.
 * Adım 2B'de SVG diyagramında tıklanabilir bölgeler.
 */
export type TBodyRegion =
  | 'head' | 'neck' | 'chest' | 'upper_abdomen' | 'lower_abdomen'
  | 'back' | 'hip_pelvis' | 'vaginal' | 'joints';

export interface IPainEntry {
  region: TBodyRegion;
  intensity: number;        // 0-10 NRS
  type?: TPainType;
  note?: string;
}

export type TSleepQuality = 'restless' | 'okay' | 'restful';
export type TDigestionTag = 'bloating' | 'cramps' | 'constipation' | 'diarrhea' | 'nausea';
export type TSkinTag = 'acne' | 'oily' | 'dry' | 'breakout' | 'glow';
export type TCognitionTag = 'foggy' | 'sharp' | 'scattered' | 'creative';

export type TIntimacyProtection = 'protected' | 'unprotected' | 'na';
export type TLibido = 'low' | 'normal' | 'high';

/**
 * Optional intimacy block — only present when user opts in via Bloom switch.
 * Default: kullanıcı switch açmadıysa hiç payload'a girmez. Adım 2C.3.
 */
export interface IIntimacyEntry {
  occurred: boolean;
  protection?: TIntimacyProtection;
  libido?: TLibido;
  orgasm?: 'none' | 'one' | 'multiple';
  note?: string;
}

/**
 * Day's full symptom payload. Every field optional — kullanıcı sadece logladığını
 * yazıyor. Adım 2'nin alt-task'ları boyunca alanlar UI'ya bağlanacak.
 */
export interface IPeriodLogPayload {
  mood?:        TBloomMood[];
  pain?:        IPainEntry[];
  energy?:      1 | 2 | 3 | 4 | 5;
  sleep?:       { hours: number; quality?: TSleepQuality };
  digestion?:   TDigestionTag[];
  cognition?:   TCognitionTag[];
  skin?:        TSkinTag[];
  bbt?:         number;        // celsius, e.g. 36.55
  meds?:        string[];      // medication / supplement names
  intimacy?:    IIntimacyEntry;
}

export interface IPeriodLog {
  id: string;
  userId: string;
  logDate: string;             // YYYY-MM-DD
  flow: TFlow | null;
  isPeriodStart: boolean;
  notes: string | null;
  payload: IPeriodLogPayload;
  createdAt: string;
  updatedAt: string;
}

/**
 * Range fetch result — calendar component'inin month'u boyamak için kullandığı
 * compact format. Sadece dolu günler döner (boş günler hesaplanır).
 */
export interface IBloomCalendarEntry {
  logDate: string;             // YYYY-MM-DD
  flow: TFlow | null;
  isPeriodStart: boolean;
  hasPayload: boolean;         // payload non-empty mi (UI badge için)
}

/**
 * Today payload — what the "Today" screen renders.
 * Phase/day/prediction may all be null when the profile lacks enough data
 * (no last period, no average, fewer than 3 confirmed cycles for prediction).
 */
export interface IBloomToday {
  cycleDay: number | null;
  phase: TCyclePhase | null;
  /** ISO date string (YYYY-MM-DD) — start of expected window */
  nextPeriodStart: string | null;
  /** ISO date string — end of expected window. Range, not point. */
  nextPeriodEnd: string | null;
  /** True when we have <3 cycles or stage is irregular — no prediction. */
  predictionWithheld: boolean;
  /** Reason string for the UI: 'not-enough-data' | 'irregular' | 'no-data' */
  predictionReason: 'ok' | 'not-enough-data' | 'irregular' | 'no-data';
  stage: TCycleStage;
}
