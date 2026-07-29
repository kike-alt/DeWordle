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
 * Known Soroban contract error codes mapped to human-readable descriptions.
 * Based on CoreGameError enum in soroban/contracts/core_game/src/lib.rs.
 */
const CONTRACT_ERROR_CODES: Record<number, string> = {
  1: "AlreadyInitialized — contract has already been initialized",
  2: "InvalidMaxAttempts — max attempts value is out of valid range",
  3: "DayNotFound — no word set for the current day",
  4: "DayNotActive — the day window has not started yet",
  5: "DayClosed — the day window has already closed",
  6: "NonceAlreadyUsed — this nonce has already been consumed",
  7: "SessionNotFound — no game session found for the given id",
  8: "UnauthorizedSessionOwner — caller is not the session owner",
  9: "SessionAlreadyFinalized — session has already been finalized",
  10: "AttemptLimitReached — maximum guess attempts have been exhausted",
  11: "SessionStillInProgress — session has not been finalized yet",
  13: "InvalidCommitment — the submitted commitment is invalid",
  14: "ContractPaused — contract operations are currently paused",
};

/**
 * Normalize a simulation or submission error into a consistent message string.
 * Decodes known Soroban contract error codes (e.g. "Error(Contract, #7)")
 * into human-readable diagnostic messages. Falls back to the raw error string
 * for unknown codes.
 */
export function normalizeTxError(error: unknown): string {
  let raw: string;
  if (error instanceof Error) raw = error.message;
  else if (typeof error === "string") raw = error;
  else if (error && typeof error === "object" && "message" in error) {
    raw = String((error as { message: unknown }).message);
  } else {
    return "Unknown transaction error";
  }

  // Attempt to extract a known contract error code from "Error(Contract, #N)"
  const match = raw.match(/Error\(Contract,\s*#(\d+)\)/);
  if (match) {
    const code = parseInt(match[1], 10);
    const description = CONTRACT_ERROR_CODES[code];
    if (description) {
      return `${raw} — ${description}`;
    }
    return `${raw} — Unknown contract error code ${code}`;
  }

  return raw;
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
