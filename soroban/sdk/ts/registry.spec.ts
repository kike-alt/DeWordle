import { describe, expect, it } from "vitest";
import {
  NETWORKS,
  loadContractRegistry,
  loadRegistryFromEnv,
  loadRegistryFromJson,
  loadRegistryFromProvider,
  type ContractRegistry,
} from "./network";
import { assertRegistryNetwork, resolveContractId } from "./registry";
import { diagnoseRegistryMismatch, formatRegistryMismatchDiagnostics } from "./registry-diagnostics";
import { CONTRACT_IDS, REGISTRY } from "./testing/rpc-mock";

const env = (over: Record<string, string | undefined> = {}) => ({
  SOROBAN_NETWORK: "testnet",
  SOROBAN_CONTRACT_ADMIN_REGISTRY: CONTRACT_IDS.admin_registry,
  SOROBAN_CONTRACT_CORE_GAME: CONTRACT_IDS.core_game,
  SOROBAN_CONTRACT_REWARDS: CONTRACT_IDS.rewards,
  SOROBAN_CONTRACT_ACHIEVEMENTS: CONTRACT_IDS.achievements,
  ...over,
});

describe("NETWORKS", () => {
  it("defines testnet, futurenet, and mainnet with their passphrases", () => {
    expect(NETWORKS.testnet.passphrase).toBe("Test SDF Network ; September 2015");
    expect(NETWORKS.futurenet.passphrase).toBe("Test SDF Future Network ; October 2022");
    expect(NETWORKS.mainnet.passphrase).toBe("Public Global Stellar Network ; September 2015");
  });
});

describe("resolveContractId / assertRegistryNetwork", () => {
  it("returns the configured id", () => {
    expect(resolveContractId(REGISTRY, "rewards")).toBe(CONTRACT_IDS.rewards);
  });

  it("explains a missing id and how to fix it", () => {
    const registry: ContractRegistry = { ...REGISTRY, contracts: { ...REGISTRY.contracts, rewards: " " } };
    expect(() => resolveContractId(registry, "rewards")).toThrow(/Missing contract id for rewards.*missing_contract_id/s);
  });

  it("accepts a matching network and rejects a mismatch", () => {
    expect(() => assertRegistryNetwork(REGISTRY, "testnet")).not.toThrow();
    expect(() => assertRegistryNetwork(REGISTRY, "mainnet")).toThrow(/expected mainnet, got testnet/);
  });
});

describe("loadRegistryFromEnv", () => {
  it("reads the network and all four contract ids", () => {
    expect(loadRegistryFromEnv(env())).toEqual(REGISTRY);
  });

  it("accepts a futurenet registry", () => {
    expect(loadRegistryFromEnv(env({ SOROBAN_NETWORK: "futurenet" })).network).toBe("futurenet");
  });

  it("rejects an unset or unsupported network", () => {
    expect(() => loadRegistryFromEnv(env({ SOROBAN_NETWORK: undefined }))).toThrow(/\(unset\)/);
    expect(() => loadRegistryFromEnv(env({ SOROBAN_NETWORK: "devnet" }))).toThrow(/devnet/);
  });

  it("lists every missing contract address", () => {
    expect(() =>
      loadRegistryFromEnv(env({ SOROBAN_CONTRACT_REWARDS: "", SOROBAN_CONTRACT_CORE_GAME: undefined })),
    ).toThrow(/core_game, rewards/);
  });
});

describe("loadRegistryFromJson", () => {
  it("accepts a complete registry", () => {
    expect(loadRegistryFromJson(REGISTRY)).toEqual(REGISTRY);
  });

  it("rejects non-objects, bad networks and missing parts", () => {
    expect(() => loadRegistryFromJson(null)).toThrow(/non-null object/);
    expect(() => loadRegistryFromJson({ network: "x", contracts: {} })).toThrow(/invalid network/);
    expect(() => loadRegistryFromJson({ network: "testnet" })).toThrow(/missing contracts object/);
    expect(() => loadRegistryFromJson({ network: "testnet", contracts: { core_game: "C" } })).toThrow(
      /admin_registry, rewards, achievements/,
    );
  });
});

describe("loadRegistryFromProvider / loadContractRegistry", () => {
  it("returns what the provider returns", async () => {
    await expect(loadRegistryFromProvider(async () => REGISTRY)).resolves.toEqual(REGISTRY);
  });

  it("rejects a provider that returns an unknown network", async () => {
    const bad = { ...REGISTRY, network: "devnet" } as unknown as ContractRegistry;
    await expect(loadRegistryFromProvider(async () => bad)).rejects.toThrow(/invalid network: devnet/);
  });

  it("uses a custom loader and checks it against the requested network", async () => {
    await expect(loadContractRegistry("testnet", async () => REGISTRY)).resolves.toEqual(REGISTRY);
    await expect(loadContractRegistry("mainnet", async () => REGISTRY)).rejects.toThrow(/network mismatch/);
  });

  it("explains how to configure the registry when no loader or env is available", async () => {
    const saved = { ...process.env };
    for (const key of Object.keys(process.env)) if (key.startsWith("SOROBAN_")) delete process.env[key];
    try {
      await expect(loadContractRegistry("testnet")).rejects.toThrow(/No contract registry loader provided/);
    } finally {
      Object.assign(process.env, saved);
    }
  });
});

describe("registry diagnostics", () => {
  it("diagnoses a network mismatch, a missing id and an invalid network", () => {
    expect(diagnoseRegistryMismatch({ expectedNetwork: "mainnet", actualNetwork: "testnet" })?.cause).toBe("network_mismatch");
    expect(diagnoseRegistryMismatch({ contractKey: "rewards", missingContractId: true })?.cause).toBe("missing_contract_id");
    expect(diagnoseRegistryMismatch({ expectedNetwork: "testnet", actualNetwork: "testnet" })).toBeNull();
    expect(diagnoseRegistryMismatch({})).toBeNull();
  });

  it("formats diagnostics with the cause and remediation", () => {
    const text = formatRegistryMismatchDiagnostics(
      diagnoseRegistryMismatch({ expectedNetwork: "mainnet", actualNetwork: "testnet" })!,
    );
    expect(text).toMatch(/cause=network_mismatch, expected=mainnet, actual=testnet\. Remediation:/);
  });
});
