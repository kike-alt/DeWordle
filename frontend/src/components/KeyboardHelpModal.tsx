"use client";

import { useEffect, useRef, useCallback } from "react";

interface KeyboardHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ["Arrow keys"], description: "Navigate between tiles" },
  { keys: ["Enter"], description: "Submit current word" },
  { keys: ["Backspace"], description: "Delete last letter" },
  { keys: ["Escape"], description: "Close this modal / cancel" },
  { keys: ["?"], description: "Toggle this help panel" },
];

export function KeyboardHelpModal({ open, onClose }: KeyboardHelpModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusableElements = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    },
    [open, onClose]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      const firstButton = dialog.querySelector<HTMLElement>("button");
      firstButton?.focus();
    } else {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
      previousFocusRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-2xl border border-white/10 bg-[#1a0b3d] p-0 text-white shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-6 p-6 min-w-[320px]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-wide">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close help"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <table aria-label="Keyboard shortcuts" className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-gray-400">
              <th scope="col" className="pb-2 pr-4">Shortcut</th>
              <th scope="col" className="pb-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map(({ keys, description }) => (
              <tr key={description} className="border-b border-white/5">
                <td className="py-2 pr-4">
                  <div className="flex gap-1">
                    {keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-mono text-white"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </td>
                <td className="py-2 text-sm text-gray-300">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs text-gray-500 text-center">
          Press <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 font-mono">?</kbd> to toggle this panel
        </p>
      </div>
    </dialog>
  );
}
