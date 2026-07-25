import { useEffect, useRef, useCallback } from 'react';

export const ARIA_LIVE_REGIONS = {
  GAME_STATE: 'game-state-announcer',
  GAME_BOARD: 'game-board-announcer',
  NOTIFICATION: 'notification-announcer',
} as const;

export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  const regionId =
    priority === 'assertive'
      ? ARIA_LIVE_REGIONS.NOTIFICATION
      : ARIA_LIVE_REGIONS.GAME_STATE;

  const region = document.getElementById(regionId);
  if (region) {
    region.textContent = '';
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }
}

export function useFocusTrap(isOpen: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    const firstFocusable = getFocusableElements()[0];
    firstFocusable?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, containerRef]);
}

export function useKeyboardNavigation(
  itemRefs: React.RefObject<HTMLElement | null>[],
  options?: { loop?: boolean },
) {
  const focusItem = useCallback(
    (index: number) => {
      const clampedIndex = options?.loop
        ? (index + itemRefs.length) % itemRefs.length
        : Math.max(0, Math.min(index, itemRefs.length - 1));

      itemRefs[clampedIndex]?.current?.focus();
    },
    [itemRefs, options?.loop],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          focusItem(currentIndex + 1);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          focusItem(currentIndex - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusItem(0);
          break;
        case 'End':
          e.preventDefault();
          focusItem(itemRefs.length - 1);
          break;
      }
    },
    [focusItem, itemRefs.length],
  );

  return { handleKeyDown, focusItem };
}

export function generateGameCellLabel(
  position: number,
  letter: string,
  status: 'correct' | 'present' | 'absent' | 'empty',
): string {
  const positionLabel = `row position ${position + 1}`;
  if (status === 'empty') {
    return `${positionLabel}, empty`;
  }
  return `${positionLabel}, letter ${letter.toUpperCase()}, ${status}`;
}

export function generateBoardSummary(
  currentRow: number,
  totalRows: number,
  guessesUsed: number,
  maxGuesses: number,
): string {
  return `Guess ${guessesUsed} of ${maxGuesses}. Row ${currentRow + 1} of ${totalRows}.`;
}
