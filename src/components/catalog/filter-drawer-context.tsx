"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type FilterDrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const FilterDrawerContext = createContext<FilterDrawerContextValue | null>(null);

export function FilterDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);

  return <FilterDrawerContext.Provider value={value}>{children}</FilterDrawerContext.Provider>;
}

export function useFilterDrawer() {
  const context = useContext(FilterDrawerContext);
  if (!context) {
    throw new Error("useFilterDrawer must be used within a FilterDrawerProvider");
  }
  return context;
}
