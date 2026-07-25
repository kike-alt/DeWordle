"use client";

import { useState, useCallback } from "react";

type CellStatus = "correct" | "present" | "absent" | "empty";

export interface GuessRow {
  status: CellStatus[];
}

interface ShareResultCardProps {
  guesses: GuessRow[];
  won: boolean;
  guessCount: number;
  streak: number;
  kind?: "daily" | "practice";
  date?: string;
}

const STATUS_COLORS: Record<CellStatus, string> = {
  correct: "bg-green-500",
  present: "bg-yellow-400",
  absent: "bg-gray-500",
  empty: "bg-white/10",
};

function buildShareText(
  guesses: GuessRow[],
  won: boolean,
  guessCount: number,
  streak: number,
  kind: string,
  date?: string,
): string {
  const dateStr = date ? ` \u00b7 ${date}` : "";
  const guessLine = won ? `Solved in ${guessCount}/6` : "Did not solve";
  const grid = guesses
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
  return `DeWordle ${kind}${dateStr}\n${guessLine} \u2014 Streak: ${streak}\n${grid}`;
}

function GridPreview({ guesses }: { guesses: GuessRow[] }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {guesses.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1">
          {row.status.map((status, colIdx) => (
            <div
              key={colIdx}
              className={`h-5 w-5 rounded-sm ${STATUS_COLORS[status]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ShareResultCard({
  guesses,
  won,
  guessCount,
  streak,
  kind = "daily",
  date,
}: ShareResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const shareText = buildShareText(guesses, won, guessCount, streak, kind, date);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareText]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // user cancelled share
      }
    }
  }, [shareText]);

  const canNativeShare =
    typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a0b3d] to-[#2d1b69] p-5 shadow-xl text-white max-w-sm w-full">
      <GridPreview guesses={guesses} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-500 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
          aria-label="Copy result to clipboard"
        >
          {copied ? "Copied!" : "Copy"}
        </button>

        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label="Share result"
          >
            {shared ? "Shared!" : "Share"}
          </button>
        )}
      </div>
    </div>
  );
}
