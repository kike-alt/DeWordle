'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ARIA_LIVE_REGIONS,
  generateGameCellLabel,
  generateBoardSummary,
} from '@/lib/accessibility';

export type CellStatus = 'correct' | 'present' | 'absent' | 'empty';

const TILE_FLIP_STAGGER_MS = 250;

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
  practiceMode?: boolean;
  practicePuzzleId?: string | number;
  practiceWord?: string;
  wordMetadata?: Readonly<Record<string, { category?: string | null }>>;
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
  const isEvaluated = cell.status !== 'empty';
  const delayStyle = isEvaluated
    ? ({ '--flip-delay': `${position * TILE_FLIP_STAGGER_MS}ms` } as CSSProperties)
    : undefined;

  return (
    <div
      role="gridcell"
      aria-label={label}
      aria-current={isCurrentRow && cell.status === 'empty' ? 'true' : undefined}
      className={`w-12 h-12 sm:w-14 sm:h-14 border-2 flex items-center justify-center text-xl font-bold uppercase select-none ${isEvaluated ? 'tile-flip' : ''}`}
      style={delayStyle}
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
  practiceMode = false,
  practicePuzzleId,
  practiceWord,
  wordMetadata,
}: AccessibleGameBoardProps) {
  const [isCategoryHintVisible, setIsCategoryHintVisible] = useState(false);
  const summary = useMemo(
    () => generateBoardSummary(currentRow, rows.length, guessesUsed, maxGuesses),
    [currentRow, rows.length, guessesUsed, maxGuesses],
  );
  const category = practiceWord
    ? wordMetadata?.[practiceWord.toLowerCase()]?.category?.trim()
    : undefined;

  useEffect(() => {
    setIsCategoryHintVisible(false);
  }, [practicePuzzleId, practiceWord]);

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
      {practiceMode && (
        <div className="relative mb-3 flex justify-center">
          <button
            type="button"
            aria-expanded={isCategoryHintVisible}
            aria-controls="practice-category-hint"
            onClick={() => setIsCategoryHintVisible((visible) => !visible)}
            className="rounded-md border border-primary-700/60 px-3 py-2 text-sm text-primary-100 hover:bg-primary-900/40 focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {isCategoryHintVisible ? 'Hide Category Hint' : 'Show Category Hint'}
          </button>
          {isCategoryHintVisible && (
            <div
              id="practice-category-hint"
              role="tooltip"
              className="absolute bottom-full z-10 mb-2 rounded-md border border-primary-700 bg-primary-950 px-3 py-2 text-sm text-white shadow-lg"
            >
              {category ? (
                <span>{category}</span>
              ) : (
                <span>Category hint unavailable</span>
              )}
            </div>
          )}
        </div>
      )}
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
