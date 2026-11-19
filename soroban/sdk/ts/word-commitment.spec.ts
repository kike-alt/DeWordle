import { describe, expect, it } from "vitest";
import { hashWordCommitment, normalizeCommitmentWord, verifyWordCommitment } from "./core-game-client";

const salt = new Uint8Array(32).fill(7);
// sha256(salt || "crane") computed independently (Python hashlib).
const CRANE_HEX = "9f23c3f5f3424f24bbf77350096a0254aba5029326cb8f73d56ebeb2ed6e319b";
const CAFE_HEX = "3f5b9c9c2bad81c2bfb355de14100041d753b3659e4999a9b0e1490f9bc5025a";
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

describe("word commitments", () => {
  it("matches the reference vector and returns 32 bytes", () => {
    const out = hashWordCommitment("crane", salt);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBe(32);
    expect(hex(out)).toBe(CRANE_HEX);
  });

  it("normalizes case and strips non-alpha characters", () => {
    expect(normalizeCommitmentWord("CrAnE")).toBe("crane");
    expect(normalizeCommitmentWord(" c-r a_n!e1 ")).toBe("crane");
    expect(hex(hashWordCommitment("CRANE", salt))).toBe(CRANE_HEX);
    expect(hex(hashWordCommitment("c r a n e", salt))).toBe(CRANE_HEX);
  });

  it("applies Unicode normalization before stripping", () => {
    // Fullwidth letters fold to ASCII under NFKC.
    expect(normalizeCommitmentWord("\uff43\uff41\uff46\uff45")).toBe("cafe");
    expect(hex(hashWordCommitment("\uff43\uff41\uff46\uff45", salt))).toBe(CAFE_HEX);
  });

  it("verifyWordCommitment accepts matching bytes or hex and rejects others", () => {
    const bytes = hashWordCommitment("crane", salt);
    expect(verifyWordCommitment("Crane", salt, bytes)).toBe(true);
    expect(verifyWordCommitment("crane", salt, CRANE_HEX)).toBe(true);
    expect(verifyWordCommitment("slate", salt, bytes)).toBe(false);
    expect(verifyWordCommitment("crane", new Uint8Array(32).fill(8), bytes)).toBe(false);
    expect(verifyWordCommitment("crane", salt, "abcd")).toBe(false);
  });
});
