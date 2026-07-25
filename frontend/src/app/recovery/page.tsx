"use client";

import { useCallback, useState } from "react";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RecoveryResult {
  found: boolean;
  sessionId?: string;
  dayId?: number;
  status?: string;
  txHash?: string;
  message: string;
}

function RecoveryStatus({ result }: { result: RecoveryResult }) {
  if (!result.found) {
    return (
      <div className="rounded-lg border border-yellow-800/40 bg-yellow-950/20 p-4 text-sm text-yellow-300">
        {result.message}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-800/40 bg-green-950/20 p-4">
      <h3 className="text-sm font-semibold text-green-300">Session Recovered</h3>
      <dl className="mt-2 space-y-1 text-xs">
        {result.sessionId && (
          <div className="flex justify-between">
            <dt className="text-green-200">Session ID</dt>
            <dd className="font-mono text-green-100">{result.sessionId.slice(0, 16)}...</dd>
          </div>
        )}
        {result.dayId !== undefined && (
          <div className="flex justify-between">
            <dt className="text-green-200">Day</dt>
            <dd className="text-green-100">#{result.dayId}</dd>
          </div>
        )}
        {result.status && (
          <div className="flex justify-between">
            <dt className="text-green-200">Status</dt>
            <dd className="text-green-100">{result.status}</dd>
          </div>
        )}
        {result.txHash && (
          <div className="flex justify-between">
            <dt className="text-green-200">Transaction</dt>
            <dd className="font-mono text-green-100">{result.txHash.slice(0, 16)}...</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function RecoveryPage() {
  const wallet = useStellarWallet();
  const [txHash, setTxHash] = useState("");
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecover = useCallback(async () => {
    if (!txHash.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/sessions?skip=0&take=10`,
      );
      if (!res.ok) throw new Error("Failed to query session history");

      const data = await res.json() as { sessions: Array<{ sessionId: string; dayId: number; status: string; updatedAt: string }> };
      const matching = data.sessions.find(
        (s: { sessionId: string }) =>
          s.sessionId.includes(txHash.slice(0, 12)),
      );

      if (matching) {
        setResult({
          found: true,
          sessionId: matching.sessionId,
          dayId: matching.dayId,
          status: matching.status,
          txHash: txHash.trim(),
          message: "Session found in projection data.",
        });
      } else {
        setResult({
          found: false,
          message:
            "No session found for this transaction hash. It may not have been indexed yet, or the hash is incorrect.",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery lookup failed");
    } finally {
      setLoading(false);
    }
  }, [txHash]);

  return (
    <section className="w-full max-w-2xl mx-auto px-4 py-10 text-primary-50">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Session Recovery</h1>
        <p className="text-sm text-primary-200 mt-1">
          Recover a game session by pasting a transaction hash or reconnecting your wallet.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Paste Transaction Hash</CardTitle>
          <CardDescription>
            Enter the transaction hash from your wallet to look up the corresponding session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Paste transaction hash..."
              className="flex-1 rounded-lg border border-primary-700/50 bg-primary-950/40 px-4 py-3 text-sm text-primary-100 placeholder-primary-400 focus:border-primary-500 focus:outline-none"
            />
            <button
              onClick={handleRecover}
              disabled={loading || !txHash.trim()}
              className="rounded-lg bg-primary-700 px-6 py-3 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-30 disabled:cursor-not-allowed touch-target"
            >
              {loading ? "Searching..." : "Recover"}
            </button>
          </div>
        </CardContent>
      </Card>

      {wallet.readOnly && (
        <Card className="mb-6 border-yellow-800/40">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-300">
              Connect your wallet to recover sessions tied to your address.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Reconnect Wallet</CardTitle>
            <CardDescription>
              Reconnect your wallet to restore the active session context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {wallet.connected ? (
              <div className="rounded-lg border border-green-800/40 bg-green-950/20 p-3 text-sm text-green-300">
                Wallet connected: {wallet.address?.slice(0, 8)}...
              </div>
            ) : (
              <button
                onClick={() => wallet.connect()}
                className="rounded-lg bg-primary-700 px-6 py-3 text-sm font-medium text-white hover:bg-primary-600 touch-target"
              >
                Connect Wallet
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="mb-6 border-red-800/40">
          <CardContent>
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && <RecoveryStatus result={result} />}
    </section>
  );
}
