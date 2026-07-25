"use client";

import { useState } from "react";
import { ShareResultCard, GuessRow } from "./ShareResultCard";

export type SessionKind = "daily" | "practice" | "interrupted";

export interface SessionResultData {
  kind: SessionKind;
  /** Word the player was trying to guess */
  word: string;
  /** Whether the player won */
  won: boolean;
  /** Number of guesses used (1-6) */
  guessCount: number;
  /** Current win streak from on-chain projection */
  streak: number;
  /** On-chain session ID (used for share URL) */
  sessionId?: string;
  /** Confirmed tx hash, if available */
  txHash?: string;
  /** ISO date string for daily sessions */
  date?: string;
  /** Guess outcome codes per attempt for visual grid */
  outcomeCodes?: number[];
}

interface SessionResultCardProps {
  result: SessionResultData;
  /** Called when the user taps "Share". Receives the share text. */
  onShare?: (text: string) => void;
}

const KIND_LABEL: Record<SessionKind, string> = {
  daily: "Daily",
  practice: "Practice",
  interrupted: "Incomplete",
};

function outcomeCodeToStatus(code: number): "correct" | "present" | "absent" {
  if (code === 2) return "correct";
  if (code === 1) return "present";
  return "absent";
}

function buildShareRows(result: SessionResultData): GuessRow[] {
  const { guessCount, won, outcomeCodes } = result;
  const rows: GuessRow[] = [];
  const codes = outcomeCodes || Array.from({ length: guessCount }, () => 0);
  for (let i = 0; i < 6; i++) {
    if (i < guessCount) {
      const code = codes[i] ?? 0;
      const status = outcomeCodeToStatus(code);
      rows.push({
        status: Array.from({ length: 5 }, () =>
          i === guessCount - 1 && won ? "correct" : status,
        ),
      });
    } else {
      rows.push({ status: Array(5).fill("empty") });
    }
  }
  return rows;
}

function buildShareText(result: SessionResultData, rows: GuessRow[]): string {
  const kindLabel = KIND_LABEL[result.kind];
  const dateStr = result.date ? ` \u00b7 ${result.date}` : "";
  const guessLine = result.won
    ? `Solved in ${result.guessCount}/6`
    : "Did not solve";
  const grid = rows
    .map((row) =>
      row.status
        .map((s) => {
          if (s === "correct") return "\u{1F7E9}";
          if (s === "present") return "\u{1F7E8}";
          if (s === "absent") return "\u2B1C";
          return "";
        })
        .join(""),
    )
    .join("\n");
  return `DeWordle ${kindLabel}${dateStr}\n${guessLine} \u2014 Streak: ${result.streak}\n${grid}`;
}

function OutcomeBadge({ won, kind }: { won: boolean; kind: SessionKind }) {
  if (kind === "interrupted") {
    return (
      <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
        Incomplete
      </span>
    );
  }
  return won ? (
    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
      Solved ✓
    </span>
  ) : (
    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
      Better luck next time
    </span>
  );
}

export function SessionResultCard({ result, onShare }: SessionResultCardProps) {
  const { kind, word, won, guessCount, streak, txHash, date } = result;
  const isInterrupted = kind === "interrupted";
  const [showShareCard, setShowShareCard] = useState(false);

  const shareRows = buildShareRows(result);

  const handleShare = async () => {
    const text = buildShareText(result, shareRows);
    if (onShare) {
      onShare(text);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <article
      aria-label={`${KIND_LABEL[kind]} session result`}
      className="flex flex-col gap-4 sm:gap-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a0b3d] to-[#2d1b69] p-4 sm:p-6 shadow-xl text-white w-full max-w-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-widest text-purple-300">
            {KIND_LABEL[kind]}
            {date && <span className="ml-2 text-gray-400 normal-case tracking-normal">{date}</span>}
          </span>
          <span className="text-2xl font-bold tracking-widest">
            {isInterrupted ? "\u2014\u2014\u2014" : word.toUpperCase()}
          </span>
        </div>
        <OutcomeBadge won={won} kind={kind} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-xl bg-white/5 py-4">
          <span className="text-3xl font-bold">
            {isInterrupted ? "\u2014" : won ? `${guessCount}/6` : "X/6"}
          </span>
          <span className="text-xs text-gray-400 mt-1">Guesses</span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-white/5 py-4">
          <span className="text-3xl font-bold">{streak}</span>
          <span className="text-xs text-gray-400 mt-1">Streak</span>
        </div>
      </div>

      {!isInterrupted && (
        <div
          aria-label={`${guessCount} guess${guessCount !== 1 ? "es" : ""} used`}
          className="flex gap-1.5 justify-center"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-sm ${
                i < guessCount
                  ? won
                    ? "bg-green-500"
                    : i < guessCount - 1
                      ? "bg-yellow-400"
                      : "bg-red-500"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>
      )}

      {txHash && (
        <p className="text-center text-xs text-gray-500 truncate">
          On-chain:{" "}
          <span className="font-mono" title={txHash}>
            {txHash.slice(0, 10)}\u2026{txHash.slice(-6)}
          </span>
        </p>
      )}

      {!isInterrupted && showShareCard && (
        <ShareResultCard
          guesses={shareRows}
          won={won}
          guessCount={guessCount}
          streak={streak}
          kind={kind}
          date={date}
        />
      )}

      <div className="flex gap-2">
        {!isInterrupted && (
          <button
            type="button"
            onClick={() => setShowShareCard(!showShareCard)}
            className="flex-1 rounded-xl py-3 text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 touch-target"
            aria-label="Toggle share card preview"
          >
            {showShareCard ? "Hide Card" : "Show Card"}
          </button>
        )}
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 rounded-xl py-3 text-sm font-semibold bg-purple-600 hover:bg-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 touch-target"
          aria-label="Share your result"
        >
          Share Result
        </button>
      </div>
    </article>
  );
}
