import { describe, expect, it, vi } from "vitest";
import {
  ybmahqApplyPasteToGuess,
  ybmahqCanAcceptPaste,
  ybmahqExtractPasteLetters,
  ybmahqHandlePasteEvent,
} from "../ybmahq-clipboard-paste-guess";

describe("ybmahq clipboard paste guess entry", () => {
  it("extracts a valid 5-letter word and populates the active row immediately", () => {
    expect(ybmahqExtractPasteLetters("crane")).toEqual(["C", "R", "A", "N", "E"]);
    const result = ybmahqApplyPasteToGuess([], "crane", { activeRowComplete: false, gameFinished: false });
    expect(result.applied).toBe(true);
    expect(result.guess).toEqual(["C", "R", "A", "N", "E"]);
    expect(result.focusIndex).toBe(4);
  });

  it("strips non-alphabetic characters and fills up to 5 letters", () => {
    expect(ybmahqExtractPasteLetters(" c1r!a n-e!!s ")).toEqual(["C", "R", "A", "N", "E"]);
    const result = ybmahqApplyPasteToGuess(["A"], "ab c-defgh", { activeRowComplete: false, gameFinished: false });
    expect(result.guess).toEqual(["A", "B", "C", "D", "E"]);
    expect(result.focusIndex).toBe(4);
  });

  it("ignores paste when active row is complete or game session is finished", () => {
    expect(ybmahqCanAcceptPaste({ activeRowComplete: true, gameFinished: false })).toBe(false);
    expect(ybmahqCanAcceptPaste({ activeRowComplete: false, gameFinished: true })).toBe(false);
    const complete = ybmahqApplyPasteToGuess(["C", "R", "A", "N", "E"], "apple", { activeRowComplete: true, gameFinished: false });
    expect(complete.applied).toBe(false);
    expect(complete.guess).toEqual(["C", "R", "A", "N", "E"]);
    const finished = ybmahqApplyPasteToGuess(["A"], "apple", { activeRowComplete: false, gameFinished: true });
    expect(finished.applied).toBe(false);
  });

  it("keeps focus state on last pasted letter tile via focusIndex", () => {
    const result = ybmahqApplyPasteToGuess([], "cat", { activeRowComplete: false, gameFinished: false });
    expect(result.guess).toEqual(["C", "A", "T"]);
    expect(result.focusIndex).toBe(2);
  });

  it("handles paste events and prevents default only when applied", () => {
    const preventDefault = vi.fn();
    const applied = ybmahqHandlePasteEvent(
      { clipboardData: { getData: () => "plane" }, preventDefault },
      [],
      { activeRowComplete: false, gameFinished: false },
    );
    expect(applied.applied).toBe(true);
    expect(preventDefault).toHaveBeenCalled();

    const preventDefaultIgnored = vi.fn();
    const ignored = ybmahqHandlePasteEvent(
      { clipboardData: { getData: () => "plane" }, preventDefault: preventDefaultIgnored },
      ["A", "B", "C", "D", "E"],
      { activeRowComplete: true, gameFinished: false },
    );
    expect(ignored.applied).toBe(false);
    expect(preventDefaultIgnored).not.toHaveBeenCalled();
  });
});
