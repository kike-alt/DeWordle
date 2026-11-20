"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STELLAR_NETWORKS } from "@/lib/stellar/network";
import { useWalletContext } from "@/providers/stellar-wallet-provider";

const NETWORK_PRESENTATION = {
  mainnet: {
    label: "Mainnet",
    classes: "border-green-700/60 bg-green-950/40 text-green-200",
    dot: "bg-green-400",
  },
  testnet: {
    label: "Testnet",
    classes: "border-amber-700/60 bg-amber-950/40 text-amber-200",
    dot: "bg-amber-400",
  },
  futurenet: {
    label: "Futurenet",
    classes: "border-blue-700/60 bg-blue-950/40 text-blue-200",
    dot: "bg-blue-400",
  },
} as const;

export function ActiveNetworkBadge() {
  const { network } = useWalletContext();
  const config = STELLAR_NETWORKS[network];
  const presentation = NETWORK_PRESENTATION[network];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Active network: ${presentation.label}. Show RPC details`}
          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${presentation.classes} focus:outline-none focus:ring-2 focus:ring-white/60`}
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${presentation.dot}`} />
          {presentation.label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        role="tooltip"
        aria-label={`${presentation.label} network details`}
        className="space-y-3 break-all text-xs text-white"
      >
        <p className="font-semibold">{presentation.label} RPC</p>
        <div>
          <p className="mb-1 text-gray-400">RPC URL</p>
          <code>{config.rpcUrl}</code>
        </div>
        <div>
          <p className="mb-1 text-gray-400">Network passphrase</p>
          <code>{config.passphrase}</code>
        </div>
      </PopoverContent>
    </Popover>
  );
}
