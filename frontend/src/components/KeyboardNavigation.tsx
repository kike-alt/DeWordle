"use client";

import { useState, useCallback } from "react";
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
