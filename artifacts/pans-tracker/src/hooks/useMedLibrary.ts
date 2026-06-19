import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { MedLibraryItem } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { queueMutation } from '@/lib/apiQueue';
import { useToast } from '@/hooks/use-toast';
import { DEMO_MED_LIBRARY, DEMO_EXPLORING_MED_LIBRARY, DEMO_IN_CRISIS_MED_LIBRARY } from '@/lib/demoData';
import { DEMO_KEY, DEMO_SCENARIO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedLibrary() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [medLibrary, setMedLibrary] = useState<MedLibraryItem[]>(() => {
    if (!isDemoMode) return storage.getMedLibrary();
    const scenario = localStorage.getItem(DEMO_SCENARIO_KEY);
    if (scenario === 'exploring') return DEMO_EXPLORING_MED_LIBRARY;
    if (scenario === 'in_crisis') return DEMO_IN_CRISIS_MED_LIBRARY;
    return DEMO_MED_LIBRARY;
  });

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.medLibrary.getAll()
      .then((serverItems) => {
        const local = storage.getMedLibrary();
        const { merged, localOnly } = mergeById(local, serverItems);
        storage.saveMedLibrary(merged);
        setMedLibrary(merged);
        localOnly.forEach((item) => {
          queueMutation('POST', '/medlibrary', item, getToken, toast);
        });
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMedLibraryItem = useCallback(
    (item: MedLibraryItem) => {
      if (isDemoMode) { dispatchDemo(); return; }
      const stamped: MedLibraryItem = { ...item, updatedAt: now() };
      setMedLibrary((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === stamped.id);
        const next =
          existingIdx >= 0
            ? prev.map((m, i) => (i === existingIdx ? stamped : m))
            : [...prev, stamped];
        storage.saveMedLibrary(next);
        return next;
      });
      queueMutation('POST', '/medlibrary', stamped, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  const deleteMedLibraryItem = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedLibrary((prev) => {
        const next = prev.filter((m) => m.id !== id);
        storage.saveMedLibrary(next);
        return next;
      });
      queueMutation('DELETE', `/medlibrary/${id}`, undefined, getToken, toast);
    },
    [isDemoMode, getToken, toast],
  );

  return { medLibrary, saveMedLibraryItem, deleteMedLibraryItem };
}
