"use client";

import type { StellarNetwork } from "@/lib/stellar/network";

interface NetworkCapability {
  network: StellarNetwork;
  label: string;
  available: boolean;
  description: string;
}

const CAPABILITIES: NetworkCapability[] = [
  {
    network: "testnet",
    label: "Free transactions",
    available: true,
    description: "Testnet has zero-cost operations for testing.",
  },
  {
    network: "testnet",
    label: "Daily puzzle",
    available: true,
    description: "Daily word puzzle is active on testnet.",
  },
  {
    network: "testnet",
    label: "Rewards claim",
    available: true,
    description: "Claim test rewards to verify the flow.",
  },
  {
    network: "mainnet",
    label: "Free transactions",
    available: false,
    description: "Mainnet requires XLM for transaction fees.",
  },
  {
    network: "mainnet",
    label: "Daily puzzle",
    available: true,
    description: "Daily word puzzle is active on mainnet.",
  },
  {
    network: "mainnet",
    label: "Rewards claim",
    available: true,
    description: "Claim real rewards on mainnet.",
  },
];

interface NetworkCapabilityBadgeProps {
  network: StellarNetwork;
  feature: string;
}

export function NetworkCapabilityBadge({ network, feature }: NetworkCapabilityBadgeProps) {
  const cap = CAPABILITIES.find(
    (c) => c.network === network && c.label === feature,
  );

  if (!cap) {
    return (
      <span className="rounded-full border border-gray-800/40 bg-gray-950/30 px-3 py-1 text-xs text-gray-400">
        Unknown
      </span>
    );
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        cap.available
          ? "border-green-800/40 bg-green-950/30 text-green-300"
          : "border-yellow-800/40 bg-yellow-950/30 text-yellow-300"
      }`}
      title={cap.description}
    >
      {cap.available ? "Available" : "Unavailable"}
    </span>
  );
}

interface NetworkCapabilityCalloutProps {
  network: StellarNetwork;
  feature: string;
  actionLabel: string;
}

export function NetworkCapabilityCallout({
  network,
  feature,
  actionLabel,
}: NetworkCapabilityCalloutProps) {
  const cap = CAPABILITIES.find(
    (c) => c.network === network && c.label === feature,
  );

  if (!cap || cap.available) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-yellow-800/40 bg-yellow-950/20 p-4 text-sm"
    >
      <p className="font-medium text-yellow-300">
        {actionLabel} is not available on {network}
      </p>
      <p className="mt-1 text-yellow-200/70">{cap.description}</p>
    </div>
  );
}

export function NetworkCapabilityList({ network }: { network: StellarNetwork }) {
  const caps = CAPABILITIES.filter((c) => c.network === network);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-400">
        {network} capabilities
      </h3>
      {caps.map((cap) => (
        <div
          key={cap.label}
          className="flex items-center justify-between rounded-lg border border-primary-800/40 bg-primary-950/30 px-3 py-2"
        >
          <span className="text-sm text-primary-100">{cap.label}</span>
          <NetworkCapabilityBadge network={network} feature={cap.label} />
        </div>
      ))}
    </div>
  );
}
