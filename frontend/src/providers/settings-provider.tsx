"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type GameSettings = {
  colorBlindMode: boolean;
};

type SettingsContextValue = GameSettings & {
  setColorBlindMode: (enabled: boolean) => void;
};

const STORAGE_KEY = "dewordle-settings";

const defaults: GameSettings = {
  colorBlindMode: false,
};

function loadSettings(): GameSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function persistSettings(settings: GameSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable
  }
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GameSettings>(defaults);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const setColorBlindMode = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, colorBlindMode: enabled };
      persistSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      setColorBlindMode,
    }),
    [settings, setColorBlindMode],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
