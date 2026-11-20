"use client";
// Confirmation-before-destructive-action state and sticky mobile header classes. Closes #1599, #1600.
import { useCallback, useState } from "react";

// Wrap "Clear offline data": call `request()` from the button, show the modal while `open`,
// and only `confirm()` runs the real action.
export function useConfirmAction(action: () => void | Promise<void>) {
  const [open, setOpen] = useState(false);

  const request = useCallback(() => setOpen(true), []);
  const cancel = useCallback(() => setOpen(false), []);
  const confirm = useCallback(async () => {
    try {
      await action();
    } finally {
      setOpen(false);
    }
  }, [action]);

  return { open, request, confirm, cancel };
}

export const CLEAR_OFFLINE_WARNING =
  "This permanently deletes your cached in-progress guesses and local stats. This cannot be undone.";

// Sticky on mobile only, with a blurred backdrop so the streak and wallet address stay visible.
export const STICKY_HEADER_CLASS =
  "sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:static";
