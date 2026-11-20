"use client";
// Reduced-motion override and wallet disconnect confirmation. Closes #1612, #1614.
import { useCallback, useEffect, useState } from "react";

const MOTION_KEY = "dewordle:reduced-motion";

/*
 Global CSS (forces off all animations and transitions when the switch is on):
 [data-reduced-motion="true"] *, [data-reduced-motion="true"] *::before, [data-reduced-motion="true"] *::after {
   animation: none !important;
   transition: none !important;
 }
*/

export function useReducedMotion() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(MOTION_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(enabled);
    try {
      localStorage.setItem(MOTION_KEY, String(enabled));
    } catch {}
  }, [enabled]);

  return { enabled, toggle: () => setEnabled((v) => !v) };
}

export const DISCONNECT_WARNING =
  "Disconnecting will end your wallet session. Any unsynced state will require reconnecting.";

// Click "Disconnect" -> request(); only confirm() actually disconnects.
export function useConfirmDisconnect(disconnect: () => void | Promise<void>) {
  const [open, setOpen] = useState(false);

  const request = useCallback(() => setOpen(true), []);
  const cancel = useCallback(() => setOpen(false), []);
  const confirm = useCallback(async () => {
    try {
      await disconnect();
    } finally {
      setOpen(false);
    }
  }, [disconnect]);

  return { open, request, confirm, cancel };
}
