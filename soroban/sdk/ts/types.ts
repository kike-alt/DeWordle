import type { Transaction } from "@stellar/stellar-sdk";
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
