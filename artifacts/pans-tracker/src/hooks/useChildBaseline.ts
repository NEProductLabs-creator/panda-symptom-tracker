import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { ChildBaseline } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeSingleton } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { DEMO_BASELINE, DEMO_EXPLORING_BASELINE, DEMO_IN_CRISIS_BASELINE } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

export function useChildBaseline() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [baseline, setBaseline] = useState<ChildBaseline | null>(() => {
    if (!isDemoMode) return storage.getChildBaseline();
    const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
    if (scenario === 'exploring') return DEMO_EXPLORING_BASELINE;
    if (scenario === 'in_crisis') return DEMO_IN_CRISIS_BASELINE;
    return DEMO_BASELINE;
  });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!userId || isDemoMode) return;
    setLoading(true);
    api.baseline.get()
      .then((serverBaseline) => {
        const local = storage.getChildBaseline();
        const { winner, pushToServer } = mergeSingleton(local, serverBaseline, 'lastUpdated');
        if (winner) {
          storage.saveChildBaseline(winner);
          setBaseline(winner);
        }
        if (pushToServer && winner) {
          queueMutation('PUT', '/baseline', winner, getToken, toast);
        }
        setLoading(false);
      })
      .catch((e) => {
        track('api_fetch_failed', { hook: 'useChildBaseline', error: String(e) });
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

  const saveBaseline = useCallback(
    (data: ChildBaseline) => {
      if (isDemoMode) return;
      storage.saveChildBaseline(data);
      setBaseline(data);
      queueMutation('PUT', '/baseline', data, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  const clearBaseline = useCallback(() => {
    if (isDemoMode) return;
    storage.clearChildBaseline();
    setBaseline(null);
  }, [isDemoMode]);

  return { baseline, loading, saveBaseline, clearBaseline, refetch };
}
