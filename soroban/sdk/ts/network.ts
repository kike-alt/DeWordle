import { diagnoseRegistryMismatch, formatRegistryMismatchDiagnostics } from "./registry-diagnostics";

export type NetworkName = "testnet" | "mainnet";

export interface SorobanNetworkConfig {
  name: NetworkName;
  rpcUrl: string;
  passphrase: string;
  horizonUrl?: string;
}

export interface ContractRegistry {
  network: NetworkName;
  contracts: {
    admin_registry: string;
    core_game: string;
    rewards: string;
    achievements: string;
  };
}

export const NETWORKS: Record<NetworkName, SorobanNetworkConfig> = {
  testnet: {
    name: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
  },
  mainnet: {
    name: "mainnet",
    rpcUrl: "https://mainnet.sorobanrpc.com",
    passphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
  },
};

// --- Registry loader adapters ---

/**
 * Load registry from environment variables.
 * Expected env keys: SOROBAN_NETWORK, SOROBAN_CONTRACT_ADMIN_REGISTRY,
 * SOROBAN_CONTRACT_CORE_GAME, SOROBAN_CONTRACT_REWARDS, SOROBAN_CONTRACT_ACHIEVEMENTS
 */
export function loadRegistryFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): ContractRegistry {
  const network = env["SOROBAN_NETWORK"] as NetworkName | undefined;
  if (!network || !["testnet", "mainnet"].includes(network)) {
    throw new Error(
      `SOROBAN_NETWORK must be "testnet" or "mainnet", got: ${network ?? "(unset)"}`,
    );
  }

  const contracts = {
    admin_registry: env["SOROBAN_CONTRACT_ADMIN_REGISTRY"] ?? "",
    core_game: env["SOROBAN_CONTRACT_CORE_GAME"] ?? "",
    rewards: env["SOROBAN_CONTRACT_REWARDS"] ?? "",
    achievements: env["SOROBAN_CONTRACT_ACHIEVEMENTS"] ?? "",
  };

  const missing = Object.entries(contracts)
    .filter(([, v]) => !v.trim())
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(`Missing contract addresses in env: ${missing.join(", ")}`);
  }

  return { network, contracts };
}

/**
 * Load registry from a plain JSON object (e.g. imported JSON file or fetch response).
 * Validates that all required fields are present.
 */
export function loadRegistryFromJson(json: unknown): ContractRegistry {
  if (!json || typeof json !== "object") {
    throw new Error("Registry JSON must be a non-null object");
  }

  const obj = json as Record<string, unknown>;
  const network = obj["network"] as NetworkName | undefined;

  if (!network || !["testnet", "mainnet"].includes(network)) {
    throw new Error(`Registry JSON: invalid network "${network}"`);
  }

  const contracts = obj["contracts"] as Record<string, string> | undefined;
  if (!contracts || typeof contracts !== "object") {
    throw new Error("Registry JSON: missing contracts object");
  }

  const required = ["admin_registry", "core_game", "rewards", "achievements"] as const;
  const missing = required.filter((k) => !contracts[k]?.trim());
  if (missing.length > 0) {
    throw new Error(`Registry JSON: missing contract addresses: ${missing.join(", ")}`);
  }

  return {
    network,
    contracts: {
      admin_registry: contracts["admin_registry"],
      core_game: contracts["core_game"],
      rewards: contracts["rewards"],
      achievements: contracts["achievements"],
    },
  };
}

/**
 * Load registry via an injected async provider function.
 * Use this for runtime/dynamic sources (e.g. API fetch, wallet context).
 */
export async function loadRegistryFromProvider(
  provider: () => Promise<ContractRegistry>,
): Promise<ContractRegistry> {
  const registry = await provider();
  // Validate network matches a known value
  if (!["testnet", "mainnet"].includes(registry.network)) {
    throw new Error(`Registry provider returned invalid network: ${registry.network}`);
  }
  return registry;
}

/**
 * Primary loader — tries env first, then falls back to a custom loader.
 * Throws a descriptive error on network mismatch.
 */
export async function loadContractRegistry(
  network: NetworkName,
  loader?: () => Promise<ContractRegistry>,
): Promise<ContractRegistry> {
  let registry: ContractRegistry;

  if (loader) {
    registry = await loadRegistryFromProvider(loader);
  } else {
    try {
      registry = loadRegistryFromEnv();
    } catch {
      throw new Error(
        `No contract registry loader provided for ${network}. ` +
          `Set SOROBAN_NETWORK and SOROBAN_CONTRACT_* env vars, or pass a loader function.`,
      );
    }
  }

  if (registry.network !== network) {
    const diagnostics = diagnoseRegistryMismatch({
      expectedNetwork: network,
      actualNetwork: registry.network,
    });
    throw new Error(
      `Contract registry network mismatch: expected "${network}", got "${registry.network}". ` +
        formatRegistryMismatchDiagnostics(diagnostics!),
    );
  }

  return registry;
}
