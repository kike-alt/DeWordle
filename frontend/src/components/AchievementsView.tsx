"use client";

import { useCallback, useEffect, useState } from "react";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AchievementEntry {
  id: string;
  name: string;
  state: "unlocked" | "pending" | "unavailable";
  unlockedAt?: string;
}

interface AchievementSummary {
  achievements: AchievementEntry[];
  total: number;
  unlocked: number;
}

const STATE_ICON: Record<AchievementEntry["state"], string> = {
  unlocked: "✓",
  pending: "○",
  unavailable: "—",
};

const STATE_COLOR: Record<AchievementEntry["state"], string> = {
  unlocked: "text-green-400 border-green-800/40",
  pending: "text-yellow-400 border-yellow-800/40",
  unavailable: "text-gray-500 border-gray-800/40",
};

function AchievementCard({ achievement }: { achievement: AchievementEntry }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-lg border p-4 ${STATE_COLOR[achievement.state]}`}
    >
      <span className="text-xl font-bold">{STATE_ICON[achievement.state]}</span>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-primary-100">{achievement.name}</h3>
        <p className="text-xs text-primary-300 capitalize">{achievement.state}</p>
      </div>
      {achievement.unlockedAt && (
        <span className="text-xs text-primary-400">
          {new Date(achievement.unlockedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

export function AchievementsView() {
  const wallet = useStellarWallet();
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualRefresh, setManualRefresh] = useState(0);

  const fetchAchievements = useCallback(async () => {
    if (!wallet.address && wallet.readOnly) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const addr = wallet.address || "public";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/achievements/${addr}`,
      );
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const json = (await res.json()) as AchievementSummary;
      setSummary(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [wallet.address, wallet.readOnly]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements, manualRefresh]);

  // Re-fetch when the connected wallet account changes via onAccountSwitch
  useEffect(() => {
    if (!wallet.onAccountSwitch) return;
    const unsub = wallet.onAccountSwitch(() => {
      setManualRefresh((n) => n + 1);
    });
    return unsub;
  }, [wallet.onAccountSwitch]);

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-10 text-primary-50">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Achievements</h1>
          <p className="text-sm text-primary-200 mt-1">
            Track your progress and unlock new milestones.
            {wallet.readOnly && (
              <span className="ml-2 text-yellow-400">
                (Read-only —{" "}
                <button
                  onClick={() => wallet.connect()}
                  className="underline hover:text-yellow-300"
                >
                  connect wallet
                </button>{" "}
                to see your achievements)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setManualRefresh((n) => n + 1)}
          disabled={loading}
          className="rounded-lg border border-primary-700/50 px-4 py-2 text-sm text-primary-200 hover:bg-primary-900/50 disabled:opacity-30"
        >
          {loading ? "Refreshing..." : "Sync"}
        </button>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
        </div>
      )}

      {error && (
        <Card className="border-red-800/40">
          <CardContent>
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {wallet.readOnly && !wallet.address && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Connect to view achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-primary-300">
              Connect your Stellar wallet to see your achievement progress.
            </p>
          </CardContent>
        </Card>
      )}

      {summary && !loading && (
        <>
          <div className="mb-6 rounded-lg border border-primary-800/40 bg-primary-950/30 p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-primary-100">
                {summary.unlocked}
              </span>
              <span className="text-sm text-primary-300">
                / {summary.total} unlocked
              </span>
              <div className="ml-auto h-2 w-48 overflow-hidden rounded-full bg-primary-900">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${summary.total > 0 ? (summary.unlocked / summary.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {summary.achievements.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
