import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/expo';
import type { IBloomToday, ICycleProfile } from '@ai-therapist/types';
import { fetchToday } from '../lib/api';
import { computeToday } from '../lib/cycle-calculator';
import { useCurrentDate } from './use-current-date';

/**
 * Today payload — first paint comes from the local calculator (using the cached
 * profile), then the backend authoritative value replaces it. Avoids a flash of
 * a "Loading…" spinner while the network resolves on every tab focus.
 */
export function useToday(profile: ICycleProfile | null) {
  const { user } = useUser();
  const currentDate = useCurrentDate();
  const [serverToday, setServerToday] = useState<IBloomToday | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localToday = useMemo<IBloomToday | null>(() => {
    if (!profile) return null;
    return computeToday({
      lastPeriodStart: profile.lastPeriodStart ? new Date(profile.lastPeriodStart) : null,
      averageCycleDays: profile.averageCycleDays,
      stage: profile.stage,
      today: currentDate,
    });
  }, [profile, currentDate]);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const t = await fetchToday({ clerkUserId: user.id });
      setServerToday(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch-failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (profile) void reload();
    // currentDate dependency: gece yarısı geçince server'dan da taze veri al
  }, [profile, reload, currentDate]);

  // Önce localToday — "bugün" cihazın yerel tarihinden okunur. Server payload'ı
  // yardımcı (`predictionWithheld` reason, prediction range, vb.) ama "bugün"
  // tarihinin sahibi her zaman cihaz. Aksi halde server timezone'u (UTC) ile
  // kullanıcı TZ'i (TR = UTC+3) çakışırsa gece yarısı kullanıcı "dünde" kalır.
  const today = localToday
    ? { ...(serverToday ?? {}), ...localToday }
    : serverToday;

  return {
    today,
    loading,
    error,
    reload,
  };
}
