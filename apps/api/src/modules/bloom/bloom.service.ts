import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { computeToday } from './cycle-calculator';
import type {
  IBloomToday,
  TCycleStage,
  IBloomAiAccess,
  TFlow,
  IPeriodLogPayload,
  IBloomCalendarEntry,
  TBloomMood,
  TPainType,
  TBodyRegion,
  TSleepQuality,
  TDigestionTag,
  TSkinTag,
  TCognitionTag,
  TIntimacyProtection,
  TLibido,
} from '@ai-therapist/types';

const VALID_STAGES: TCycleStage[] = [
  'unknown', 'regular', 'irregular', 'pcos', 'endo',
  'ttc', 'pregnant', 'loss', 'postpartum', 'perimenopause', 'menopause',
];

const VALID_FLOW: TFlow[] = ['none', 'spotting', 'light', 'medium', 'heavy', 'very_heavy'];
const VALID_MOOD: TBloomMood[] = [
  'anxious', 'irritable', 'sad', 'angry', 'sensitive',
  'withdrawn', 'foggy',
  'calm', 'energetic', 'motivated', 'empowered', 'connected', 'grateful',
];
const VALID_PAIN_TYPE: TPainType[] = ['cramp', 'ache', 'sharp', 'dull', 'throbbing'];
const VALID_REGION: TBodyRegion[] = [
  'head', 'neck',
  'breast_left', 'breast_right',
  'upper_abdomen', 'lower_abdomen',
  'ovary_left', 'ovary_right',
  'pelvis',
  'upper_back', 'lower_back', 'hip_sacrum',
  'leg_upper', 'leg_lower',
  'joints',
];
const VALID_SLEEP: TSleepQuality[] = ['restless', 'okay', 'restful'];
const VALID_DIGESTION: TDigestionTag[] = ['bloating', 'cramps', 'constipation', 'diarrhea', 'nausea'];
const VALID_SKIN: TSkinTag[] = ['acne', 'oily', 'dry', 'breakout', 'glow'];
const VALID_COGNITION: TCognitionTag[] = ['foggy', 'sharp', 'scattered', 'creative'];
const VALID_PROTECTION: TIntimacyProtection[] = ['protected', 'unprotected', 'na'];
const VALID_LIBIDO: TLibido[] = ['low', 'normal', 'high'];

const MIN_CYCLE_DAYS = 21;
const MAX_CYCLE_DAYS = 45;
const MAX_NOTES_LEN = 2000;
const MAX_LOG_RANGE_DAYS = 366; // calendar fetch hard cap

interface ProfileInput {
  birthDate?: string | null;
  averageCycleDays?: number | null;
  lastPeriodStart?: string | null;
  stage?: TCycleStage;
  aiAccessLevel?: IBloomAiAccess;
}

@Injectable()
export class BloomService {
  constructor(private prisma: PrismaService) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    if (!clerkId) throw new NotFoundException('clerkId required');
    const user = await this.prisma.user.upsert({
      where:  { clerkId },
      create: { clerkId },
      update: {},
      select: { id: true },
    });
    return user.id;
  }

  private validate(input: ProfileInput) {
    if (input.averageCycleDays != null) {
      if (
        !Number.isInteger(input.averageCycleDays) ||
        input.averageCycleDays < MIN_CYCLE_DAYS ||
        input.averageCycleDays > MAX_CYCLE_DAYS
      ) {
        throw new BadRequestException(
          `averageCycleDays must be between ${MIN_CYCLE_DAYS} and ${MAX_CYCLE_DAYS}`,
        );
      }
    }
    if (input.stage != null && !VALID_STAGES.includes(input.stage)) {
      throw new BadRequestException(`Invalid stage: ${input.stage}`);
    }
    if (input.birthDate != null && input.birthDate !== '') {
      const d = new Date(input.birthDate);
      if (isNaN(d.getTime())) {
        throw new BadRequestException('Invalid birthDate');
      }
      const now = new Date();
      const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 8 || age > 100) {
        throw new BadRequestException('birthDate out of plausible range');
      }
    }
    if (input.lastPeriodStart != null && input.lastPeriodStart !== '') {
      const d = new Date(input.lastPeriodStart);
      if (isNaN(d.getTime())) {
        throw new BadRequestException('Invalid lastPeriodStart');
      }
      const now = new Date();
      if (d.getTime() > now.getTime() + 24 * 3600 * 1000) {
        throw new BadRequestException('lastPeriodStart cannot be in the future');
      }
    }
  }

  async getProfile(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const profile = await this.prisma.cycleProfile.findUnique({
      where: { userId },
    });
    return profile; // may be null — caller treats as "needs onboarding"
  }

  async upsertProfile(clerkId: string, input: ProfileInput) {
    const userId = await this.resolveUserId(clerkId);
    this.validate(input);

    const data: any = {};
    if (input.birthDate !== undefined) {
      data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
    }
    if (input.averageCycleDays !== undefined) {
      data.averageCycleDays = input.averageCycleDays;
    }
    if (input.lastPeriodStart !== undefined) {
      data.lastPeriodStart = input.lastPeriodStart ? new Date(input.lastPeriodStart) : null;
    }
    if (input.stage !== undefined) data.stage = input.stage;
    if (input.aiAccessLevel !== undefined) data.aiAccessLevel = input.aiAccessLevel;

    return this.prisma.cycleProfile.upsert({
      where:  { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  /**
   * Effective last period start = most recent period_logs entry with
   * isPeriodStart=true, or fallback to profile.lastPeriodStart (onboarding).
   *
   * `period_logs` is the source of truth once the user has marked anything;
   * `profile.lastPeriodStart` is just the seed value from onboarding and
   * should not be overwritten when users mark/unmark days. This avoids the
   * sync hell of keeping a denormalized cache up to date.
   */
  private async effectiveLastPeriodStart(userId: string): Promise<Date | null> {
    const latestLog = await this.prisma.periodLog.findFirst({
      where: { userId, isPeriodStart: true },
      orderBy: { logDate: 'desc' },
      select: { logDate: true },
    });
    if (latestLog) return latestLog.logDate;
    const profile = await this.prisma.cycleProfile.findUnique({
      where: { userId },
      select: { lastPeriodStart: true },
    });
    return profile?.lastPeriodStart ?? null;
  }

  async getToday(clerkId: string): Promise<IBloomToday> {
    const userId = await this.resolveUserId(clerkId);
    const profile = await this.prisma.cycleProfile.findUnique({ where: { userId } });

    if (!profile) {
      return {
        cycleDay: null,
        phase: null,
        nextPeriodStart: null,
        nextPeriodEnd: null,
        predictionWithheld: true,
        predictionReason: 'no-data',
        stage: 'unknown',
      };
    }

    // Count confirmed cycle starts (used for prediction confidence). For now
    // we count distinct period_logs flagged isPeriodStart.
    const loggedCycleCount = await this.prisma.periodLog.count({
      where: { userId, isPeriodStart: true },
    });

    const lastPeriodStart = await this.effectiveLastPeriodStart(userId);

    return computeToday({
      lastPeriodStart,
      averageCycleDays: profile.averageCycleDays,
      stage: profile.stage as TCycleStage,
      loggedCycleCount,
    });
  }

  // ── PeriodLog ─────────────────────────────────────────────────────────────

  /**
   * Validates `IPeriodLogPayload` shape — whitelist enums, numeric ranges.
   * Raises BadRequestException on first invalid field.
   */
  private validatePayload(p: any): IPeriodLogPayload {
    if (p == null || typeof p !== 'object') return {};
    const out: IPeriodLogPayload = {};

    if (p.mood !== undefined) {
      if (!Array.isArray(p.mood)) throw new BadRequestException('mood must be array');
      const filtered = p.mood.filter((m: any) => VALID_MOOD.includes(m));
      if (filtered.length !== p.mood.length) throw new BadRequestException('Invalid mood tag');
      out.mood = filtered;
    }

    if (p.pain !== undefined) {
      if (!Array.isArray(p.pain)) throw new BadRequestException('pain must be array');
      out.pain = p.pain.map((entry: any) => {
        if (!VALID_REGION.includes(entry.region)) {
          throw new BadRequestException(`Invalid pain region: ${entry.region}`);
        }
        const intensity = Number(entry.intensity);
        if (!Number.isFinite(intensity) || intensity < 0 || intensity > 10) {
          throw new BadRequestException('pain.intensity must be 0..10');
        }
        if (entry.type !== undefined && !VALID_PAIN_TYPE.includes(entry.type)) {
          throw new BadRequestException(`Invalid pain type: ${entry.type}`);
        }
        return {
          region:    entry.region,
          intensity: Math.round(intensity),
          type:      entry.type,
          note:      typeof entry.note === 'string' ? entry.note.slice(0, 200) : undefined,
        };
      });
    }

    if (p.energy !== undefined) {
      const e = Number(p.energy);
      if (![1, 2, 3, 4, 5].includes(e)) throw new BadRequestException('energy must be 1..5');
      out.energy = e as 1 | 2 | 3 | 4 | 5;
    }

    if (p.sleep !== undefined) {
      const hours = Number(p.sleep?.hours);
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        throw new BadRequestException('sleep.hours must be 0..24');
      }
      const quality = p.sleep?.quality;
      if (quality !== undefined && !VALID_SLEEP.includes(quality)) {
        throw new BadRequestException(`Invalid sleep.quality: ${quality}`);
      }
      out.sleep = { hours, quality };
    }

    if (p.digestion !== undefined) {
      if (!Array.isArray(p.digestion)) throw new BadRequestException('digestion must be array');
      const bad = p.digestion.find((t: any) => !VALID_DIGESTION.includes(t));
      if (bad !== undefined) throw new BadRequestException(`Invalid digestion tag: ${bad}`);
      out.digestion = p.digestion;
    }

    if (p.cognition !== undefined) {
      if (!Array.isArray(p.cognition)) throw new BadRequestException('cognition must be array');
      const bad = p.cognition.find((t: any) => !VALID_COGNITION.includes(t));
      if (bad !== undefined) throw new BadRequestException(`Invalid cognition tag: ${bad}`);
      out.cognition = p.cognition;
    }

    if (p.skin !== undefined) {
      if (!Array.isArray(p.skin)) throw new BadRequestException('skin must be array');
      const bad = p.skin.find((t: any) => !VALID_SKIN.includes(t));
      if (bad !== undefined) throw new BadRequestException(`Invalid skin tag: ${bad}`);
      out.skin = p.skin;
    }

    if (p.bbt !== undefined) {
      const t = Number(p.bbt);
      if (!Number.isFinite(t) || t < 35 || t > 40) {
        throw new BadRequestException('bbt must be 35..40 °C');
      }
      out.bbt = Math.round(t * 100) / 100;
    }

    if (p.meds !== undefined) {
      if (!Array.isArray(p.meds)) throw new BadRequestException('meds must be array');
      out.meds = p.meds
        .filter((m: any) => typeof m === 'string')
        .map((m: string) => m.trim().slice(0, 100))
        .filter((m: string) => m.length > 0);
    }

    if (p.intimacy !== undefined) {
      const i = p.intimacy;
      if (typeof i !== 'object' || i == null) {
        throw new BadRequestException('intimacy must be object');
      }
      if (i.protection !== undefined && !VALID_PROTECTION.includes(i.protection)) {
        throw new BadRequestException(`Invalid intimacy.protection: ${i.protection}`);
      }
      if (i.libido !== undefined && !VALID_LIBIDO.includes(i.libido)) {
        throw new BadRequestException(`Invalid intimacy.libido: ${i.libido}`);
      }
      if (i.orgasm !== undefined && !['none', 'one', 'multiple'].includes(i.orgasm)) {
        throw new BadRequestException(`Invalid intimacy.orgasm: ${i.orgasm}`);
      }
      out.intimacy = {
        occurred:   Boolean(i.occurred),
        protection: i.protection,
        libido:     i.libido,
        orgasm:     i.orgasm,
        note:       typeof i.note === 'string' ? i.note.slice(0, 200) : undefined,
      };
    }

    return out;
  }

  /**
   * Returns YYYY-MM-DD UTC midnight Date for a parsed input. Throws on invalid.
   * `allowFuture` calendar range fetchleri için true (kullanıcı gelecek günleri
   * görsel olarak görmek isteyebilir; ama LOG yazamaz).
   */
  private parseDateString(value: any, opts: { allowFuture?: boolean } = {}): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Date must be YYYY-MM-DD');
    }
    const d = new Date(`${value}T00:00:00.000Z`);
    if (isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    if (!opts.allowFuture && d.getTime() > Date.now() + 24 * 3600 * 1000) {
      throw new BadRequestException('Date cannot be in the future');
    }
    return d;
  }

  /** Backward-compat wrapper for log endpoints (writes — future not allowed). */
  private parseLogDate(value: any): Date {
    return this.parseDateString(value, { allowFuture: false });
  }

  /**
   * POST /bloom/log (and PATCH same endpoint behavior) — upsert today's or
   * past day's log. Validates payload + flow, sanitizes notes.
   *
   * Note: This does NOT touch `cycleProfile.lastPeriodStart`. The "effective"
   * last period start is derived on-read via `effectiveLastPeriodStart()` —
   * it picks the most recent `isPeriodStart=true` log first, falling back to
   * the profile field set during onboarding. This keeps period_logs as the
   * single source of truth and makes mark/unmark fully reversible.
   */
  async upsertLog(
    clerkId: string,
    input: {
      logDate: string;
      flow?: TFlow | null;
      isPeriodStart?: boolean;
      isPeriodEnd?: boolean;
      notes?: string | null;
      payload?: any;
    },
  ) {
    const userId = await this.resolveUserId(clerkId);
    const logDate = this.parseLogDate(input.logDate);

    if (input.flow != null && !VALID_FLOW.includes(input.flow)) {
      throw new BadRequestException(`Invalid flow: ${input.flow}`);
    }

    const notes =
      input.notes == null
        ? null
        : String(input.notes).slice(0, MAX_NOTES_LEN);

    const isPeriodStart = Boolean(input.isPeriodStart);
    const isPeriodEnd = Boolean(input.isPeriodEnd);
    const validatedPayload = this.validatePayload(input.payload);

    const log = await this.prisma.periodLog.upsert({
      where:  { userId_logDate: { userId, logDate } },
      create: {
        userId,
        logDate,
        flow: input.flow ?? null,
        isPeriodStart,
        isPeriodEnd,
        notes,
        payload: validatedPayload as any,
      },
      update: {
        flow:          input.flow !== undefined ? input.flow : undefined,
        isPeriodStart: input.isPeriodStart !== undefined ? isPeriodStart : undefined,
        isPeriodEnd:   input.isPeriodEnd !== undefined ? isPeriodEnd : undefined,
        notes:         input.notes !== undefined ? notes : undefined,
        payload:       input.payload !== undefined ? (validatedPayload as any) : undefined,
      },
    });

    return log;
  }

  /**
   * POST /bloom/log/:date/unmark-period-start — clears `isPeriodStart` flag.
   * If the log row has no other content (flow/notes/payload) we delete it
   * outright; otherwise we just flip the flag.
   *
   * No `cycleProfile.lastPeriodStart` rollback here: the effective value is
   * derived from `period_logs` on-read, so removing the log is enough — the
   * cycle predictor automatically falls back to the next most recent log,
   * or the onboarding seed value if there are none.
   */
  async unmarkPeriodStart(clerkId: string, dateIso: string) {
    const userId = await this.resolveUserId(clerkId);
    const logDate = this.parseLogDate(dateIso);

    const existing = await this.prisma.periodLog.findUnique({
      where: { userId_logDate: { userId, logDate } },
    });
    if (!existing || !existing.isPeriodStart) {
      return { ok: true };
    }

    const isEmptyAfterUnmark =
      (existing.flow == null || existing.flow === 'none') &&
      !existing.notes &&
      !existing.isPeriodEnd &&
      (!existing.payload ||
        Object.keys(existing.payload as Record<string, unknown>).length === 0);

    if (isEmptyAfterUnmark) {
      await this.prisma.periodLog.delete({
        where: { userId_logDate: { userId, logDate } },
      });
    } else {
      await this.prisma.periodLog.update({
        where: { userId_logDate: { userId, logDate } },
        data: { isPeriodStart: false },
      });
    }

    return { ok: true };
  }

  /**
   * POST /bloom/log/:date/unmark-period-end — clears `isPeriodEnd` flag.
   * Mirror of `unmarkPeriodStart`. If the log row has no other content we
   * delete it outright; otherwise we flip just the end flag. Cycle predictor
   * derives the effective period end on-read from the most recent start log,
   * so removing an end flag is fully reversible (period bar falls back to
   * the 5-day visual fallback).
   */
  async unmarkPeriodEnd(clerkId: string, dateIso: string) {
    const userId = await this.resolveUserId(clerkId);
    const logDate = this.parseLogDate(dateIso);

    const existing = await this.prisma.periodLog.findUnique({
      where: { userId_logDate: { userId, logDate } },
    });
    if (!existing || !existing.isPeriodEnd) {
      return { ok: true };
    }

    const isEmptyAfterUnmark =
      (existing.flow == null || existing.flow === 'none') &&
      !existing.notes &&
      !existing.isPeriodStart &&
      (!existing.payload ||
        Object.keys(existing.payload as Record<string, unknown>).length === 0);

    if (isEmptyAfterUnmark) {
      await this.prisma.periodLog.delete({
        where: { userId_logDate: { userId, logDate } },
      });
    } else {
      await this.prisma.periodLog.update({
        where: { userId_logDate: { userId, logDate } },
        data: { isPeriodEnd: false },
      });
    }

    return { ok: true };
  }

  /**
   * GET /bloom/log/:date — returns single day or null.
   */
  async getLogByDate(clerkId: string, dateIso: string) {
    const userId = await this.resolveUserId(clerkId);
    const logDate = this.parseLogDate(dateIso);
    return this.prisma.periodLog.findUnique({
      where: { userId_logDate: { userId, logDate } },
    });
  }

  /**
   * DELETE /bloom/log/:date — clears a day's log entirely.
   * Note: this does NOT roll back `cycleProfile.lastPeriodStart`. If the
   * user wants to undo a "period started" mark, they edit the profile via
   * the Edit setup flow.
   */
  async deleteLog(clerkId: string, dateIso: string) {
    const userId = await this.resolveUserId(clerkId);
    const logDate = this.parseLogDate(dateIso);
    await this.prisma.periodLog
      .delete({ where: { userId_logDate: { userId, logDate } } })
      .catch(() => null); // 404 → idempotent no-op
    return { ok: true };
  }

  /**
   * GET /bloom/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD — compact entries for
   * the calendar UI to color days. Range capped at 1 year to keep payloads small.
   */
  async getCalendarRange(
    clerkId: string,
    fromIso: string,
    toIso: string,
  ): Promise<IBloomCalendarEntry[]> {
    const userId = await this.resolveUserId(clerkId);
    const from = this.parseDateString(fromIso, { allowFuture: true });
    const to = this.parseDateString(toIso, { allowFuture: true });
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be after from');
    }
    const days = Math.floor((to.getTime() - from.getTime()) / (24 * 3600 * 1000));
    if (days > MAX_LOG_RANGE_DAYS) {
      throw new BadRequestException(`range too wide (max ${MAX_LOG_RANGE_DAYS} days)`);
    }

    const logs = await this.prisma.periodLog.findMany({
      where: {
        userId,
        logDate: { gte: from, lte: to },
      },
      orderBy: { logDate: 'asc' },
      select: {
        logDate: true,
        flow: true,
        isPeriodStart: true,
        isPeriodEnd: true,
        payload: true,
      },
    });

    return logs.map((l) => {
      const p = l.payload as Record<string, unknown> | null;
      const hasPayload = Boolean(p && Object.keys(p).length > 0);
      return {
        logDate: l.logDate.toISOString().slice(0, 10),
        flow: (l.flow as TFlow | null) ?? null,
        isPeriodStart: l.isPeriodStart,
        isPeriodEnd: l.isPeriodEnd,
        hasPayload,
      };
    });
  }
}
