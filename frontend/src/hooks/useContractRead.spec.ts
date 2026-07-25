import { describe, expect, it } from "vitest";
import { diagnoseRegistryMismatch, formatRegistryMismatchDiagnostics } from "@dewordle/soroban-sdk";

describe("registry diagnostics helper", () => {
  it("describes a network mismatch with remediation guidance", () => {
    const diagnostics = diagnoseRegistryMismatch({
      expectedNetwork: "testnet",
      actualNetwork: "mainnet",
    });

    expect(diagnostics).toEqual({
      cause: "network_mismatch",
      expectedNetwork: "testnet",
      actualNetwork: "mainnet",
      remediation:
        "Load the registry for the active network or switch SOROBAN_NETWORK before resolving contract IDs.",
    });
    expect(formatRegistryMismatchDiagnostics(diagnostics!)).toContain("cause=network_mismatch");
  });
});
