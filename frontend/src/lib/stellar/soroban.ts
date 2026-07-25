import { STELLAR_NETWORKS, type StellarNetwork, validateRpcUrl } from "./network";

export function createSorobanServerConfig(network: StellarNetwork) {
  const config = STELLAR_NETWORKS[network];
  validateRpcUrl(config.rpcUrl);
  return {
    rpcUrl: config.rpcUrl,
    passphrase: config.passphrase,
  };
}

export interface TxLifecycleStatus {
  id: string;
  state: "idle" | "simulating" | "signing" | "submitting" | "success" | "error";
  error?: string;
  txHash?: string;
}
