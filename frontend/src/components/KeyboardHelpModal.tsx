"use client";

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

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

        <div className="flex flex-col gap-3">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-300">{description}</span>
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
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 text-center">
          Press <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 font-mono">?</kbd> to toggle this panel
        </p>
      </div>
    </dialog>
  );
}
