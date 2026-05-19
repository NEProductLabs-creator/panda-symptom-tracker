import { useState, useCallback } from 'react';
import { ChildBaseline } from '@/lib/types';
import { storage } from '@/lib/storage';
import { DEMO_BASELINE } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

export function useChildBaseline() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';

  const [baseline, setBaseline] = useState<ChildBaseline | null>(() =>
    isDemoMode ? DEMO_BASELINE : storage.getChildBaseline(),
  );

  const saveBaseline = useCallback(
    (data: ChildBaseline) => {
      if (isDemoMode) return;
      storage.saveChildBaseline(data);
      setBaseline(data);
    },
    [isDemoMode],
  );

  const clearBaseline = useCallback(() => {
    if (isDemoMode) return;
    storage.clearChildBaseline();
    setBaseline(null);
  }, [isDemoMode]);

  return { baseline, saveBaseline, clearBaseline };
}
