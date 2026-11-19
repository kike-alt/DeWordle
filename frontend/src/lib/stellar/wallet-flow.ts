import { createSorobanServerConfig } from "./soroban";
import type { StellarNetwork } from "./network";

type FreighterApiLike = {
  isConnected?: () => Promise<{ isConnected: boolean }>;
  getAddress?: () => Promise<{ address?: string; error?: string }>;
  getNetwork?: () => Promise<{
    network?: string;
    networkPassphrase?: string;
    error?: string;
  }>;
  signTransaction?: (
    transactionXdr: string,
    options: { networkPassphrase: string; address?: string },
  ) => Promise<{ error?: string; signedTxXdr?: string }>;
};

declare global {
  interface Window {
    freighterApi?: FreighterApiLike;
  }
}

export async function signWithFreighter(transactionXdr: string, networkPassphrase: string) {
  if (typeof window === "undefined" || !window.freighterApi?.signTransaction) {
    throw new Error("Freighter API is unavailable in this runtime");
  }

  const response = await window.freighterApi.signTransaction(transactionXdr, {
    networkPassphrase,
    address: undefined,
  });

  if (response.error || !response.signedTxXdr) {
    throw new Error(response.error || "Freighter signing failed");
  }

  return response.signedTxXdr;
}

export async function submitSignedTransaction(
  network: StellarNetwork,
  signedTxXdr: string,
): Promise<{ hash: string }> {
  const config = createSorobanServerConfig(network);

  const res = await fetch(config.rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "sendTransaction",
      params: {
        transaction: signedTxXdr,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`RPC submission failed with status ${res.status}`);
  }

  const payload = (await res.json()) as {
    result?: { hash?: string };
    error?: { message?: string };
  };

  if (payload.error) {
    throw new Error(payload.error.message || "sendTransaction failed");
  }

  const hash = payload.result?.hash;
  if (!hash) {
    throw new Error("Missing transaction hash in RPC response");
  }

  return { hash };
}
