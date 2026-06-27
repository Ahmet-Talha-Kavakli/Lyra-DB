/**
 * useCalendarLogs — calendar UI'a backend log entries'i besler.
 *
 * Strateji:
 *   - İlk mount'ta last 90 + next 30 günlük aralığı çeker (~4 ay)
 *   - Mark/unmark veya manual reload ile yeniden çeker
 *   - Local Set'lerde (`periodStartIso`, `flowDayIso`, `payloadDayIso`)
 *     calendar-data.ts'in hızlı membership check yapabilmesi için tutar
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/expo';
import type { IBloomCalendarEntry } from '@ai-therapist/types';
import {
  fetchCalendarRange,
  unmarkPeriodStart as apiUnmarkPeriodStart,
  unmarkPeriodEnd as apiUnmarkPeriodEnd,
  upsertLog,
  type UpsertLogInput,
} from '../lib/api';

const MS_DAY = 86400000;

function toIso(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export interface CalendarLogsState {
  entries: IBloomCalendarEntry[];
  /** ISO YYYY-MM-DD set'leri — calendar cells fast lookup için */
  periodStartIso: Set<string>;
  /** Kullanıcı tarafından "regl son günü" olarak işaretlenmiş günler */
  periodEndIso: Set<string>;
  /** any flow (none dahil değil) loglanan günler */
  flowDayIso: Set<string>;
  /** payload non-empty günler (UI ek badge için) */
  payloadDayIso: Set<string>;
  loading: boolean;
  error: string | null;
}

export function useCalendarLogs() {
  const { user } = useUser();
  const [entries, setEntries] = useState<IBloomCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const today = new Date();
    const from = new Date(today.getTime() - 90 * MS_DAY);
    const to   = new Date(today.getTime() + 30 * MS_DAY);
    return { from: toIso(from), to: toIso(to) };
  }, []);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarRange(
        { clerkUserId: user.id },
        range.from,
        range.to,
      );
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch-failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id, range.from, range.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const periodStartIso = useMemo(
    () => new Set(entries.filter((e) => e.isPeriodStart).map((e) => e.logDate)),
    [entries],
  );
  const periodEndIso = useMemo(
    () => new Set(entries.filter((e) => e.isPeriodEnd).map((e) => e.logDate)),
    [entries],
  );
  const flowDayIso = useMemo(
    () =>
      new Set(
        entries.filter((e) => e.flow != null && e.flow !== 'none').map((e) => e.logDate),
      ),
    [entries],
  );
  const payloadDayIso = useMemo(
    () => new Set(entries.filter((e) => e.hasPayload).map((e) => e.logDate)),
    [entries],
  );

  const markPeriodStart = useCallback(
    async (date: Date): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await upsertLog(
          { clerkUserId: user.id },
          {
            logDate: toIso(date),
            isPeriodStart: true,
            flow: 'medium',
          },
        );
        await reload();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'mark-failed');
        return false;
      }
    },
    [user?.id, reload],
  );

  const unmarkPeriodStart = useCallback(
    async (date: Date): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await apiUnmarkPeriodStart({ clerkUserId: user.id }, toIso(date));
        await reload();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'unmark-failed');
        return false;
      }
    },
    [user?.id, reload],
  );

  const markPeriodEnd = useCallback(
    async (date: Date): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await upsertLog(
          { clerkUserId: user.id },
          { logDate: toIso(date), isPeriodEnd: true },
        );
        await reload();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'mark-end-failed');
        return false;
      }
    },
    [user?.id, reload],
  );

  const unmarkPeriodEnd = useCallback(
    async (date: Date): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await apiUnmarkPeriodEnd({ clerkUserId: user.id }, toIso(date));
        await reload();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'unmark-end-failed');
        return false;
      }
    },
    [user?.id, reload],
  );

  const writeLog = useCallback(
    async (input: UpsertLogInput): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await upsertLog({ clerkUserId: user.id }, input);
        await reload();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'log-failed');
        return false;
      }
    },
    [user?.id, reload],
  );

  return {
    entries,
    periodStartIso,
    periodEndIso,
    flowDayIso,
    payloadDayIso,
    loading,
    error,
    reload,
    markPeriodStart,
    unmarkPeriodStart,
    markPeriodEnd,
    unmarkPeriodEnd,
    writeLog,
  };
}
