import { useState, useCallback } from 'react';
import { MedLibraryItem } from '@/lib/types';
import { storage } from '@/lib/storage';
import { DEMO_MED_LIBRARY } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedLibrary() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';

  const [medLibrary, setMedLibrary] = useState<MedLibraryItem[]>(() =>
    isDemoMode ? DEMO_MED_LIBRARY : storage.getMedLibrary(),
  );

  const saveMedLibraryItem = useCallback(
    (item: MedLibraryItem) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedLibrary((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === item.id);
        let next;
        if (existingIdx >= 0) {
          next = [...prev];
          next[existingIdx] = item;
        } else {
          next = [...prev, item];
        }
        storage.saveMedLibrary(next);
        return next;
      });
    },
    [isDemoMode],
  );

  const deleteMedLibraryItem = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedLibrary((prev) => {
        const next = prev.filter((m) => m.id !== id);
        storage.saveMedLibrary(next);
        return next;
      });
    },
    [isDemoMode],
  );

  return { medLibrary, saveMedLibraryItem, deleteMedLibraryItem };
}
