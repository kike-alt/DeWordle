import { StrKey, type Transaction } from "@stellar/stellar-sdk";
import type { Api } from "@stellar/stellar-sdk/rpc";

export type SessionStatus = "InProgress" | "Won" | "Lost" | "Finalized";

export interface DayConfig {
  dayId: number;
  puzzleCommitment: string;
  maxAttempts: number;
  closesAt: number;
  published: boolean;
}

export interface Session {
  id: string;
  player: string;
  dayId: number;
  attemptsUsed: number;
  maxAttempts: number;
  status: SessionStatus;
  finalized: boolean;
  startedAt: number;
  updatedAt: number;
}

export interface GuessResult {
  attemptNo: number;
  outcomeCode: number;
  isCorrect: boolean;
}

export interface SubmitGuessInput {
  player: string;
  sessionId: string;
  guessCommitment: string;
  outcomeCode: number;
  isCorrect: boolean;
}

export interface TxBuildResult {
  simulated: Api.SimulateTransactionResponse;
  assembled: Transaction;
}

/**
 * True for a valid StrKey account address ("G...", Ed25519 public key) or
 * contract address ("C..."), including the checksum. Never throws.
 */
export function isValidAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  try {
    return StrKey.isValidEd25519PublicKey(address) || StrKey.isValidContract(address);
  } catch {
    return false;
  }
}
