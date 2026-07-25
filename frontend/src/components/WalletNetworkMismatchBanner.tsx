"use client";

import type { StellarNetwork } from "@/lib/stellar/network";

interface WalletNetworkMismatchBannerProps {
  activeNetwork: StellarNetwork;
  configuredNetwork: StellarNetwork;
  onSwitch: (network: StellarNetwork) => void;
}

/**
 * Displays a banner when the wallet's active network does not match the
 * configured Soroban target network. Provides a one-click recovery action.
 */
export function WalletNetworkMismatchBanner({
  activeNetwork,
  configuredNetwork,
  onSwitch,
}: WalletNetworkMismatchBannerProps) {
  if (activeNetwork === configuredNetwork) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-4 rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-900"
    >
      <span>
        <strong>Network mismatch:</strong> your wallet is on{" "}
        <strong>{activeNetwork}</strong>, but this app requires{" "}
        <strong>{configuredNetwork}</strong>.
      </span>
      <button
        type="button"
        onClick={() => onSwitch(configuredNetwork)}
        className="shrink-0 rounded bg-yellow-400 px-3 py-1 font-medium text-yellow-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-600"
      >
        Switch to {configuredNetwork}
      </button>
    </div>
  );
}
