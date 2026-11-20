export interface YbmahqPasteContext {
  activeRowComplete: boolean;
  gameFinished: boolean;
  maxLetters?: number;
}

export function ybmahqExtractPasteLetters(input: string, maxLetters = 5): string[] {
  const cleaned = input.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (!cleaned) return [];
  return cleaned.slice(0, maxLetters).split("");
}

export function ybmahqCanAcceptPaste(context: YbmahqPasteContext): boolean {
  return !context.activeRowComplete && !context.gameFinished;
}

export interface YbmahqApplyPasteResult {
  guess: string[];
  focusIndex: number | null;
  applied: boolean;
}

export function ybmahqApplyPasteToGuess(
  currentGuess: string[],
  pastedText: string,
  context: YbmahqPasteContext,
): YbmahqApplyPasteResult {
  const maxLetters = context.maxLetters ?? 5;
  if (!ybmahqCanAcceptPaste(context)) {
    return { guess: [...currentGuess], focusIndex: currentGuess.length ? currentGuess.length - 1 : null, applied: false };
  }

  const letters = ybmahqExtractPasteLetters(pastedText, maxLetters);
  if (letters.length === 0) {
    return { guess: [...currentGuess], focusIndex: currentGuess.length ? currentGuess.length - 1 : null, applied: false };
  }

  const next = letters.slice(0, maxLetters);
  return {
    guess: next,
    focusIndex: next.length - 1,
    applied: true,
  };
}

export function ybmahqHandlePasteEvent(
  event: { clipboardData?: { getData: (type: string) => string } | null; preventDefault?: () => void },
  currentGuess: string[],
  context: YbmahqPasteContext,
): YbmahqApplyPasteResult {
  const text = event.clipboardData?.getData("text") ?? "";
  const result = ybmahqApplyPasteToGuess(currentGuess, text, context);
  if (result.applied) {
    event.preventDefault?.();
  }
  return result;
}
