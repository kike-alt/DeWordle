"use client";

import { useEffect } from "react";
import { pushToast } from "@/store/useToastStore";

const SESSION_STORAGE_KEY = "dewordle_offline_session";

export function SessionRecoveryToast() {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const stored: unknown = JSON.parse(raw);
      if (!stored || typeof stored !== "object") return;
      const session = stored as { status?: unknown; guesses?: unknown };
      if (
        session.status !== "active" ||
        !Array.isArray(session.guesses) ||
        session.guesses.length === 0
      ) {
        return;
      }

      pushToast(
        `Resumed previous session: ${session.guesses.length} guesses restored`,
        { durationMs: 4000 },
      );
    } catch {
      // Ignore unavailable or malformed local session storage.
    }
  }, []);

  return null;
}
