"use client";
// Pre-flight fee estimate and RPC confirmation countdown. Closes #1593, #1594.
import { useCallback, useEffect, useState } from "react";

const STROOPS_PER_XLM = 10_000_000;

// Converts a simulated min resource fee (stroops) to a readable XLM string.
export const stroopsToXlm = (stroops: number | string | bigint) =>
  (Number(stroops) / STROOPS_PER_XLM).toFixed(7).replace(/0+$/, "").replace(/\.$/, ".0");

// `simulate` wraps the Soroban RPC simulation call and returns the min resource fee in stroops.
export function useFeeEstimate(simulate: () => Promise<string | number | bigint>) {
  const [state, setState] = useState<{ xlm: string | null; loading: boolean; error: string | null }>({
    xlm: null,
    loading: false,
    error: null,
  });

  const estimate = useCallback(async () => {
    setState({ xlm: null, loading: true, error: null });
    try {
      setState({ xlm: stroopsToXlm(await simulate()), loading: false, error: null });
    } catch (e) {
      setState({ xlm: null, loading: false, error: e instanceof Error ? e.message : "Estimate unavailable" });
    }
  }, [simulate]);

  return { ...state, estimate };
}

// Counts down the seconds left before the RPC timeout while a transaction is pending.
export function useTxCountdown(active: boolean, timeoutSeconds = 30) {
  const [remaining, setRemaining] = useState(timeoutSeconds);

  useEffect(() => {
    if (!active) {
      setRemaining(timeoutSeconds);
      return;
    }
    const id = setInterval(() => setRemaining((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [active, timeoutSeconds]);

  return { remaining, timedOut: active && remaining === 0, progress: remaining / timeoutSeconds };
}
