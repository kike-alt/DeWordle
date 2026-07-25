"use client";

import { useStellarWallet } from "@/hooks/useStellarWallet";
import { ActionButton } from "./widgets/action-button";
import { WalletStatusCard } from "./widgets/wallet-status-card";
import { STATUS_PRESETS } from "./widgets/status-presets";

export function WalletStatusSandbox() {
  const wallet = useStellarWallet();

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-10 text-primary-50">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Wallet Status Sandbox</h1>
        <p className="text-sm text-primary-200 mt-1">
          Quick visual states for the wallet UI and tx lifecycle.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <WalletStatusCard
          title="Current Context"
          rows={[
            ["connected", String(wallet.connected)],
            ["address", wallet.address ?? "(none)"],
            ["network", wallet.network],
            ["status.state", wallet.status.state],
          ]}
          json={wallet.status}
        />

        <WalletStatusCard
          title="Actions"
          rows={STATUS_PRESETS.map((p) => [p.label, p.status.state])}
          footer={
            <div className="flex flex-wrap gap-2">
              {STATUS_PRESETS.map((p) => (
                <ActionButton
                  key={p.label}
                  onClick={() => wallet.setTxStatus(p.status)}
                  label={p.label}
                />
              ))}
              <ActionButton
                onClick={() => wallet.disconnect()}
                label="Reset (disconnect)"
                tone="danger"
              />
            </div>
          }
        />
      </div>
    </section>
  );
}

