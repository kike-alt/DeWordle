"use client";

import { useEffect, useState } from "react";
import { debug } from "@/lib/debug";

export function DebugBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(debug.isEnabled());
    const handler = () => setActive(debug.isEnabled());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-label="Debug mode active"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-500/90 px-4 py-2 text-xs font-semibold text-black backdrop-blur-sm"
    >
      <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse" />
      Debug mode is active
    </div>
  );
}
