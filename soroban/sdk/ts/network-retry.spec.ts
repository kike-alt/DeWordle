import { describe, expect, it, vi } from "vitest";
import { isTransientRpcError, withRetry } from "./network";

const noSleep = () => {
  const delays: number[] = [];
  return { delays, sleep: async (ms: number) => void delays.push(ms) };
};
const http = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe("withRetry", () => {
  it("retries transient errors and eventually succeeds", async () => {
    const { delays, sleep } = noSleep();
    const fn = vi.fn().mockRejectedValueOnce(http(503)).mockRejectedValueOnce(http(429)).mockResolvedValue("ok");
    await expect(withRetry(fn, { sleep, random: () => 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([500, 1000]);
  });

  it("doubles the delay each retry and adds jitter", async () => {
    const { delays, sleep } = noSleep();
    const fn = vi.fn().mockRejectedValue(http(502));
    await expect(withRetry(fn, { sleep, random: () => 0.5 })).rejects.toThrow("HTTP 502");
    expect(fn).toHaveBeenCalledTimes(4); // first attempt + 3 retries
    expect(delays).toEqual([625, 1250, 2500]);
  });

  it("fails fast on HTTP 400 and simulation failures", async () => {
    const { sleep } = noSleep();
    const bad = vi.fn().mockRejectedValue(http(400));
    await expect(withRetry(bad, { sleep })).rejects.toThrow("HTTP 400");
    expect(bad).toHaveBeenCalledTimes(1);

    const sim = vi.fn().mockRejectedValue(new Error("Simulation failed: Error(Contract, #4) 503"));
    await expect(withRetry(sim, { sleep })).rejects.toThrow(/Simulation failed/);
    expect(sim).toHaveBeenCalledTimes(1);
  });
});

describe("isTransientRpcError", () => {
  it("recognises 429/502/503/504 from status fields or messages", () => {
    for (const status of [429, 502, 503, 504]) expect(isTransientRpcError(http(status))).toBe(true);
    expect(isTransientRpcError(new Error("upstream returned 504 gateway timeout"))).toBe(true);
    expect(isTransientRpcError({ response: { status: 503 } })).toBe(true);
  });

  it("treats other errors as non-transient", () => {
    expect(isTransientRpcError(http(400))).toBe(false);
    expect(isTransientRpcError(new Error("boom"))).toBe(false);
    expect(isTransientRpcError(undefined)).toBe(false);
  });
});
