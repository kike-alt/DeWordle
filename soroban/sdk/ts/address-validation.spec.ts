import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { isValidAddress } from "./types";

const account = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9)).publicKey();
const contract = StrKey.encodeContract(Buffer.alloc(32, 3));

describe("isValidAddress", () => {
  it("accepts valid account and contract addresses", () => {
    expect(account).toMatch(/^G[A-Z2-7]{55}$/);
    expect(isValidAddress(account)).toBe(true);
    expect(contract).toMatch(/^C[A-Z2-7]{55}$/);
    expect(isValidAddress(contract)).toBe(true);
  });

  it("rejects truncated, padded and wrong-prefix strings", () => {
    expect(isValidAddress(account.slice(0, 55))).toBe(false);
    expect(isValidAddress(account + "A")).toBe(false);
    expect(isValidAddress("X" + account.slice(1))).toBe(false);
    expect(isValidAddress("")).toBe(false);
  });

  it("rejects an invalid checksum", () => {
    const last = account.slice(-1) === "A" ? "B" : "A";
    expect(isValidAddress(account.slice(0, -1) + last)).toBe(false);
    const cLast = contract.slice(-1) === "A" ? "B" : "A";
    expect(isValidAddress(contract.slice(0, -1) + cLast)).toBe(false);
  });

  it("rejects invalid characters and non-strings", () => {
    expect(isValidAddress(account.slice(0, 10) + "!" + account.slice(11))).toBe(false);
    expect(isValidAddress(undefined as unknown as string)).toBe(false);
    expect(isValidAddress(123 as unknown as string)).toBe(false);
  });
});
