"use client";
// Sound volume slider with test sound, and a dyslexia-friendly font toggle. Closes #1595, #1596.
import { useCallback, useEffect, useState } from "react";

const VOLUME_KEY = "dewordle:volume";
const FONT_KEY = "dewordle:dyslexic-font";

const read = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

// volume is 0-100; playback gain is volume / 100.
export function useSoundVolume() {
  const [volume, setVolumeState] = useState(() => Math.min(Math.max(Number(read(VOLUME_KEY, "70")) || 0, 0), 100));

  const setVolume = useCallback((v: number) => {
    const next = Math.min(Math.max(v, 0), 100);
    setVolumeState(next);
    write(VOLUME_KEY, String(next));
  }, []);

  const playTestSound = useCallback(() => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    osc.frequency.value = 660;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  }, [volume]);

  return { volume, gain: volume / 100, setVolume, playTestSound };
}

// Toggles the `dyslexic-font` class on <html>; style it in the global CSS for tiles, keys and headings.
export function useDyslexicFont() {
  const [enabled, setEnabled] = useState(() => read(FONT_KEY, "false") === "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dyslexic-font", enabled);
    write(FONT_KEY, String(enabled));
  }, [enabled]);

  return { enabled, toggle: () => setEnabled((v) => !v) };
}
