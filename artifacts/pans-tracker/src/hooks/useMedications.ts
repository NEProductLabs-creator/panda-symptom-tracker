import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import { Medication, MissedDose } from '@/lib/types';
import { storage } from '@/lib/storage';
import { createApiClient } from '@/lib/api';
import { mergeById, now } from '@/lib/syncUtils';
import { useToast } from '@/hooks/use-toast';
import { DEMO_MEDICATIONS } from '@/lib/demoData';
import { DEMO_KEY } from '@/contexts/DemoContext';

const dispatchDemo = () => window.dispatchEvent(new CustomEvent('pans:demo:save'));

export function useMedications() {
  const isDemoMode = localStorage.getItem(DEMO_KEY) === '1';
  const { userId, getToken } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const { toast } = useToast();

  const [medications, setMedications] = useState<Medication[]>(() =>
    isDemoMode ? DEMO_MEDICATIONS : storage.getMedications(),
  );

  useEffect(() => {
    if (!userId || isDemoMode) return;
    api.medications.getAll()
      .then((serverMeds) => {
        const local = storage.getMedications();
        const { merged, localOnly } = mergeById(local, serverMeds);
        storage.saveMedications(merged);
        setMedications(merged);
        let syncToastShown = false;
        localOnly.forEach((m) =>
          api.medications.save(m).catch(() => {
            if (!syncToastShown) {
              syncToastShown = true;
              toast({ title: 'Saved offline', description: 'Some medications are saved locally and will sync when connection is restored.' });
            }
          }),
        );
      })
      .catch(() => {});
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMedication = useCallback(
    (med: Medication) => {
      if (isDemoMode) { dispatchDemo(); return; }
      const stamped: Medication = { ...med, updatedAt: now() };
      setMedications((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === stamped.id);
        const next =
          existingIdx >= 0
            ? prev.map((m, i) => (i === existingIdx ? stamped : m))
            : [...prev, stamped];
        storage.saveMedications(next);
        return next;
      });
      api.medications.save(stamped).catch(() => {
        toast({ title: 'Saved offline', description: 'Your medication change is saved locally and will sync later.' });
      });
    },
    [isDemoMode, api, toast],
  );

  const deleteMedication = useCallback(
    (id: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.filter((m) => m.id !== id);
        storage.saveMedications(next);
        return next;
      });
      api.medications.delete(id).catch(() => {
        toast({ title: 'Delete may not have synced', description: 'The deletion was applied locally but could not reach the server.' });
      });
    },
    [isDemoMode, api, toast],
  );

  const addMissedDose = useCallback(
    (medId: string, missed: MissedDose) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: [...(m.missedDoses ?? []), missed], updatedAt: now() }
            : m,
        );
        storage.saveMedications(next);
        const updated = next.find((m) => m.id === medId);
        if (updated) {
          api.medications.save(updated).catch(() => {
            toast({ title: 'Saved offline', description: 'Missed dose is saved locally and will sync later.' });
          });
        }
        return next;
      });
    },
    [isDemoMode, api, toast],
  );

  const deleteMissedDose = useCallback(
    (medId: string, doseId: string) => {
      if (isDemoMode) { dispatchDemo(); return; }
      setMedications((prev) => {
        const next = prev.map((m) =>
          m.id === medId
            ? { ...m, missedDoses: (m.missedDoses ?? []).filter((d) => d.id !== doseId), updatedAt: now() }
            : m,
        );
        storage.saveMedications(next);
        const updated = next.find((m) => m.id === medId);
        if (updated) {
          api.medications.save(updated).catch(() => {
            toast({ title: 'Saved offline', description: 'Missed dose removal is saved locally and will sync later.' });
          });
        }
        return next;
      });
    },
    [isDemoMode, api, toast],
  );

  return { medications, addMedication, deleteMedication, addMissedDose, deleteMissedDose };
}
