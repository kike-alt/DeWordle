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

const SECONDS_PER_DAY = 86_400;

/**
 * Day ID used by the contracts: whole days since the Unix epoch in UTC
 * (`ledger timestamp / 86_400`). Defaults to now.
 */
export function getDayIdFromDate(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000 / SECONDS_PER_DAY);
}

/** UTC midnight at the start of `dayId`. */
export function getDateFromDayId(dayId: number): Date {
  return new Date(dayId * SECONDS_PER_DAY * 1000);
}
