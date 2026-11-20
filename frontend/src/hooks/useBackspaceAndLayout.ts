"use client";
// Backspace hold-to-clear and keyboard layout preference. Closes #1591, #1592.
import { useCallback, useRef, useState } from "react";

// Virtual backspace: holding the key clears the whole row; a short press deletes one letter.
export function useBackspaceHold(onDelete: () => void, onClearRow: () => void, holdMs = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const start = useCallback(() => {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      onClearRow();
    }, holdMs);
  }, [onClearRow, holdMs]);

  const end = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!held.current) onDelete();
    held.current = false;
  }, [onDelete]);

  return { onPointerDown: start, onPointerUp: end, onPointerLeave: () => timer.current && clearTimeout(timer.current) };
}

// Physical keyboard: Cmd+Backspace (macOS) or Ctrl+Backspace clears the active row.
export const isClearRowShortcut = (e: KeyboardEvent) => e.key === "Backspace" && (e.metaKey || e.ctrlKey);

export const KEYBOARD_LAYOUTS = {
  qwerty: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
  azerty: ["azertyuiop", "qsdfghjklm", "wxcvbn"],
  qwertz: ["qwertzuiop", "asdfghjkl", "yxcvbnm"],
  dvorak: ["pyfgcrl", "aoeuidhtns", "qjkxbmwvz"],
} as const;
export type KeyboardLayout = keyof typeof KEYBOARD_LAYOUTS;

const STORAGE_KEY = "dewordle:keyboard-layout";

export function useKeyboardLayout() {
  const [layout, setLayoutState] = useState<KeyboardLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as KeyboardLayout | null;
      return saved && saved in KEYBOARD_LAYOUTS ? saved : "qwerty";
    } catch {
      return "qwerty";
    }
  });

  const setLayout = (next: KeyboardLayout) => {
    setLayoutState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  };

  return { layout, rows: KEYBOARD_LAYOUTS[layout], setLayout };
}
