import type { TxLifecycleStatus } from "@/lib/stellar/soroban";

export const STATUS_PRESETS: Array<{ label: string; status: TxLifecycleStatus }> = [
  { label: "Idle", status: { id: "sandbox", state: "idle" } },
  { label: "Signing", status: { id: "sandbox", state: "signing" } },
  { label: "Submitting", status: { id: "sandbox", state: "submitting" } },
  { label: "Success", status: { id: "sandbox", state: "success", txHash: "FAKE_HASH" } },
  { label: "Error", status: { id: "sandbox", state: "error", error: "User rejected" } },
];

