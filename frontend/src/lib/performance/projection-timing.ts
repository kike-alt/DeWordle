export interface ProjectionTimingEntry {
  /** Identifies which projection was fetched (e.g. "session", "dayConfig") */
  key: string;
  /** Wall-clock duration in milliseconds */
  durationMs: number;
  /** Whether the fetch resolved successfully */
  success: boolean;
  /** ISO timestamp of when the fetch completed */
  completedAt: string;
}

export type ProjectionTimingObserver = (entry: ProjectionTimingEntry) => void;

const observers = new Set<ProjectionTimingObserver>();

/**
 * Register a callback that receives a timing entry after every projection
 * fetch. Returns a cleanup function — call it to unsubscribe.
 *
 * @example
 * const unsubscribe = onProjectionTiming((e) => console.log(e));
 * // later:
 * unsubscribe();
 */
export function onProjectionTiming(cb: ProjectionTimingObserver): () => void {
  observers.add(cb);
  return () => observers.delete(cb);
}

function emit(entry: ProjectionTimingEntry): void {
  observers.forEach((cb) => cb(entry));
}

/**
 * Wraps an async projection fetch and records its wall-clock latency.
 * Notifies all registered observers via {@link onProjectionTiming}.
 *
 * @example
 * const data = await measureProjectionFetch("session", () => fetchSession(id));
 */
export async function measureProjectionFetch<T>(
  key: string,
  fetch: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  let success = false;
  try {
    const result = await fetch();
    success = true;
    return result;
  } finally {
    emit({
      key,
      durationMs: Math.round(performance.now() - start),
      success,
      completedAt: new Date().toISOString(),
    });
  }
}
