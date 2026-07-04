// Global priority weights — the app's single most important piece of state.
// Changing a weight anywhere (Onboarding, Search, Settings) re-ranks Search and
// re-computes Compare instantly. Kept in Context so every screen shares it.

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_WEIGHTS, type IndicatorKey, type Weights } from "@/lib/model";

type WeightsContextValue = {
  weights: Weights;
  setWeight: (key: IndicatorKey, value: number) => void;
  budget: number;
  setBudget: (value: number) => void;
};

const WeightsContext = createContext<WeightsContextValue | null>(null);

export function WeightsProvider({ children }: { children: ReactNode }) {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [budget, setBudget] = useState(320000);

  const value = useMemo<WeightsContextValue>(
    () => ({
      weights,
      setWeight: (key, v) => setWeights((w) => ({ ...w, [key]: v })),
      budget,
      setBudget,
    }),
    [weights, budget],
  );

  return <WeightsContext value={value}>{children}</WeightsContext>;
}

export function useWeights(): WeightsContextValue {
  const ctx = use(WeightsContext);
  if (!ctx) throw new Error("useWeights must be used within WeightsProvider");
  return ctx;
}
