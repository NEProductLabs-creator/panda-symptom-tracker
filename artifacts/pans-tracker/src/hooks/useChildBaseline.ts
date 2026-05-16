import { useState, useCallback } from 'react';
import { ChildBaseline } from '@/lib/types';
import { storage } from '@/lib/storage';

export function useChildBaseline() {
  const [baseline, setBaseline] = useState<ChildBaseline | null>(
    () => storage.getChildBaseline()
  );

  const saveBaseline = useCallback((data: ChildBaseline) => {
    storage.saveChildBaseline(data);
    setBaseline(data);
  }, []);

  const clearBaseline = useCallback(() => {
    storage.clearChildBaseline();
    setBaseline(null);
  }, []);

  return { baseline, saveBaseline, clearBaseline };
}
