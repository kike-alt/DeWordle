"use client";

import type { TxLifecycleStatus } from "@/lib/stellar/soroban";

const STEPS: TxLifecycleStatus["state"][] = [
  "idle",
  "simulating",
  "signing",
  "submitting",
  "success",
];

const STEP_LABELS: Record<TxLifecycleStatus["state"], string> = {
  idle: "Idle",
  simulating: "Simulating",
  signing: "Signing",
  submitting: "Submitting",
  success: "Confirmed",
  error: "Failed",
};

interface TxStatusTimelineProps {
  status: TxLifecycleStatus;
}

/**
 * Renders a horizontal step timeline for wallet transaction lifecycle states.
 * Supports: idle / simulating / signing / submitting / success / error.
 * Error and tx hash are rendered safely (no raw XDR or secrets exposed).
 *
 * @example
 * <TxStatusTimeline status={walletStatus} />
 */
export function TxStatusTimeline({ status }: TxStatusTimelineProps) {
  const isError = status.state === "error";
  const activeIndex = isError ? -1 : STEPS.indexOf(status.state);
  const statusLabel = isError
    ? `Transaction failed: ${status.error ?? "Unknown error"}`
    : `Transaction status: ${STEP_LABELS[status.state]}`;

  return (
    <div
      aria-label="Transaction status"
      aria-live="polite"
      aria-atomic="true"
      className="w-full"
    >
      {/* Visually hidden live region for screen readers */}
      <span className="sr-only">{statusLabel}</span>

      <ol className="flex items-center justify-between gap-1" aria-hidden="true">
        {STEPS.map((step, i) => {
          const isDone = !isError && i < activeIndex;
          const isActive = !isError && i === activeIndex;

          return (
            <li key={step} className="relative flex flex-1 flex-col items-center gap-1">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={`absolute -left-1/2 top-3 h-0.5 w-full ${
                    isDone ? "bg-green-500" : "bg-gray-200"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Circle */}
              <span
                aria-current={isActive ? "step" : undefined}
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  isDone
                    ? "bg-green-500 text-white"
                    : isActive
                      ? "bg-blue-600 text-white ring-2 ring-blue-300"
                      : "bg-gray-200 text-gray-500",
                ].join(" ")}
              >
                {isDone ? "✓" : i + 1}
              </span>

              {/* Label */}
              <span
                className={`text-xs ${
                  isActive ? "font-semibold text-blue-700" : "text-gray-500"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>

      {isError && (
        <p
          role="alert"
          className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <strong>Transaction failed:</strong>{" "}
          {status.error ?? "An unknown error occurred."}
        </p>
      )}

      {status.state === "success" && status.txHash && (
        <p className="mt-2 truncate text-center text-xs text-gray-500">
          Tx:{" "}
          <span className="font-mono" title={status.txHash}>
            {status.txHash.slice(0, 12)}…{status.txHash.slice(-8)}
          </span>
        </p>
      )}
    </div>
  );
}
