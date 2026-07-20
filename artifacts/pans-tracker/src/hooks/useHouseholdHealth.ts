import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { HouseholdIllness } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { DEMO_HOUSEHOLD_HEALTH } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

export function useHouseholdHealth() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [illnesses, setIllnesses] = useState<HouseholdIllness[]>(() => {
    if (isDemoMode) {
      const scenario = (localStorage.getItem(DEMO_SCENARIO_KEY) ?? 'tracking') as keyof typeof DEMO_HOUSEHOLD_HEALTH;
      const data = DEMO_HOUSEHOLD_HEALTH[scenario] ?? [];
      return [...data].sort((a, b) => b.startDate.localeCompare(a.startDate));
    }
    return storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate));
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.household.getAll()
      .then((serverItems) => {
        const local = storage.getHouseholdHealth();
        const { merged, localOnly } = mergeById(local, serverItems);
        const sorted = [...merged].sort((a, b) => b.startDate.localeCompare(a.startDate));
        storage.saveHouseholdHealth(sorted);
        setIllnesses(sorted);
        localOnly.forEach((item) => {
          queueMutation('POST', '/household', item, getToken, toast);
        });
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useHouseholdHealth', error: String(e) });
        toast({ title: 'Could not load latest data. Showing your last saved version.' });
        setLoading(false);
      });
  }, [userId, getToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const handler = () => refetch();
    document.addEventListener('pans:foreground', handler);
    return () => document.removeEventListener('pans:foreground', handler);
  }, [refetch]);

  // Re-sync when scenario changes (demo only).
  useEffect(() => {
    if (!isDemoMode) return;
    const scenario = (localStorage.getItem(DEMO_SCENARIO_KEY) ?? 'tracking') as keyof typeof DEMO_HOUSEHOLD_HEALTH;
    const data = DEMO_HOUSEHOLD_HEALTH[scenario] ?? [];
    setIllnesses([...data].sort((a, b) => b.startDate.localeCompare(a.startDate)));
  }, [isDemoMode]);

  const addIllness = useCallback(
    (illness: HouseholdIllness) => {
      if (isDemoMode) return;
      const stamped: HouseholdIllness = { ...illness, updatedAt: now() };
      storage.addHouseholdIllness(stamped);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      queueMutation('POST', '/household', stamped, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  const deleteIllness = useCallback(
    (id: string) => {
      if (isDemoMode) return;
      storage.deleteHouseholdIllness(id);
      setIllnesses(storage.getHouseholdHealth().sort((a, b) => b.startDate.localeCompare(a.startDate)));
      queueMutation('DELETE', `/household/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  return { illnesses, loading, addIllness, deleteIllness, refetch };
}
