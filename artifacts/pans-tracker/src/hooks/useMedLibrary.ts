import { useState, useEffect, useCallback } from 'react';
import { MedLibraryItem } from '@/lib/types';
import { storage } from '@/lib/storage';

export function useMedLibrary() {
  const [medLibrary, setMedLibrary] = useState<MedLibraryItem[]>([]);

  useEffect(() => {
    setMedLibrary(storage.getMedLibrary());
  }, []);

  const saveMedLibraryItem = useCallback((item: MedLibraryItem) => {
    setMedLibrary(prev => {
      const existingIdx = prev.findIndex(m => m.id === item.id);
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
  }, []);

  const deleteMedLibraryItem = useCallback((id: string) => {
    setMedLibrary(prev => {
      const next = prev.filter(m => m.id !== id);
      storage.saveMedLibrary(next);
      return next;
    });
  }, []);

  return { medLibrary, saveMedLibraryItem, deleteMedLibraryItem };
}
