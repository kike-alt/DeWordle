"use client";

export type SessionKind = "daily" | "practice" | "interrupted";

export interface SessionResultData {
  kind: SessionKind;
  /** Word the player was trying to guess */
  word: string;
  /** Whether the player won */
  won: boolean;
  /** Number of guesses used (1–6) */
  guessCount: number;
  /** Current win streak from on-chain projection */
  streak: number;
  /** On-chain session ID (used for share URL) */
  sessionId?: string;
  /** Confirmed tx hash, if available */
  txHash?: string;
  /** ISO date string for daily sessions */
  date?: string;
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

function buildShareText(result: SessionResultData): string {
  const emoji = result.won ? "🟩" : "🟥";
  const kindLabel = KIND_LABEL[result.kind];
  const dateStr = result.date ? ` · ${result.date}` : "";
  const guessLine = result.won
    ? `Solved in ${result.guessCount}/6`
    : "Did not solve";
  return `DeWordle ${kindLabel}${dateStr}\n${guessLine} — Streak: ${result.streak}\n${emoji.repeat(result.guessCount)}`;
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

/**
 * Shareable result card generated from Soroban projection data.
 * Handles daily, practice, and interrupted session layouts without
 * duplicating markup — layout differences are purely conditional text/badges.
 */
export function SessionResultCard({ result, onShare }: SessionResultCardProps) {
  const { kind, word, won, guessCount, streak, txHash, date } = result;
  const isInterrupted = kind === "interrupted";

  const handleShare = async () => {
    const text = buildShareText(result);
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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-widest text-purple-300">
            {KIND_LABEL[kind]}
            {date && <span className="ml-2 text-gray-400 normal-case tracking-normal">{date}</span>}
          </span>
          <span className="text-2xl font-bold tracking-widest">
            {isInterrupted ? "———" : word.toUpperCase()}
          </span>
        </div>
        <OutcomeBadge won={won} kind={kind} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-xl bg-white/5 py-4">
          <span className="text-3xl font-bold">
            {isInterrupted ? "—" : won ? `${guessCount}/6` : "X/6"}
          </span>
          <span className="text-xs text-gray-400 mt-1">Guesses</span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-white/5 py-4">
          <span className="text-3xl font-bold">{streak}</span>
          <span className="text-xs text-gray-400 mt-1">Streak</span>
        </div>
      </div>

      {/* Guess squares */}
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

      {/* On-chain tx hash */}
      {txHash && (
        <p className="text-center text-xs text-gray-500 truncate">
          On-chain:{" "}
          <span className="font-mono" title={txHash}>
            {txHash.slice(0, 10)}…{txHash.slice(-6)}
          </span>
        </p>
      )}

      {/* Share button */}
      <button
        type="button"
        onClick={handleShare}
        className="w-full rounded-xl py-3 text-sm font-semibold bg-purple-600 hover:bg-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 touch-target"
        aria-label="Share your result"
      >
        Share Result
      </button>
    </article>
  );
}
