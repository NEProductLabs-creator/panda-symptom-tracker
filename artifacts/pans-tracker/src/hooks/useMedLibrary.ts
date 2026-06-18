import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { MedLibraryItem } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { useToast } from '@/hooks/use-toast';
import { DEMO_MED_LIBRARY } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedLibrary() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [medLibrary, setMedLibrary] = useState<MedLibraryItem[]>(() =>
    isDemoMode ? DEMO_MED_LIBRARY : storage.getMedLibrary(),
  );

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.medLibrary.getAll()
      .then((serverItems) => {
        const local = storage.getMedLibrary();
        const { merged, localOnly } = mergeById(local, serverItems);
        storage.saveMedLibrary(merged);
        setMedLibrary(merged);
        let syncToastShown = false;
        localOnly.forEach((item) =>
          api.medLibrary.save(item).catch(() => {
            if (!syncToastShown) {
              syncToastShown = true;
              toast({ title: 'Saved offline', description: 'Some library items are saved locally and will sync when connection is restored.' });
            }
          }),
        );
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
      api.medLibrary.save(stamped).catch(() => {
        toast({ title: 'Saved offline', description: 'Your library change is saved locally and will sync later.' });
      });
    },
    [isDemoMode, api, toast],
  );

  const deleteMedLibraryItem = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedLibrary((prev) => {
        const next = prev.filter((m) => m.id !== id);
        storage.saveMedLibrary(next);
        return next;
      });
      api.medLibrary.delete(id).catch(() => {
        toast({ title: 'Delete may not have synced', description: 'The deletion was applied locally but could not reach the server.' });
      });
    },
    [isDemoMode, api, toast],
  );

  return { medLibrary, saveMedLibraryItem, deleteMedLibraryItem };
}
