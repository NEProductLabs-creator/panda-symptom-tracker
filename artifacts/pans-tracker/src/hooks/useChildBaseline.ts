import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { ChildBaseline } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { DEMO_BASELINE } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

export function useChildBaseline() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [baseline, setBaseline] = useState<ChildBaseline | null>(() =>
    isDemoMode ? DEMO_BASELINE : storage.getChildBaseline(),
  );

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.baseline.get()
      .then((serverBaseline) => {
        if (serverBaseline) {
          storage.saveChildBaseline(serverBaseline);
          setBaseline(serverBaseline);
        } else {
          const local = storage.getChildBaseline();
          if (local) api.baseline.save(local).catch(() => {});
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBaseline = useCallback(
    (data: ChildBaseline) => {
      if (isDemoMode) return;
      storage.saveChildBaseline(data);
      setBaseline(data);
      api.baseline.save(data).catch(() => {});
    },
    [isDemoMode, api],
  );

  const clearBaseline = useCallback(() => {
    if (isDemoMode) return;
    storage.clearChildBaseline();
    setBaseline(null);
  }, [isDemoMode]);

  return { baseline, saveBaseline, clearBaseline };
}
