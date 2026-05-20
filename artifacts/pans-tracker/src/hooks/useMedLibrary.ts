import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { MedLibraryItem } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { DEMO_MED_LIBRARY } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedLibrary() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [medLibrary, setMedLibrary] = useState<MedLibraryItem[]>(() =>
    isDemoMode ? DEMO_MED_LIBRARY : storage.getMedLibrary(),
  );

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.medLibrary.getAll()
      .then((serverItems) => {
        if (serverItems.length > 0) {
          storage.saveMedLibrary(serverItems);
          setMedLibrary(serverItems);
        } else {
          const local = storage.getMedLibrary();
          if (local.length > 0) {
            local.forEach((item) => api.medLibrary.save(item).catch(() => {}));
          }
        }
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMedLibraryItem = useCallback(
    (item: MedLibraryItem) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedLibrary((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === item.id);
        const next =
          existingIdx >= 0
            ? prev.map((m, i) => (i === existingIdx ? item : m))
            : [...prev, item];
        storage.saveMedLibrary(next);
        return next;
      });
      api.medLibrary.save(item).catch(() => {});
    },
    [isDemoMode, api],
  );

  const deleteMedLibraryItem = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedLibrary((prev) => {
        const next = prev.filter((m) => m.id !== id);
        storage.saveMedLibrary(next);
        return next;
      });
      api.medLibrary.delete(id).catch(() => {});
    },
    [isDemoMode, api],
  );

  return { medLibrary, saveMedLibraryItem, deleteMedLibraryItem };
}
