import { useState, useCallback } from 'react';
import { TriggerEntry } from '@/lib/types';
import { storage } from '@/lib/storage';

export function useTriggerLog() {
  const [entries, setEntries] = useState<TriggerEntry[]>(() =>
    storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date))
  );

  const addEntry = useCallback((entry: TriggerEntry) => {
    storage.addTriggerEntry(entry);
    setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    storage.deleteTriggerEntry(id);
    setEntries(storage.getTriggerLog().sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  return { entries, addEntry, deleteEntry };
}
