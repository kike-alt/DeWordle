import { describe, expect, it, vi } from "vitest";
import { ContractRegistryResolver } from "./registry";
import { REGISTRY } from "./testing/rpc-mock";

function setup(ttlMs?: number) {
  let t = 0;
  const loader = vi.fn(async () => REGISTRY);
  const resolver = new ContractRegistryResolver(loader, { ttlMs, now: () => t });
  return { loader, resolver, advance: (ms: number) => void (t += ms) };
}

describe("ContractRegistryResolver", () => {
  it("caches a resolved address so the loader runs once within the TTL", async () => {
    const { loader, resolver, advance } = setup(60_000);
    const first = await resolver.resolve("rewards");
    advance(59_999);
    const second = await resolver.resolve("rewards");
    expect(second).toBe(first);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("returns cached addresses synchronously via getCached", async () => {
    const { resolver } = setup();
    expect(resolver.getCached("rewards")).toBeUndefined();
    const address = await resolver.resolve("rewards");
    expect(resolver.getCached("rewards")).toBe(address);
  });

  it("reloads after the TTL expires", async () => {
    const { loader, resolver, advance } = setup(1000);
    await resolver.resolve("core_game");
    advance(1000);
    expect(resolver.getCached("core_game")).toBeUndefined();
    await resolver.resolve("core_game");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("clearCache forces the next resolve to hit the loader", async () => {
    const { loader, resolver } = setup();
    await resolver.resolve("achievements");
    resolver.clearCache();
    await resolver.resolve("achievements");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not cache failures", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("rpc down")).mockResolvedValue(REGISTRY);
    const resolver = new ContractRegistryResolver(loader);
    await expect(resolver.resolve("rewards")).rejects.toThrow("rpc down");
    await expect(resolver.resolve("rewards")).resolves.toBeTruthy();
  });
});
