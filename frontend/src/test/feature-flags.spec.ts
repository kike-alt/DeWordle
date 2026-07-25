import { describe, it, expect, vi, beforeEach } from "vitest";

describe("FEATURE_FLAGS", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("flags default to false when env vars are unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_REWARDS", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ACHIEVEMENTS", "");
    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");
    expect(FEATURE_FLAGS.rewards).toBe(false);
    expect(FEATURE_FLAGS.achievements).toBe(false);
  });

  it("enables rewards flag when env var is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_REWARDS", "true");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ACHIEVEMENTS", "");
    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");
    expect(FEATURE_FLAGS.rewards).toBe(true);
    expect(FEATURE_FLAGS.achievements).toBe(false);
  });

  it("enables achievements flag when env var is 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_REWARDS", "");
    vi.stubEnv("NEXT_PUBLIC_FEATURE_ACHIEVEMENTS", "true");
    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");
    expect(FEATURE_FLAGS.rewards).toBe(false);
    expect(FEATURE_FLAGS.achievements).toBe(true);
  });
});
