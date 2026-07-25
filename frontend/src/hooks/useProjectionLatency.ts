"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  onProjectionTiming,
  type ProjectionTimingEntry,
} from "@/lib/performance/projection-timing";

export interface ProjectionLatencyState {
  /** Latest timing entry received, or null before the first fetch */
  latest: ProjectionTimingEntry | null;
  /** Rolling average duration in ms across all observed fetches */
  averageDurationMs: number | null;
  /** Total number of fetch timing entries observed in this mount lifetime */
  sampleCount: number;
}

/**
 * Subscribes to projection fetch timing events and exposes latency stats.
 * Decoupled from the tx lifecycle — subscribe this hook in any component that
 * needs to observe or surface read-model fetch performance.
 *
 * @param filter Optional key prefix to restrict which projections are tracked
 *               (e.g. "session" matches "session", "session:123", etc.)
 *
 * @example
 * function SessionDebug() {
 *   const { latest, averageDurationMs } = useProjectionLatency("session");
 *   return <span>{averageDurationMs ?? "—"}ms avg</span>;
 * }
 */
export function useProjectionLatency(
  filter?: string,
): ProjectionLatencyState {
  const [latest, setLatest] = useState<ProjectionTimingEntry | null>(null);
  const totalRef = useRef(0);
  const countRef = useRef(0);
  const [averageDurationMs, setAverageDurationMs] = useState<number | null>(null);
  const [sampleCount, setSampleCount] = useState(0);

  const handleEntry = useCallback(
    (entry: ProjectionTimingEntry) => {
      if (filter && !entry.key.startsWith(filter)) return;

      setLatest(entry);

      totalRef.current += entry.durationMs;
      countRef.current += 1;
      setAverageDurationMs(Math.round(totalRef.current / countRef.current));
      setSampleCount(countRef.current);
    },
    [filter],
  );

  useEffect(() => {
    return onProjectionTiming(handleEntry);
  }, [handleEntry]);

  return { latest, averageDurationMs, sampleCount };
}
