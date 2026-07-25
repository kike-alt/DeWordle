const DEBUG_STORAGE_KEY = "DEBUG_ENABLED";

function getDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
}

function setDebugEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem(DEBUG_STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(DEBUG_STORAGE_KEY);
  }
}

export const debug = {
  enable: () => setDebugEnabled(true),
  disable: () => setDebugEnabled(false),
  isEnabled: () => getDebugEnabled(),

  log: (category: string, message: string, data?: unknown) => {
    if (!getDebugEnabled()) return;
    const timestamp = new Date().toISOString();
    console.log(`[DEBUG][${timestamp}][${category}] ${message}`, data ?? "");
  },

  warn: (category: string, message: string, data?: unknown) => {
    if (!getDebugEnabled()) return;
    const timestamp = new Date().toISOString();
    console.warn(`[DEBUG][${timestamp}][${category}] ${message}`, data ?? "");
  },

  error: (category: string, message: string, data?: unknown) => {
    if (!getDebugEnabled()) return;
    const timestamp = new Date().toISOString();
    console.error(`[DEBUG][${timestamp}][${category}] ${message}`, data ?? "");
  },

  table: (category: string, label: string, data: unknown) => {
    if (!getDebugEnabled()) return;
    console.log(`[DEBUG][${category}] ${label}:`);
    console.table(data);
  },
};
