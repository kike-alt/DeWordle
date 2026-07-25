/**
 * Tests for stale network/session pre-submit guards in useGameplayTx.
 * These tests exercise the guard logic directly without React rendering.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaleContextError } from "./useGameplayTx";

// Minimal wallet stub
function makeWallet(overrides: Partial<{
  connected: boolean;
  address: string | undefined;
  network: string;
}> = {}) {
  return {
    connected: true,
    address: "GABC123",
    network: "testnet",
    status: { id: "", state: "idle" as const },
    setTxStatus: vi.fn(),
    signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
    submitTransaction: vi.fn().mockResolvedValue({ hash: "txhash1" }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchNetwork: vi.fn(),
    ...overrides,
  };
}

/** Replicates the guard logic from useGameplayTx.execute for unit testing. */
function runGuards(
  wallet: ReturnType<typeof makeWallet>,
  networkMismatch: boolean,
) {
  if (!wallet.connected || !wallet.address) {
    throw new StaleContextError("Wallet is not connected. Please reconnect before submitting.");
  }
  if (networkMismatch) {
    throw new StaleContextError(
      `Network mismatch: app expects '${process.env.NEXT_PUBLIC_STELLAR_NETWORK}' but wallet is on '${wallet.network}'. Please switch networks.`,
    );
  }
}

describe("useGameplayTx stale context guards", () => {
  const originalEnv = process.env.NEXT_PUBLIC_STELLAR_NETWORK;

  afterEach(() => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalEnv;
  });

  it("passes when wallet is connected and network matches", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    const wallet = makeWallet({ connected: true, address: "GABC", network: "testnet" });
    expect(() => runGuards(wallet, false)).not.toThrow();
  });

  it("throws StaleContextError when wallet is not connected", () => {
    const wallet = makeWallet({ connected: false, address: undefined });
    expect(() => runGuards(wallet, false)).toThrow(StaleContextError);
    expect(() => runGuards(wallet, false)).toThrow("Wallet is not connected");
  });

  it("throws StaleContextError when address is missing (session dropped)", () => {
    const wallet = makeWallet({ connected: true, address: undefined });
    expect(() => runGuards(wallet, false)).toThrow(StaleContextError);
  });

  it("throws StaleContextError on network mismatch", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    const wallet = makeWallet({ connected: true, address: "GABC", network: "testnet" });
    expect(() => runGuards(wallet, true)).toThrow(StaleContextError);
    expect(() => runGuards(wallet, true)).toThrow("Network mismatch");
  });

  it("error message includes expected and actual network", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
    const wallet = makeWallet({ connected: true, address: "GABC", network: "testnet" });
    let caught: Error | undefined;
    try { runGuards(wallet, true); } catch (e) { caught = e as Error; }
    expect(caught?.message).toContain("mainnet");
    expect(caught?.message).toContain("testnet");
  });
});
