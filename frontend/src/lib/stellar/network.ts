export type StellarNetwork = "testnet" | "mainnet";

export interface StellarNetworkConfig {
  network: StellarNetwork;
  rpcUrl: string;
  horizonUrl: string;
  passphrase: string;
}

export const STELLAR_NETWORKS: Record<StellarNetwork, StellarNetworkConfig> = {
  testnet: {
    network: "testnet",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
    passphrase: "Test SDF Network ; September 2015",
  },
  mainnet: {
    network: "mainnet",
    rpcUrl: "https://mainnet.sorobanrpc.com",
    horizonUrl: "https://horizon.stellar.org",
    passphrase: "Public Global Stellar Network ; September 2015",
  },
};

export function getDefaultNetwork(): StellarNetwork {
  const env = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  if (env === "mainnet") return "mainnet";
  return "testnet";
}

/**
 * Validates the transport protocol of a Soroban RPC URL.
 * Throws an Error if an insecure endpoint is configured outside of local development.
 */
export function validateRpcUrl(rpcUrl: string, env: string = process.env.NODE_ENV || "development"): void {
  try {
    const url = new URL(rpcUrl);

    if (env === "production" || env === "test") {
      if (url.protocol !== "https:") {
        throw new Error(`Insecure RPC URL '${rpcUrl}' is strictly forbidden in ${env}.`);
      }
      return;
    }

    if (url.protocol === "http:") {
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        throw new Error(`Insecure RPC URL '${rpcUrl}' is only permitted for localhost during development.`);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Insecure RPC URL")) {
      throw error;
    }
    throw new Error(`Malformed RPC URL: '${rpcUrl}'`);
  }
}
