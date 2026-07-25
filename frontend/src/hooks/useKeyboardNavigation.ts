import { useCallback, useEffect, useRef } from "react";

export interface KeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onBackspace?: () => void;
  onEscape?: () => void;
  onQuestionMark?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onBackspace,
    onEscape,
    onQuestionMark,
    enabled = true,
  } = options;

  const handlersRef = useRef(options);
  handlersRef.current = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!handlersRef.current.enabled) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          handlersRef.current.onArrowUp?.();
          break;
        case "ArrowDown":
          event.preventDefault();
          handlersRef.current.onArrowDown?.();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlersRef.current.onArrowLeft?.();
          break;
        case "ArrowRight":
          event.preventDefault();
          handlersRef.current.onArrowRight?.();
          break;
        case "Enter":
          event.preventDefault();
          handlersRef.current.onEnter?.();
          break;
        case "Backspace":
          event.preventDefault();
          handlersRef.current.onBackspace?.();
          break;
        case "Escape":
          event.preventDefault();
          handlersRef.current.onEscape?.();
          break;
        case "?":
          event.preventDefault();
          handlersRef.current.onQuestionMark?.();
          break;
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}
