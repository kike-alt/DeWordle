"use client";
// Fullscreen toggle and accent color palettes. Closes #1607, #1608.
import { useCallback, useEffect, useState } from "react";

export function useFullscreen() {
  const supported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    if (!supported) return; // Hide the button when unsupported (e.g. iOS Safari).
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // The browser refused (no user gesture, policy); stay in the current mode.
    }
  }, [supported]);

  return { supported, isFullscreen, toggle };
}

export const ACCENT_PALETTES = {
  emerald: { accent: "#10b981", accentForeground: "#ffffff" },
  violet: { accent: "#8b5cf6", accentForeground: "#ffffff" },
  amber: { accent: "#f59e0b", accentForeground: "#111827" },
  cyan: { accent: "#06b6d4", accentForeground: "#111827" },
  rose: { accent: "#f43f5e", accentForeground: "#ffffff" },
} as const;
export type AccentName = keyof typeof ACCENT_PALETTES;

const ACCENT_KEY = "dewordle:accent";

// Sets CSS custom properties; style buttons, focus borders and active indicators with var(--accent).
export function useAccent() {
  const [accent, setAccent] = useState<AccentName>(() => {
    try {
      const saved = localStorage.getItem(ACCENT_KEY) as AccentName | null;
      return saved && saved in ACCENT_PALETTES ? saved : "emerald";
    } catch {
      return "emerald";
    }
  });

  useEffect(() => {
    const p = ACCENT_PALETTES[accent];
    document.documentElement.style.setProperty("--accent", p.accent);
    document.documentElement.style.setProperty("--accent-foreground", p.accentForeground);
    try {
      localStorage.setItem(ACCENT_KEY, accent);
    } catch {}
  }, [accent]);

  return { accent, setAccent };
}
