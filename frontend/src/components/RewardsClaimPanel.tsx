"use client";

import { useState } from "react";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { TxStatusTimeline } from "@/components/TxStatusTimeline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RewardItem {
  id: string;
  label: string;
  amount: string;
  status: "accrued" | "claimable" | "claiming" | "pending_confirmation" | "claimed" | "failed";
  txHash?: string;
}

const STATUS_BADGE: Record<RewardItem["status"], { label: string; color: string }> = {
  accrued: { label: "Accrued", color: "bg-blue-900/40 text-blue-300 border-blue-800/40" },
  claimable: { label: "Claimable", color: "bg-green-900/40 text-green-300 border-green-800/40" },
  claiming: { label: "Claiming...", color: "bg-yellow-900/40 text-yellow-300 border-yellow-800/40" },
  pending_confirmation: { label: "Pending", color: "bg-purple-900/40 text-purple-300 border-purple-800/40" },
  claimed: { label: "Claimed", color: "bg-green-900/40 text-green-300 border-green-800/40" },
  failed: { label: "Failed", color: "bg-red-900/40 text-red-300 border-red-800/40" },
};

function RewardRow({ reward, onClaim }: { reward: RewardItem; onClaim: (id: string) => void }) {
  const badge = STATUS_BADGE[reward.status];
  const isActionable = reward.status === "claimable";

  return (
    <div className="flex items-center justify-between rounded-lg border border-primary-800/40 bg-primary-950/30 px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary-100">{reward.label}</span>
        <span className="text-xs text-primary-300">{reward.amount}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
        {isActionable && (
          <button
            onClick={() => onClaim(reward.id)}
            className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            Claim
          </button>
        )}
        {reward.txHash && (
          <span className="text-xs text-primary-400 font-mono" title={reward.txHash}>
            {reward.txHash.slice(0, 8)}...
          </span>
        )}
      </div>
    </div>
  );
}

interface RewardsClaimPanelProps {
  rewards: RewardItem[];
}

export function RewardsClaimPanel({ rewards }: RewardsClaimPanelProps) {
  const wallet = useStellarWallet();
  const [items, setItems] = useState<RewardItem[]>(rewards);

  const handleClaim = async (id: string) => {
    const preConditions = !wallet.connected ? "wallet_not_connected" : null;
    if (preConditions) {
      setItems((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "failed" as const } : r,
        ),
      );
      return;
    }

    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "claiming" as const } : r)),
    );

    try {
      setItems((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "pending_confirmation" as const } : r,
        ),
      );

      // Simulate claim transaction flow
      await wallet.ensureConnected();

      setItems((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "claimed" as const, txHash: crypto.randomUUID() }
            : r,
        ),
      );
    } catch {
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "failed" as const } : r)),
      );
    }
  };

  const actionableCount = items.filter((r) => r.status === "claimable").length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rewards</CardTitle>
            <CardDescription>
              Your accrued and claimable rewards from gameplay.
            </CardDescription>
          </div>
          {actionableCount > 0 && (
            <span className="rounded-full bg-green-900/60 px-3 py-1 text-xs font-semibold text-green-300">
              {actionableCount} claimable
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {wallet.readOnly && (
          <div className="mb-4 rounded-lg border border-yellow-800/40 bg-yellow-950/20 p-3 text-sm text-yellow-300">
            Connect your wallet to claim rewards.
          </div>
        )}

        {items.length === 0 && (
          <p className="text-sm text-primary-300">No rewards to display yet.</p>
        )}

        <div className="space-y-3">
          {items.map((reward) => (
            <RewardRow key={reward.id} reward={reward} onClaim={handleClaim} />
          ))}
        </div>

        {items.some((r) => r.status === "claiming" || r.status === "pending_confirmation") && (
          <div className="mt-4">
            <TxStatusTimeline
              status={{
                id: "claim",
                state: items.some((r) => r.status === "claiming")
                  ? "signing"
                  : items.some((r) => r.status === "pending_confirmation")
                    ? "submitting"
                    : "idle",
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
