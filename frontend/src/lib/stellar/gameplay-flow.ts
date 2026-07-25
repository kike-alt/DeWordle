import type { TxLifecycleStatus } from "./soroban";

export type GameplayTxKind = "create_session" | "submit_guess" | "finalize_session";

export interface GameplayTxSnapshot {
  pendingId?: string;
  optimisticSessionId?: string;
  confirmedHash?: string;
  lastError?: string;
}

/**
 * Optimistic session state — represents what the UI shows before chain confirmation.
 * Kept separate from confirmed state to allow clean rollback.
 */
export interface OptimisticSessionState {
  sessionId: string;
  /** True while the tx is in-flight and not yet confirmed on-chain. */
  isPending: boolean;
  /** Populated once the tx is confirmed. */
  confirmedHash?: string;
  /** Populated on failure; use to trigger rollback UI. */
  error?: string;
}

/**
 * Confirmed session state — reflects what is known to be on-chain.
 */
export interface ConfirmedSessionState {
  sessionId: string;
  txHash: string;
}

export function nextLifecycle(id: string, state: TxLifecycleStatus["state"], error?: string) {
  return {
    id,
    state,
    error,
  } satisfies TxLifecycleStatus;
}

/**
 * Reconcile optimistic gameplay state with a confirmed (or failed) tx result.
 *
 * State transitions:
 * - signing/submitting → optimistic pending (no confirmed hash yet)
 * - success           → confirmed (pendingId cleared, confirmedHash set)
 * - error             → rollback (pendingId cleared, lastError set)
 * - idle              → empty snapshot
 */
export function reconcileGameplayState(input: {
  status: TxLifecycleStatus;
  optimisticSessionId?: string;
  txHash?: string;
}): GameplayTxSnapshot {
  if (input.status.state === "error") {
    return {
      pendingId: undefined,
      optimisticSessionId: input.optimisticSessionId,
      lastError: input.status.error,
    };
  }

  if (input.status.state === "success") {
    return {
      pendingId: undefined,
      optimisticSessionId: input.optimisticSessionId,
      confirmedHash: input.txHash ?? input.status.txHash,
    };
  }

  if (input.status.state === "signing" || input.status.state === "submitting") {
    return {
      pendingId: input.status.id,
      optimisticSessionId: input.optimisticSessionId,
    };
  }

  return {};
}

/**
 * Derive an OptimisticSessionState from a snapshot.
 * Useful for components that need a single object representing the current session.
 */
export function deriveOptimisticState(
  snapshot: GameplayTxSnapshot,
): OptimisticSessionState | null {
  const sessionId = snapshot.optimisticSessionId;
  if (!sessionId) return null;

  return {
    sessionId,
    isPending: !!snapshot.pendingId && !snapshot.confirmedHash && !snapshot.lastError,
    confirmedHash: snapshot.confirmedHash,
    error: snapshot.lastError,
  };
}

/**
 * Returns true if the snapshot represents a clean confirmed state (no pending, no error).
 */
export function isConfirmed(snapshot: GameplayTxSnapshot): boolean {
  return !!snapshot.confirmedHash && !snapshot.pendingId && !snapshot.lastError;
}

/**
 * Returns true if the snapshot is in a rollback/error state.
 */
export function needsRollback(snapshot: GameplayTxSnapshot): boolean {
  return !!snapshot.lastError && !snapshot.confirmedHash;
}
