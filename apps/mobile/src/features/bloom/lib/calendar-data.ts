/**
 * Calendar derivation — turns a CycleProfile into per-day cells the calendar
 * UI renders.
 *
 * Adım 2A.1 (görsel iskelet): henüz `PeriodLog` verisi yok. Period günleri
 * sadece `profile.lastPeriodStart`'tan ±5 gün üzerinden çıkarılır (klasik
 * 5-günlük menstrual faz varsayımı). Adım 2A.2'de `PeriodLog` aralığı
 * çekilince burada `loggedPeriodStarts` parametresi ile gerçek period günleri
 * üzerinden çalışacak.
 *
 * Dürüstlük kuralları (cycle-calculator ile aynı):
 *   - profil yoksa ya da lastPeriodStart yoksa → tüm cell'ler "boş" (faz/dot
 *     yok), passive render
 *   - predictionWithheld true ise (irregular / <3 cycle) → isPredicted hep
 *     false (tahmin yumuşak shimmer'ı bile gösterilmez)
 */

import type { ICycleProfile, TCyclePhase } from '@ai-therapist/types';
import { phaseForDay } from './cycle-calculator';

const MS_DAY = 86400000;

// ── date utils ───────────────────────────────────────────────────────────────

export function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function diffDays(a: Date, b: Date): number {
  return Math.floor((toUtcMidnight(a).getTime() - toUtcMidnight(b).getTime()) / MS_DAY);
}

export function addDays(d: Date, days: number): Date {
  const r = toUtcMidnight(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

export function isoOf(d: Date): string {
  return toUtcMidnight(d).toISOString().slice(0, 10);
}

export function sameDay(a: Date, b: Date): boolean {
  return diffDays(a, b) === 0;
}

/**
 * Returns the Sunday (or Monday if `weekStartsMonday`) at UTC midnight of the
 * week containing `d`. iOS Calendar default is Sunday-first; we align with that.
 */
export function getWeekStart(d: Date, weekStartsMonday = false): Date {
  const m = toUtcMidnight(d);
  const dow = m.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = weekStartsMonday
    ? (dow === 0 ? 6 : dow - 1)
    : dow;
  return addDays(m, -offset);
}

/**
 * First day of the month at UTC midnight.
 */
export function getMonthStart(d: Date): Date {
  const m = toUtcMidnight(d);
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1));
}

/**
 * Number of days in the month containing `d`.
 */
export function daysInMonth(d: Date): number {
  const m = toUtcMidnight(d);
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
}

// ── DayCell shape ─────────────────────────────────────────────────────────────

export interface DayCell {
  /** ISO YYYY-MM-DD (UTC midnight) */
  iso: string;
  /** UTC midnight Date object */
  date: Date;
  /** Day of month (1..31) — for grid render */
  dayOfMonth: number;
  /** Cycle day (1..avg). null if profile/lastPeriodStart missing or date is before lastPeriodStart */
  cycleDay: number | null;
  /** Computed phase from cycleDay. null if cycleDay null. */
  phase: TCyclePhase | null;
  /** Today flag (UTC midnight equality). */
  isToday: boolean;
  /** Confirmed period day — within 5 days of lastPeriodStart for now. */
  isPeriod: boolean;
  /** Predicted period day — within ±2 days of expected next start. Honors withheld. */
  isPredicted: boolean;
  /** Strict future of today. */
  isFuture: boolean;
  /** Belongs to the currently rendered month (for month grid leading/trailing days). */
  isCurrentMonth: boolean;
}

// ── core computation ─────────────────────────────────────────────────────────

interface ComputeOptions {
  profile: ICycleProfile | null;
  /** Date considered "today". Defaults to now. */
  today?: Date;
  /** When true, suppresses isPredicted regardless of math (irregular stages, <3 cycles). */
  predictionWithheld?: boolean;
  /** For month grid — flags whether the cell belongs to this month. */
  referenceMonth?: Date;
  /**
   * ISO YYYY-MM-DD set'leri — backend `PeriodLog` verisinden gelir
   * (`useCalendarLogs` hook). Bu set'lerdeki günler "filled" işaretlenir
   * (kullanıcı manuel mark etti, gerçek period). Boşsa fallback olarak
   * `profile.lastPeriodStart..+4` aralığı kullanılır.
   */
  periodStartIso?: Set<string>;
  /** Kullanıcının "regl son günü" işaretleri. Bir start'a eşleşmesi için
   *  start'tan sonraki en yakın end olarak yorumlanır. Yoksa fallback +4 gün. */
  periodEndIso?: Set<string>;
  flowDayIso?: Set<string>;
}

/**
 * Build a single day cell. Pure.
 */
export function computeDayCell(target: Date, opts: ComputeOptions): DayCell {
  const today = toUtcMidnight(opts.today ?? new Date());
  const date = toUtcMidnight(target);
  const ref = opts.referenceMonth ? toUtcMidnight(opts.referenceMonth) : null;

  const profile = opts.profile;
  const profileLastStart = profile?.lastPeriodStart
    ? toUtcMidnight(new Date(profile.lastPeriodStart))
    : null;
  const avg = profile?.averageCycleDays ?? 28;

  // Effective last period start — period_logs is source of truth once user
  // has marked anything. Backend mirrors this same logic on `getToday`.
  // - If `periodStartIso` has entries → use the most recent
  // - Otherwise fall back to `profile.lastPeriodStart` (onboarding seed)
  let effectiveLastStart: Date | null = profileLastStart;
  if (opts.periodStartIso && opts.periodStartIso.size > 0) {
    let latest: Date | null = null;
    for (const startIso of opts.periodStartIso) {
      const d = toUtcMidnight(new Date(`${startIso}T00:00:00.000Z`));
      if (!latest || d.getTime() > latest.getTime()) latest = d;
    }
    if (latest) effectiveLastStart = latest;
  }

  let cycleDay: number | null = null;
  let phase: TCyclePhase | null = null;

  if (effectiveLastStart) {
    const daysSince = diffDays(date, effectiveLastStart);
    if (daysSince >= 0) {
      cycleDay = (daysSince % avg) + 1;
      phase = phaseForDay(cycleDay, avg);
    }
  }

  // Period detection. Sources, in priority order:
  //   a) `flowDayIso` — user explicitly logged a flow on this day
  //   b) `periodStartIso` + `periodEndIso` — start'tan sonraki ilk end ile
  //      kapanan aralık. End yoksa fallback start..+4 gün (5-day visual).
  //   c) Fallback: profile.lastPeriodStart..+4 (only when there are no logs
  //      at all — i.e. onboarding-only state)
  const iso = isoOf(date);
  let isPeriod = false;

  if (opts.flowDayIso && opts.flowDayIso.has(iso)) {
    isPeriod = true;
  } else if (opts.periodStartIso && opts.periodStartIso.size > 0) {
    // Build sorted start + end arrays once. Cheap (k<<n).
    const starts = Array.from(opts.periodStartIso)
      .map((s) => toUtcMidnight(new Date(`${s}T00:00:00.000Z`)))
      .sort((a, b) => a.getTime() - b.getTime());
    const ends = Array.from(opts.periodEndIso ?? [])
      .map((s) => toUtcMidnight(new Date(`${s}T00:00:00.000Z`)))
      .sort((a, b) => a.getTime() - b.getTime());

    for (let i = 0; i < starts.length; i++) {
      const start = starts[i]!;
      const nextStart = starts[i + 1] ?? null;
      // Find first end on/after this start, before the next start (if any)
      let matchedEnd: Date | null = null;
      for (const e of ends) {
        if (e.getTime() < start.getTime()) continue;
        if (nextStart && e.getTime() >= nextStart.getTime()) break;
        matchedEnd = e;
        break;
      }
      const periodEnd = matchedEnd ?? addDays(start, 4); // 5-day fallback
      const dFromStart = diffDays(date, start);
      const dFromEnd = diffDays(date, periodEnd);
      if (dFromStart >= 0 && dFromEnd <= 0) {
        isPeriod = true;
        break;
      }
    }
  } else if (profileLastStart) {
    const d = diffDays(date, profileLastStart);
    if (d >= 0 && d <= 4) isPeriod = true;
  }

  // Predicted next period — only if not withheld and we have an effective anchor
  let isPredicted = false;
  if (effectiveLastStart && !opts.predictionWithheld) {
    const expected = addDays(effectiveLastStart, avg);
    const d = diffDays(date, expected);
    if (d >= -2 && d <= 2) isPredicted = true;
  }

  return {
    iso: isoOf(date),
    date,
    dayOfMonth: date.getUTCDate(),
    cycleDay,
    phase,
    isToday: diffDays(date, today) === 0,
    isPeriod,
    isPredicted,
    isFuture: diffDays(date, today) > 0,
    isCurrentMonth: ref ? date.getUTCMonth() === ref.getUTCMonth() : true,
  };
}

/**
 * 7 cells starting from `weekStart` (Sunday or Monday).
 */
export function computeWeekCells(weekStart: Date, opts: ComputeOptions): DayCell[] {
  const start = toUtcMidnight(weekStart);
  return Array.from({ length: 7 }, (_, i) => computeDayCell(addDays(start, i), opts));
}

/**
 * 6×7 grid (always 42 cells) for a month grid view. Includes leading days from
 * the previous month and trailing days from the next, marked via `isCurrentMonth`.
 */
export function computeMonthGrid(referenceDate: Date, opts: ComputeOptions): DayCell[][] {
  const ref = getMonthStart(referenceDate);
  const gridStart = getWeekStart(ref, opts.profile == null ? false : false); // Sunday-first
  const out: DayCell[][] = [];
  for (let row = 0; row < 6; row++) {
    const week: DayCell[] = [];
    for (let col = 0; col < 7; col++) {
      const date = addDays(gridStart, row * 7 + col);
      week.push(computeDayCell(date, { ...opts, referenceMonth: ref }));
    }
    out.push(week);
  }
  return out;
}

/**
 * Helper to derive `predictionWithheld` from profile + log count proxy. Adım
 * 2A.1'de cycle log sayısı yok, profile.stage'e bakar.
 */
export function shouldWithholdPrediction(profile: ICycleProfile | null): boolean {
  if (!profile) return true;
  if (!profile.lastPeriodStart) return true;
  const stage = profile.stage;
  if (stage === 'irregular' || stage === 'pcos' || stage === 'endo') return true;
  // Adım 2A.1 — log sayısı yok, ihtiyatlı davran: tahmin gösterme
  // Adım 2A.2'de loggedCycleCount geldiğinde >=3 kontrolüne dönecek
  return false; // şimdilik UX'i bozmayan default: profil varsa göster
}
