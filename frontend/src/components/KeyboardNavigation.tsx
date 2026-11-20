"use client";

import { useState, useCallback, useEffect } from "react";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { KeyboardHelpModal } from "./KeyboardHelpModal";

interface KeyboardNavigationProps {
  children: React.ReactNode;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onBackspace?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function KeyboardNavigation({
  children,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onBackspace,
  onEscape,
  enabled = true,
}: KeyboardNavigationProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const toggleHelp = useCallback(() => setHelpOpen((prev) => !prev), []);

  useKeyboardNavigation({
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onBackspace,
    onEscape: () => {
      if (helpOpen) {
        setHelpOpen(false);
      } else {
        onEscape?.();
      }
    },
    onQuestionMark: toggleHelp,
    enabled,
  });

  return (
    <>
      {children}
      <KeyboardHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

export function KeyboardShortcutsHelp() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      setHelpOpen(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Keyboard shortcuts"
        onClick={() => setHelpOpen(true)}
        className="cursor-pointer rounded-full p-1 text-gray-400 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-sm font-bold">
          ?
        </span>
      </button>
      <KeyboardHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
