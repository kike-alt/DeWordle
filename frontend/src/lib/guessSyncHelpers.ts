// Guess history strike-through and projection lag label. Closes #1609, #1610.
export type LetterStatus = "correct" | "present" | "absent";
export interface EvaluatedGuess {
  letters: string[];
  statuses: LetterStatus[];
}

// Letters that were proven absent in ANY evaluated guess, and never confirmed present/correct elsewhere.
export function absentLetters(guesses: EvaluatedGuess[]): Set<string> {
  const absent = new Set<string>();
  const found = new Set<string>();
  guesses.forEach((g) =>
    g.letters.forEach((l, i) => {
      const letter = l.toLowerCase();
      if (g.statuses[i] === "absent") absent.add(letter);
      else found.add(letter);
    }),
  );
  found.forEach((l) => absent.delete(l));
  return absent;
}

// Optional strike-through class for tiles in the history sidebar.
export const strikeClass = (letter: string, absent: Set<string>, enabled: boolean) =>
  enabled && absent.has(letter.toLowerCase()) ? "line-through opacity-60" : "";

// `lagMs` comes from the indexer projection latency in /health/detailed.
export function formatProjectionLag(lagMs: number | null | undefined): { label: string; inSync: boolean } {
  if (lagMs == null) return { label: "Sync unknown", inSync: false };
  if (lagMs < 1000) return { label: "In Sync", inSync: true };
  const seconds = Math.round(lagMs / 1000);
  return { label: seconds >= 60 ? `Lag: ${Math.round(seconds / 60)}m` : `Lag: ${seconds}s`, inSync: false };
}
