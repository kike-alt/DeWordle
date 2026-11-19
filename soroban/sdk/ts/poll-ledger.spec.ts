import { describe, expect, it, vi } from "vitest";
import { LedgerPollTimeoutError, pollUntilLedger } from "./network";

function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms: number) => void (t += ms) };
}

describe("pollUntilLedger", () => {
  it("resolves with the ledger once it reaches the target", async () => {
    const { now, sleep } = clock();
    const seqs = [100, 101, 103];
    const server = { getLatestLedger: vi.fn(async () => ({ sequence: seqs.shift() ?? 103 })) };
    await expect(pollUntilLedger(server, 102, { now, sleep })).resolves.toBe(103);
    expect(server.getLatestLedger).toHaveBeenCalledTimes(3);
  });

  it("resolves immediately when already past the target", async () => {
    const { now, sleep } = clock();
    const server = { getLatestLedger: vi.fn(async () => ({ sequence: 500 })) };
    await expect(pollUntilLedger(server, 400, { now, sleep })).resolves.toBe(500);
    expect(server.getLatestLedger).toHaveBeenCalledTimes(1);
  });

  it("rejects with a timeout error after timeoutMs", async () => {
    const { now, sleep } = clock();
    const server = { getLatestLedger: vi.fn(async () => ({ sequence: 10 })) };
    const promise = pollUntilLedger(server, 99, { timeoutMs: 3000, intervalMs: 1000, now, sleep });
    await expect(promise).rejects.toBeInstanceOf(LedgerPollTimeoutError);
    await expect(promise).rejects.toThrow(/ledger 99.*last seen 10/);
  });

  it("uses the configured polling interval", async () => {
    const delays: number[] = [];
    const t = { v: 0 };
    const server = { getLatestLedger: vi.fn(async () => ({ sequence: delays.length >= 2 ? 5 : 1 })) };
    await pollUntilLedger(server, 5, {
      intervalMs: 250,
      now: () => t.v,
      sleep: async (ms) => void (delays.push(ms), (t.v += ms)),
    });
    expect(delays).toEqual([250, 250]);
  });
});
