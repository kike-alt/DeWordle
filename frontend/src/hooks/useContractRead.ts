"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DayConfig, Session } from "@dewordle/soroban-sdk";
import { CoreGameClient, NETWORKS, loadContractRegistry } from "@dewordle/soroban-sdk";
import { diagnoseRegistryMismatch, formatRegistryMismatchDiagnostics } from "@dewordle/soroban-sdk";
import type { StellarNetwork } from "@/lib/stellar/network";
import { measureProjectionFetch } from "@/lib/performance/projection-timing";

interface ReadState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useReadState<T>(): [ReadState<T>, (data: T | null, error?: string) => void] {
  const [state, setState] = useState<ReadState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const set = useCallback((data: T | null, error?: string) => {
    setState({ data, loading: false, error: error ?? null });
  }, []);

  return [state, set];
}

function useClient(network: StellarNetwork) {
  const clientRef = useRef<CoreGameClient | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadContractRegistry(network)
      .then((registry: Parameters<typeof CoreGameClient.fromRegistry>[1]) => {
        if (!cancelled) {
          clientRef.current = CoreGameClient.fromRegistry(NETWORKS[network], registry);
          setReady(true);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Registry not available";
        const diagnostics = diagnoseRegistryMismatch({
          expectedNetwork: network,
          actualNetwork: message.includes("mismatch") ? "unknown" : undefined,
        });
        setReady(false);
        // Keep the hook resilient: consumers get null data and a descriptive error path.
        if (diagnostics) {
          console.warn(formatRegistryMismatchDiagnostics(diagnostics));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [network]);

  return { client: clientRef.current, ready };
}

/**
 * Read a day config from the core_game contract.
 * Uses registry/network config — no hardcoded contract IDs.
 */
export function useDayConfig(dayId: number | null, network: StellarNetwork = "testnet") {
  const { client, ready } = useClient(network);
  const [state, set] = useReadState<DayConfig>();

  useEffect(() => {
    if (!ready || !client || dayId === null) return;

    let cancelled = false;
    set(null);

    measureProjectionFetch<DayConfig | null>(`dayConfig:${dayId}`, () => client.getDayConfig(dayId))
      .then((data: DayConfig | null) => {
        if (!cancelled) set(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          set(null, err instanceof Error ? err.message : "Failed to load day config");
      });

    return () => {
      cancelled = true;
    };
  }, [client, ready, dayId, set]);

  return state;
}

/**
 * Read a session from the core_game contract by session ID.
 */
export function useSession(sessionId: string | null, network: StellarNetwork = "testnet") {
  const { client, ready } = useClient(network);
  const [state, set] = useReadState<Session>();

  useEffect(() => {
    if (!ready || !client || !sessionId) return;

    let cancelled = false;
    set(null);

    measureProjectionFetch<Session | null>(`session:${sessionId}`, () => client.getSession(sessionId))
      .then((data: Session | null) => {
        if (!cancelled) set(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          set(null, err instanceof Error ? err.message : "Failed to load session");
      });

    return () => {
      cancelled = true;
    };
  }, [client, ready, sessionId, set]);

  return state;
}
