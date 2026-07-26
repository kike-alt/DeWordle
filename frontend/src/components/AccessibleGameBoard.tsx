'use client';

import { useMemo } from 'react';
import {
  ARIA_LIVE_REGIONS,
  generateGameCellLabel,
  generateBoardSummary,
} from '@/lib/accessibility';

export type CellStatus = 'correct' | 'present' | 'absent' | 'empty';

export interface GameCell {
  letter: string;
  status: CellStatus;
}

export interface AccessibleGameBoardProps {
  rows: GameCell[][];
  currentRow: number;
  maxGuesses: number;
  guessesUsed: number;
  isRevealing?: boolean;
  className?: string;
}

function Cell({
  cell,
  position,
  isCurrentRow,
}: {
  cell: GameCell;
  position: number;
  isCurrentRow: boolean;
}) {
  const label = generateGameCellLabel(position, cell.letter, cell.status);

  return (
    <div
      role="gridcell"
      aria-label={label}
      aria-current={isCurrentRow && cell.status === 'empty' ? 'true' : undefined}
      className="w-12 h-12 sm:w-14 sm:h-14 border-2 flex items-center justify-center text-xl font-bold uppercase select-none"
      aria-hidden="false"
    >
      {cell.letter}
    </div>
  );
}

export function AccessibleGameBoard({
  rows,
  currentRow,
  maxGuesses,
  guessesUsed,
  isRevealing = false,
  className = '',
}: AccessibleGameBoardProps) {
  const summary = useMemo(
    () => generateBoardSummary(currentRow, rows.length, guessesUsed, maxGuesses),
    [currentRow, rows.length, guessesUsed, maxGuesses],
  );

  return (
    <div className={className}>
      <div
        id={ARIA_LIVE_REGIONS.GAME_BOARD}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {summary}
      </div>
      <div
        id={ARIA_LIVE_REGIONS.GAME_STATE}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id={ARIA_LIVE_REGIONS.NOTIFICATION}
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
      <div role="grid" aria-label="Wordle game board" aria-rowcount={rows.length}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            role="row"
            aria-label={`Row ${rowIndex + 1} of ${rows.length}`}
            aria-rowindex={rowIndex + 1}
            className="flex justify-center gap-2 mb-2"
          >
            {row.map((cell, cellIndex) => (
              <Cell
                key={cellIndex}
                cell={cell}
                position={cellIndex}
                isCurrentRow={rowIndex === currentRow}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {isRevealing ? 'Revealing letters...' : summary}
      </p>
    </div>
  );
}
