import { describe, expect, it } from "vitest";
import {
  isGuessSubmittedEvent,
  isSessionFinalizedEvent,
  isSessionStartedEvent,
  isStreakUpdatedEvent,
  type DecodedEvent,
} from "./events";

const ev = (topic: string, payload: unknown): DecodedEvent => ({ contractId: "CABC", topic, payload });

describe("event type guards", () => {
  it("accept well-formed events of their own topic", () => {
    expect(isSessionStartedEvent(ev("session_started", "ab12"))).toBe(true);
    expect(isSessionFinalizedEvent(ev("session_finalized", "GPLAYER"))).toBe(true);
    expect(
      isGuessSubmittedEvent(
        ev("guess_submitted", { guessCommitment: "ff", result: { attemptNo: 1, outcomeCode: 2, isCorrect: false } }),
      ),
    ).toBe(true);
    expect(isStreakUpdatedEvent(ev("streak_updated", { current: 2, max: 5, lastDayPlayed: 20000 }))).toBe(true);
  });

  it("accept snake_case payload keys and un-normalized topics", () => {
    expect(
      isGuessSubmittedEvent(
        ev(" Guess_Submitted ", { guess_commitment: "ff", result: { attempt_no: 1, outcome_code: 0, is_correct: true } }),
      ),
    ).toBe(true);
    expect(isStreakUpdatedEvent(ev("streak_updated", { current: 1, max: 1, last_day_played: 3 }))).toBe(true);
  });

  it("narrow the type so the payload is usable", () => {
    const value: unknown = ev("streak_updated", { current: 3, max: 4, lastDayPlayed: 9 });
    if (isStreakUpdatedEvent(value)) expect(value.payload.current + value.payload.max).toBe(7);
    else throw new Error("expected a streak event");
  });

  it("reject the wrong topic", () => {
    expect(isSessionStartedEvent(ev("session_finalized", "ab12"))).toBe(false);
    expect(isStreakUpdatedEvent(ev("session_started", { current: 1, max: 1, lastDayPlayed: 1 }))).toBe(false);
  });

  it("reject malformed events without throwing", () => {
    for (const bad of [null, undefined, 42, "x", {}, [], { topic: "session_started" }, ev("session_started", 5)]) {
      expect(isSessionStartedEvent(bad)).toBe(false);
      expect(isSessionFinalizedEvent(bad)).toBe(false);
      expect(isGuessSubmittedEvent(bad)).toBe(false);
      expect(isStreakUpdatedEvent(bad)).toBe(false);
    }
    expect(isGuessSubmittedEvent(ev("guess_submitted", { guessCommitment: "ff", result: { attemptNo: -1, outcomeCode: 0, isCorrect: true } }))).toBe(false);
    expect(isStreakUpdatedEvent(ev("streak_updated", { current: "1", max: 1, lastDayPlayed: 1 }))).toBe(false);
  });
});
