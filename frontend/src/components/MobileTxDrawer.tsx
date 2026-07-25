"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { TxLifecycleStatus } from "@/lib/stellar/soroban";
import { TxStatusTimeline } from "@/components/TxStatusTimeline";

interface MobileTxDrawerProps {
  open: boolean;
  onClose: () => void;
  status: TxLifecycleStatus;
  retryHint?: string;
  walletError?: string;
  children?: ReactNode;
}

const STATE_LABELS: Record<TxLifecycleStatus["state"], string> = {
  idle: "No active transaction",
  simulating: "Simulating transaction...",
  signing: "Please sign in your wallet",
  submitting: "Submitting to network...",
  success: "Transaction confirmed",
  error: "Transaction failed",
};

export function MobileTxDrawer({
  open,
  onClose,
  status,
  retryHint,
  walletError,
  children,
}: MobileTxDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Transaction status"
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-primary-800/60 bg-primary-950 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary-100">
            {STATE_LABELS[status.state]}
          </h2>
          <button
            onClick={onClose}
            className="text-primary-300 hover:text-primary-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <TxStatusTimeline status={status} />

        {walletError && (
          <p className="mt-3 rounded border border-red-800/40 bg-red-950/20 p-3 text-xs text-red-300">
            {walletError}
          </p>
        )}

        {retryHint && status.state === "error" && (
          <p className="mt-2 text-xs text-primary-300">{retryHint}</p>
        )}

        {children && <div className="mt-4">{children}</div>}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-primary-700/50 py-3 text-sm font-medium text-primary-200 hover:bg-primary-900/50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
