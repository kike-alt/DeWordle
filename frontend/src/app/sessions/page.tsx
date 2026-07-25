"use client";

import { useCallback, useEffect, useState } from "react";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


interface SessionEntry {
  sessionId: string;
  player: string;
  dayId: number;
  status: string;
  attemptsUsed: number;
  finalized: boolean;
  updatedAt: string;
}

interface SessionHistory {
  sessions: SessionEntry[];
  total: number;
  skip: number;
  take: number;
}

function SessionRow({ session }: { session: SessionEntry }) {
  const statusColor =
    session.status === "Finalized"
      ? "text-green-400"
      : session.status === "InProgress"
        ? "text-yellow-400"
        : "text-gray-400";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border border-primary-800/40 bg-primary-950/30 p-3 sm:px-4 sm:py-3 gap-2 sm:gap-0">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-primary-100">
          Day #{session.dayId}
        </span>
        <span className="text-xs text-primary-300">
          {session.sessionId.slice(0, 12)}...
        </span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className={`text-xs font-semibold ${statusColor}`}>
          {session.status}
        </span>
        <span className="text-xs text-primary-300">
          {session.attemptsUsed} attempts
        </span>
        <span className="text-xs text-primary-400">
          {new Date(session.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const wallet = useStellarWallet();
  const [data, setData] = useState<SessionHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const take = 20;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        skip: String(skip),
        take: String(take),
      });
      if (wallet.address) params.set("player", wallet.address);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/sessions?${params}`,
      );
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const json = (await res.json()) as SessionHistory;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [skip, take, wallet.address]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-10 text-primary-50">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Session History</h1>
        <p className="text-sm text-primary-200 mt-1">
          Browse past game sessions.
          {wallet.readOnly && (
            <span className="ml-2 text-yellow-400">
              (Read-only —{" "}
              <button
                onClick={() => wallet.connect()}
                className="underline hover:text-yellow-300"
              >
                connect wallet
              </button>{" "}
              to see your sessions)
            </span>
          )}
        </p>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
        </div>
      )}

      {error && (
        <Card className="border-red-800/40">
          <CardContent>
            <p className="text-sm text-red-400">Failed to load: {error}</p>
          </CardContent>
        </Card>
      )}

      {data && !loading && (
        <>
          <div className="space-y-3">
            {data.sessions.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No sessions found</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary-300">
                    {wallet.readOnly
                      ? "Connect your wallet to view your session history."
                      : "No sessions recorded yet. Play a game to see your history here."}
                  </p>
                </CardContent>
              </Card>
            )}
            {data.sessions.map((session) => (
              <SessionRow key={session.sessionId} session={session} />
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
            <button
              onClick={() => setSkip((s) => Math.max(0, s - take))}
              disabled={skip === 0}
              className="rounded-lg border border-primary-700/50 px-4 py-2 text-sm text-primary-200 hover:bg-primary-900/50 disabled:opacity-30 disabled:cursor-not-allowed touch-target w-full sm:w-auto"
            >
              Previous
            </button>
            <span className="text-xs text-primary-400">
              {skip + 1}–{Math.min(skip + take, data.total)} of {data.total}
            </span>
            <button
              onClick={() => setSkip((s) => s + take)}
              disabled={skip + take >= data.total}
              className="rounded-lg border border-primary-700/50 px-4 py-2 text-sm text-primary-200 hover:bg-primary-900/50 disabled:opacity-30 disabled:cursor-not-allowed touch-target w-full sm:w-auto"
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
