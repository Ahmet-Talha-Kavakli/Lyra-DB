import type { TCyclePhase, TCycleStage, IBloomToday } from '@ai-therapist/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Discard time component, treat both as UTC midnight dates. */
function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((toUtcMidnight(a).getTime() - toUtcMidnight(b).getTime()) / MS_PER_DAY);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function toIsoDate(d: Date): string {
  return toUtcMidnight(d).toISOString().slice(0, 10);
}

/**
 * Cycle phase from cycle day + average cycle length. Treats the average as a
 * normal-ish 28-ish day rhythm and scales windows proportionally:
 *   - menstrual:  days 1..5
 *   - follicular: 6..(ovulation - 1)
 *   - ovulation:  ~14 default, or (avg - 14) days before next period
 *   - luteal:     after ovulation through cycle end
 *
 * Standard luteal phase is ~14 days regardless of cycle length, so ovulation
 * day floats (long cycle = late ovulation, short = early). We use:
 *   ovulationDay = avg - 14
 * with a 3-day fertile window centered there.
 */
export function phaseForDay(day: number, avgCycleDays: number): TCyclePhase {
  if (day <= 0) return 'menstrual';
  if (day <= 5) return 'menstrual';
  const ovDay = Math.max(10, avgCycleDays - 14); // floor at day 10 for short cycles
  if (day >= ovDay - 1 && day <= ovDay + 1) return 'ovulation';
  if (day < ovDay - 1) return 'follicular';
  return 'luteal';
}

export interface ComputeTodayInput {
  lastPeriodStart: Date | null;
  averageCycleDays: number | null;
  stage: TCycleStage;
  /** Optional — for prediction confidence. Adım 1'de boş gelebilir. */
  loggedCycleCount?: number;
  /** Defaults to "now" — pure function for tests. */
  today?: Date;
}

/**
 * Pure cycle calculator. No DB. Returns the IBloomToday payload the mobile
 * "Bugün" screen renders.
 *
 * Honesty rules:
 *   - <3 cycles confirmed → no prediction (predictionWithheld = true)
 *   - stage irregular/pcos/endo → no point prediction
 *   - no lastPeriodStart → no day, no phase, no prediction
 */
export function computeToday(input: ComputeTodayInput): IBloomToday {
  const today = input.today ? toUtcMidnight(input.today) : toUtcMidnight(new Date());
  const avg = input.averageCycleDays ?? 28;
  const stage = input.stage ?? 'unknown';

  if (!input.lastPeriodStart) {
    return {
      cycleDay: null,
      phase: null,
      nextPeriodStart: null,
      nextPeriodEnd: null,
      predictionWithheld: true,
      predictionReason: 'no-data',
      stage,
    };
  }

  const start = toUtcMidnight(input.lastPeriodStart);
  let daysSince = diffDays(today, start);

  // Edge: future-dated lastPeriodStart shouldn't happen, but guard anyway.
  if (daysSince < 0) {
    return {
      cycleDay: null,
      phase: null,
      nextPeriodStart: null,
      nextPeriodEnd: null,
      predictionWithheld: true,
      predictionReason: 'no-data',
      stage,
    };
  }

  // If daysSince is way past a cycle, roll forward — user just hasn't logged
  // a new period start yet. Cycle day modulo avg.
  const cycleDay = (daysSince % avg) + 1;
  const phase = phaseForDay(cycleDay, avg);

  // Prediction logic
  const irregular = stage === 'irregular' || stage === 'pcos' || stage === 'endo';
  const enoughData = (input.loggedCycleCount ?? 0) >= 3;

  if (irregular) {
    return {
      cycleDay,
      phase,
      nextPeriodStart: null,
      nextPeriodEnd: null,
      predictionWithheld: true,
      predictionReason: 'irregular',
      stage,
    };
  }

  if (!enoughData) {
    // We can still show day/phase based on the user's stated avg — but the
    // prediction is honest: not enough confirmed cycles yet.
    return {
      cycleDay,
      phase,
      nextPeriodStart: null,
      nextPeriodEnd: null,
      predictionWithheld: true,
      predictionReason: 'not-enough-data',
      stage,
    };
  }

  // Range prediction: ±2 days around expected start (day avg+1 from lastStart).
  const expectedStart = addDays(start, avg);
  const predStart = addDays(expectedStart, -2);
  const predEnd = addDays(expectedStart, 2);

  return {
    cycleDay,
    phase,
    nextPeriodStart: toIsoDate(predStart),
    nextPeriodEnd: toIsoDate(predEnd),
    predictionWithheld: false,
    predictionReason: 'ok',
    stage,
  };
}
