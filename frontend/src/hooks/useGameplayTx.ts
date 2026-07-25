"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { nextLifecycle, reconcileGameplayState, type GameplayTxSnapshot } from "@/lib/stellar/gameplay-flow";

export class StaleContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaleContextError";
  }
}

export function useGameplayTx() {
  const wallet = useStellarWallet();
  const [snapshot, setSnapshot] = useState<GameplayTxSnapshot>({});
  // In-flight lock: prevents duplicate submissions
  const inFlightRef = useRef(false);

  // Reset all optimistic state whenever the connected wallet account changes.
  // Leaving stale session snapshots mounted after an account switch would let
  // the new user see (and potentially interact with) the previous account's
  // in-flight or confirmed session data.
  useEffect(() => {
    return wallet.onAccountSwitch(() => {
      inFlightRef.current = false;
      setSnapshot({});
      wallet.setTxStatus({ id: "", state: "idle" });
    });
  }, [wallet]);

  const networkMismatch = useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    if (!configured) return false;
    return configured !== wallet.network;
  }, [wallet.network]);

  const execute = useCallback(
    async (transactionXdr: string, optimisticSessionId?: string) => {
      // Pre-submit stale context guards
      if (!wallet.connected || !wallet.address) {
        throw new StaleContextError("Wallet is not connected. Please reconnect before submitting.");
      }
      if (networkMismatch) {
        throw new StaleContextError(
          `Network mismatch: app expects '${process.env.NEXT_PUBLIC_STELLAR_NETWORK}' but wallet is on '${wallet.network}'. Please switch networks.`,
        );
      }

      if (inFlightRef.current) {
        throw new Error("A transaction is already in progress. Please wait.");
      }

      inFlightRef.current = true;
      const id = crypto.randomUUID();
      wallet.setTxStatus(nextLifecycle(id, "signing"));
      setSnapshot({ pendingId: id, optimisticSessionId });

      try {
        const signed = await wallet.signTransaction(transactionXdr);
        wallet.setTxStatus(nextLifecycle(id, "submitting"));

        const submitted = await wallet.submitTransaction(signed);
        const status = nextLifecycle(id, "success");

        wallet.setTxStatus({ ...status, txHash: submitted.hash });
        setSnapshot(
          reconcileGameplayState({
            status: { ...status, txHash: submitted.hash },
            optimisticSessionId,
            txHash: submitted.hash,
          }),
        );

        return submitted;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown transaction error";
        const status = nextLifecycle(id, "error", message);
        wallet.setTxStatus(status);
        setSnapshot(
          reconcileGameplayState({
            status,
            optimisticSessionId,
          }),
        );
        throw error;
      } finally {
        inFlightRef.current = false;
      }
    },
    [wallet, networkMismatch],
  );

  /**
   * Reset snapshot and tx status to idle, enabling a safe retry.
   */
  const reset = useCallback(() => {
    inFlightRef.current = false;
    setSnapshot({});
    wallet.setTxStatus({ id: "", state: "idle" });
  }, [wallet]);

  return {
    execute,
    reset,
    snapshot,
    isInFlight: inFlightRef.current,
    networkMismatch,
    walletStatus: wallet.status,
  };
}
