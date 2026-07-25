import {
  Account,
  Contract,
  TransactionBuilder,
  TimeoutInfinite,
  type Transaction,
  xdr,
} from "@stellar/stellar-sdk";
import { Api, Server, assembleTransaction } from "@stellar/stellar-sdk/rpc";
import type { SorobanNetworkConfig } from "./network";

export async function buildContractTx(params: {
  server: Server;
  source: Account;
  network: SorobanNetworkConfig;
  contractId: string;
  method: string;
  args?: xdr.ScVal[];
  fee?: string;
}) {
  const contract = new Contract(params.contractId);
  const tx = new TransactionBuilder(params.source, {
    fee: params.fee ?? "100",
    networkPassphrase: params.network.passphrase,
  })
    .addOperation(contract.call(params.method, ...(params.args ?? [])))
    .setTimeout(TimeoutInfinite)
    .build();

  return tx;
}

export async function simulateAndAssemble(params: {
  server: Server;
  tx: Transaction;
}) {
  const simulated = await params.server.simulateTransaction(params.tx);
  if (Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const assembled = assembleTransaction(params.tx, simulated).build();
  return { simulated, assembled };
}

export async function submitTransaction(params: {
  server: Server;
  tx: Transaction;
}): Promise<Api.SendTransactionResponse> {
  const sent = await params.server.sendTransaction(params.tx);

  if (sent.status === "ERROR") {
    throw new Error(sent.errorResult?.toXDR("base64") || "Transaction submit failed");
  }

  return sent;
}

// ---------------------------------------------------------------------------
// Lifecycle helpers — shared by FE and BE consumers
// ---------------------------------------------------------------------------

export type TxPollStatus = "PENDING" | "SUCCESS" | "FAILED" | "NOT_FOUND";

export interface TxPollResult {
  status: TxPollStatus;
  txHash: string;
  /** Populated on SUCCESS */
  resultXdr?: string;
  /** Populated on FAILED */
  errorResultXdr?: string;
}

/**
 * Poll a submitted transaction until it is finalized or the attempt limit is reached.
 * No wallet assumptions — usable from FE hooks or BE workers.
 */
export async function pollTransaction(params: {
  server: Server;
  txHash: string;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<TxPollResult> {
  const { server, txHash, maxAttempts = 20, intervalMs = 1500 } = params;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await server.getTransaction(txHash);

    if (response.status === "SUCCESS") {
      return {
        status: "SUCCESS",
        txHash,
        resultXdr: response.resultXdr.toXDR("base64"),
      };
    }

    if (response.status === "FAILED") {
      return {
        status: "FAILED",
        txHash,
        errorResultXdr: response.resultXdr.toXDR("base64"),
      };
    }

    if (response.status === "NOT_FOUND") {
      return { status: "NOT_FOUND", txHash };
    }

    // PENDING — wait and retry
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { status: "PENDING", txHash };
}

/**
 * Normalize a simulation or submission error into a consistent message string.
 * Keeps FE and BE error handling consistent without coupling to wallet types.
 */
export function normalizeTxError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown transaction error";
}

/**
 * Submit a signed XDR string and poll until finalized.
 * Convenience wrapper for FE wallet flows and BE test harnesses.
 */
export async function submitSignedTx(params: {
  server: Server;
  signedXdr: string;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<TxPollResult> {
  const { server, signedXdr, maxAttempts, intervalMs } = params;

  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const tx = TransactionBuilder.fromXDR(signedXdr, "any") as Transaction;

  const sent = await submitTransaction({ server, tx });

  if (sent.status === "ERROR") {
    return {
      status: "FAILED",
      txHash: sent.hash,
      errorResultXdr: sent.errorResult?.toXDR("base64"),
    };
  }

  return pollTransaction({ server, txHash: sent.hash, maxAttempts, intervalMs });
}
