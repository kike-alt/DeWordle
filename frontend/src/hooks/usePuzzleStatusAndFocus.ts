"use client";
// Daily puzzle status badge, 30-day archive list and modal focus trap. Closes #1604, #1605, #1606.
import { RefObject, useEffect } from "react";

export type DailyStatus = "solved" | "in-progress" | "unplayed";

export const dailyStatus = (today?: { solved: boolean; guesses: number }): DailyStatus =>
  !today || today.guesses === 0 ? "unplayed" : today.solved ? "solved" : "in-progress";

export const STATUS_BADGE: Record<DailyStatus, { icon: string; label: string; className: string }> = {
  solved: { icon: "✓", label: "Solved today", className: "text-green-600" },
  "in-progress": { icon: "●", label: "In progress", className: "text-amber-500" },
  unplayed: { icon: "○", label: "Not played yet", className: "text-gray-400" },
};

// Past `days` days (excluding today), newest first, flagged as played or not (unranked practice).
export function archiveDays(playedDates: Set<string>, days = 30, now = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (i + 1));
    const date = d.toISOString().slice(0, 10);
    return { date, played: playedDates.has(date) };
  });
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Keeps Tab / Shift+Tab inside the open dialog and focuses its first control.
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    items()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [ref, active]);
}
