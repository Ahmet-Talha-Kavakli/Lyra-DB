import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/expo';
import type { ICycleProfile } from '@ai-therapist/types';
import { fetchCycleProfile, upsertCycleProfile, type UpsertProfileInput } from '../lib/api';

export function useCycleProfile() {
  const { user } = useUser();
  const [profile, setProfile] = useState<ICycleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchCycleProfile({ clerkUserId: user.id });
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch-failed');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (input: UpsertProfileInput): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        const p = await upsertCycleProfile({ clerkUserId: user.id }, input);
        setProfile(p);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'save-failed');
        return false;
      }
    },
    [user?.id],
  );

  return { profile, loading, error, reload, save };
}
