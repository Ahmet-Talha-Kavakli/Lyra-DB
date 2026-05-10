import type {
  ICycleProfile,
  IBloomToday,
  IBloomAiAccess,
  TCycleStage,
  IBloomCalendarEntry,
  IPeriodLog,
  IPeriodLogPayload,
  TFlow,
} from '@ai-therapist/types';
import { API_BASE_URL } from '@/constants/api';

interface FetchOpts {
  clerkUserId: string;
}

function headers(clerkUserId: string): Record<string, string> {
  return {
    'Content-Type':    'application/json',
    'x-clerk-user-id': clerkUserId,
  };
}

/** Returns null when user has no profile yet (NestJS returns null/empty body). */
export async function fetchCycleProfile({ clerkUserId }: FetchOpts): Promise<ICycleProfile | null> {
  const res = await fetch(`${API_BASE_URL}/bloom/profile`, { headers: headers(clerkUserId) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as ICycleProfile;
}

export interface UpsertProfileInput {
  birthDate?: string | null;
  averageCycleDays?: number | null;
  lastPeriodStart?: string | null;
  stage?: TCycleStage;
  aiAccessLevel?: IBloomAiAccess;
}

export async function upsertCycleProfile(
  { clerkUserId }: FetchOpts,
  input: UpsertProfileInput,
): Promise<ICycleProfile> {
  const res = await fetch(`${API_BASE_URL}/bloom/profile`, {
    method:  'POST',
    headers: headers(clerkUserId),
    body:    JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export async function fetchToday({ clerkUserId }: FetchOpts): Promise<IBloomToday> {
  const res = await fetch(`${API_BASE_URL}/bloom/today`, { headers: headers(clerkUserId) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── PeriodLog ──────────────────────────────────────────────────────────────

export async function fetchCalendarRange(
  { clerkUserId }: FetchOpts,
  fromIso: string,
  toIso: string,
): Promise<IBloomCalendarEntry[]> {
  const res = await fetch(
    `${API_BASE_URL}/bloom/calendar?from=${fromIso}&to=${toIso}`,
    { headers: headers(clerkUserId) },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export interface UpsertLogInput {
  logDate: string;             // YYYY-MM-DD
  flow?: TFlow | null;
  isPeriodStart?: boolean;
  notes?: string | null;
  payload?: IPeriodLogPayload;
}

export async function upsertLog(
  { clerkUserId }: FetchOpts,
  input: UpsertLogInput,
): Promise<IPeriodLog> {
  const res = await fetch(`${API_BASE_URL}/bloom/log`, {
    method:  'POST',
    headers: headers(clerkUserId),
    body:    JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export async function fetchLogByDate(
  { clerkUserId }: FetchOpts,
  dateIso: string,
): Promise<IPeriodLog | null> {
  const res = await fetch(`${API_BASE_URL}/bloom/log/${dateIso}`, {
    headers: headers(clerkUserId),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

/**
 * Period start undo: clears the flag and rolls cycleProfile.lastPeriodStart
 * back to the most recent remaining period-start log (if any).
 */
export async function unmarkPeriodStart(
  { clerkUserId }: FetchOpts,
  dateIso: string,
): Promise<{ ok: boolean; rolledBackTo: string | null }> {
  const res = await fetch(
    `${API_BASE_URL}/bloom/log/${dateIso}/unmark-period-start`,
    { method: 'POST', headers: headers(clerkUserId) },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}
