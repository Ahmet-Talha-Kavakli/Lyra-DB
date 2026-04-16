// ─── User ──────────────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  clerkId: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TConsentType = 'camera' | 'audio' | 'psychological_data' | 'wearable';

export interface IUserConsent {
  id: string;
  userId: string;
  consentType: TConsentType;
  granted: boolean;
  grantedAt: Date | null;
  revokedAt: Date | null;
  version: string;
}

// ─── Profile ───────────────────────────────────────────────────────────────

export type TRiskLevel = 'low' | 'medium' | 'high' | 'imminent';

export interface IUserProfile {
  id: string;
  userId: string;
  goals: string[];
  mentalHealthHistory: Record<string, unknown>;
  therapyPreferences: Record<string, unknown>;
  personalitySnapshot: Record<string, unknown>;
  riskLevel: TRiskLevel;
  disclaimerAcceptedAt: Date | null;
  updatedAt: Date;
}

// ─── Session ───────────────────────────────────────────────────────────────

export type TSessionType = 'intake' | 'regular' | 'crisis' | 'follow-up';
export type TSessionStatus = 'active' | 'completed' | 'interrupted';

export interface ISession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  sessionType: TSessionType;
  status: TSessionStatus;
  summary: string | null;
  soapNotes: Record<string, unknown> | null;
  homework: Record<string, unknown> | null;
  tokenCount: number | null;
}

export interface ISessionEvent {
  id: string;
  sessionId: string;
  timestamp: Date;
  eventType: string;
  payload: Record<string, unknown>;
}

// ─── Vision & Emotion ──────────────────────────────────────────────────────

export type TEmotionLabel =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'surprised'
  | 'contempt';

export interface IEmotionSnapshot {
  timestamp: number;
  dominant: TEmotionLabel;
  scores: Record<TEmotionLabel, number>;
  fatigueScore: number;
  eyeContactScore: number;
}

// ─── Crisis ────────────────────────────────────────────────────────────────

export type TCrisisType = 'self_harm' | 'dangerous_object' | 'aggression' | 'verbal';
export type TCrisisSeverity = 'low' | 'moderate' | 'medium' | 'high' | 'imminent';

export interface ICrisisSignal {
  type: TCrisisType;
  severity: TCrisisSeverity;
  confidence: number;
  detectedAt: number;
  description: string;
}

export interface ICrisisLog {
  id: string;
  userId: string | null;
  sessionId: string | null;
  detectedAt: Date;
  threatType: TCrisisType;
  confidence: number;
  actionTaken: string | null;
  resolvedAt: Date | null;
}

// ─── Memory ────────────────────────────────────────────────────────────────

export type TMemoryType = 'event' | 'emotion' | 'belief' | 'pattern' | 'progress';

export interface IMemoryChunk {
  id: string;
  userId: string;
  sessionId: string | null;
  content: string;
  memoryType: TMemoryType;
  createdAt: Date;
}

// ─── Wearable ──────────────────────────────────────────────────────────────

export type TWearableSource = 'fitbit' | 'garmin' | 'whoop' | 'apple_health';

export interface IWearableDataPoint {
  id: string;
  userId: string;
  source: TWearableSource;
  recordedAt: Date;
  heartRate: number | null;
  hrv: number | null;
  sleepHours: number | null;
  activityMinutes: number | null;
  stressScore: number | null;
}

// ─── LiveKit data channel messages ────────────────────────────────────────

export type TLiveKitMessage =
  | { type: 'emotion_update'; payload: IEmotionSnapshot }
  | { type: 'crisis_signal'; payload: ICrisisSignal }
  | { type: 'avatar_expression'; payload: { expression: TEmotionLabel; intensity: number } }
  | { type: 'ai_chunk'; payload: { text: string } }
  | { type: 'ai_audio'; payload: { audio: string; format: 'mp3' } }
  | { type: 'ai_done'; payload: Record<string, never> }
  | { type: 'session_end'; payload: { reason: string } };

// ─── API request/response ──────────────────────────────────────────────────

export interface ICreateSessionRequest {
  sessionType: TSessionType;
}

export interface ICreateSessionResponse {
  sessionId: string;
  livekitToken: string;
  livekitUrl: string;
}

export interface IVisionAnalyzeRequest {
  sessionId: string;
  frameBase64: string;
  userId: string;
}
