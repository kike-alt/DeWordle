"use client";

import { useSettings } from "@/providers/settings-provider";

export function SettingsPanel() {
  const { colorBlindMode, setColorBlindMode } = useSettings();

  return (
    <div
      role="region"
      aria-label="Game settings"
      className="flex items-center gap-3 rounded-lg border border-white/10 bg-dark-200/50 px-4 py-2"
    >
      <label
        htmlFor="colorblind-toggle"
        className="cursor-pointer select-none text-sm font-medium text-gray-300"
      >
        Color-blind mode
      </label>
      <button
        id="colorblind-toggle"
        role="switch"
        aria-checked={colorBlindMode}
        aria-label="Toggle color-blind mode"
        onClick={() => setColorBlindMode(!colorBlindMode)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/60 ${
          colorBlindMode ? "bg-[#4b5fff]" : "bg-dark-500"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            colorBlindMode ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

const COLOR_BLIND_SYMBOLS = {
  correct: "\u2713",
  present: "\u25B3",
  absent: "\u2717",
} as const;

type TileState = "correct" | "present" | "absent";

export function ColorBlindOverlay({ state }: { state: TileState }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center text-lg font-bold opacity-80"
      style={{ color: state === "correct" ? "#22c55e" : state === "present" ? "#eab308" : "#6b7280" }}
    >
      {COLOR_BLIND_SYMBOLS[state]}
    </span>
  );
}

export function AriaTileLabel({ state }: { state: TileState }) {
  return (
    <span className="sr-only">
      {state === "correct" ? "Correct letter in correct position" : state === "present" ? "Correct letter in wrong position" : "Letter not in word"}
    </span>
  );
}
