/**
 * Local mirror of the backend's cycle calculator. Same rules; lets the Today
 * card render before the network request resolves (or while offline).
 *
 * KEEP IN SYNC with apps/api/src/modules/bloom/cycle-calculator.ts.
 */
import type { TCyclePhase, TCycleStage, IBloomToday } from '@ai-therapist/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

export function phaseForDay(day: number, avgCycleDays: number): TCyclePhase {
  if (day <= 0) return 'menstrual';
  if (day <= 5) return 'menstrual';
  const ovDay = Math.max(10, avgCycleDays - 14);
  if (day >= ovDay - 1 && day <= ovDay + 1) return 'ovulation';
  if (day < ovDay - 1) return 'follicular';
  return 'luteal';
}

export interface ComputeTodayInput {
  lastPeriodStart: Date | null;
  averageCycleDays: number | null;
  stage: TCycleStage;
  loggedCycleCount?: number;
  today?: Date;
}

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
  const daysSince = diffDays(today, start);

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

  const cycleDay = (daysSince % avg) + 1;
  const phase = phaseForDay(cycleDay, avg);

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
