"use client";
// Contract pause banner polling and wallet connection retry. Closes #1601, #1602.
import { useCallback, useEffect, useState } from "react";

// `fetchIsPaused` calls `is_paused` on the core_game contract.
export function useContractPaused(fetchIsPaused: () => Promise<boolean>, intervalMs = 15000) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const value = await fetchIsPaused();
        if (!cancelled) setPaused(value);
      } catch {
        // Keep the last known state if the read fails.
      }
    };
    void check();
    const id = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchIsPaused, intervalMs]);

  return paused;
}

export const PAUSED_MESSAGE = "The game is temporarily paused for maintenance. New sessions and guesses are disabled.";

// Re-runs the handshake from the error toast without reopening the connection modal.
export function useConnectionRetry(connect: () => Promise<void>, maxAttempts = 3) {
  const [attempts, setAttempts] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const retry = useCallback(async () => {
    if (retrying || attempts >= maxAttempts) return false;
    setRetrying(true);
    setAttempts((n) => n + 1);
    try {
      await connect();
      setAttempts(0);
      return true;
    } catch {
      return false;
    } finally {
      setRetrying(false);
    }
  }, [connect, retrying, attempts, maxAttempts]);

  return { retry, retrying, attempts, canRetry: attempts < maxAttempts };
}
