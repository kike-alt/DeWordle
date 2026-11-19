import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeSessionStartedEvent, subscribeSessionStarted, type RawChainEvent } from "./events";
import { SOURCE_KEY, OTHER_KEY } from "./testing/rpc-mock";

const sym = (s: string) => nativeToScVal(s, { type: "symbol" });
const sessionBytes = Buffer.alloc(32, 0xab);

function sessionStarted(player: string, dayId: number): RawChainEvent {
  return {
    contractId: "C1",
    ledger: 42,
    topic: [sym("session"), sym("started"), new Address(player).toScVal(), nativeToScVal(dayId, { type: "u32" })],
    value: nativeToScVal(sessionBytes, { type: "bytes" }),
  };
}

describe("decodeSessionStartedEvent", () => {
  it("parses fixture XDR into a typed object", () => {
    expect(decodeSessionStartedEvent(sessionStarted(SOURCE_KEY, 7))).toEqual({
      player: SOURCE_KEY,
      dayId: 7,
      sessionId: sessionBytes.toString("hex"),
      contractId: "C1",
      ledger: 42,
    });
  });

  it("accepts base64 XDR topics and value", () => {
    const raw = sessionStarted(SOURCE_KEY, 3);
    const b64: RawChainEvent = {
      ...raw,
      topic: raw.topic.map((t) => (t as xdr.ScVal).toXDR("base64")),
      value: (raw.value as xdr.ScVal).toXDR("base64"),
    };
    expect(decodeSessionStartedEvent(b64)?.dayId).toBe(3);
  });

  it("returns null for other or malformed events", () => {
    const other = { ...sessionStarted(SOURCE_KEY, 1), topic: [sym("guess"), sym("submitted"), sym("x"), sym("y")] };
    expect(decodeSessionStartedEvent(other)).toBeNull();
    expect(decodeSessionStartedEvent({ topic: [], value: sym("x") })).toBeNull();
    expect(decodeSessionStartedEvent({ topic: ["not-xdr", "a", "b", "c"], value: "zzz" })).toBeNull();
  });
});

describe("subscribeSessionStarted", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("delivers typed events, applies filters and stops after unsubscribe", async () => {
    const fetchEvents = vi
      .fn()
      .mockResolvedValueOnce({ events: [sessionStarted(SOURCE_KEY, 1), sessionStarted(OTHER_KEY, 1)], cursor: "c1" })
      .mockResolvedValue({ events: [], cursor: "c2" });
    const received: string[] = [];
    const unsubscribe = subscribeSessionStarted((e) => received.push(e.player), {
      fetchEvents,
      intervalMs: 1000,
      player: SOURCE_KEY,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(received).toEqual([SOURCE_KEY]);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchEvents).toHaveBeenLastCalledWith("c1");

    unsubscribe();
    const calls = fetchEvents.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchEvents.mock.calls.length).toBe(calls);
  });

  it("reports fetch errors through onError without stopping", async () => {
    const onError = vi.fn();
    const fetchEvents = vi.fn().mockRejectedValueOnce(new Error("rpc down")).mockResolvedValue({ events: [] });
    const unsubscribe = subscribeSessionStarted(() => {}, { fetchEvents, intervalMs: 1000, onError });
    await vi.advanceTimersByTimeAsync(1000);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fetchEvents.mock.calls.length).toBeGreaterThan(1);
    unsubscribe();
  });
});
