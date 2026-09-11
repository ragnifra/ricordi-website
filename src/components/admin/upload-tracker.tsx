"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Tracks whether any image picker on the page still has work in flight, so the
// form's submit button can wait for it.
//
// A product form can hold several pickers at once — the shared set plus one per
// selected size — and each owns its own upload state. Submitting while an
// upload is still running would save the product with that photo missing, which
// is the kind of quiet data loss this whole change exists to remove.

type UploadTracker = {
  busy: boolean;
  setPickerBusy: (id: string, busy: boolean) => void;
};

const NOOP_TRACKER: UploadTracker = { busy: false, setPickerBusy: () => {} };

const UploadTrackerContext = createContext<UploadTracker | null>(null);

export function UploadTrackerProvider({ children }: { children: ReactNode }) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());

  const setPickerBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((prev) => {
      if (busy === prev.has(id)) return prev;
      const next = new Set(prev);
      if (busy) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const value = useMemo<UploadTracker>(
    () => ({ busy: busyIds.size > 0, setPickerBusy }),
    [busyIds, setPickerBusy]
  );

  return <UploadTrackerContext.Provider value={value}>{children}</UploadTrackerContext.Provider>;
}

// Falls back to a no-op so a picker rendered outside a provider still works —
// it just cannot block anything.
export function useUploadTracker(): UploadTracker {
  return useContext(UploadTrackerContext) ?? NOOP_TRACKER;
}
