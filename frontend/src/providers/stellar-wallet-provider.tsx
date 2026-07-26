"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getDefaultNetwork,
  STELLAR_NETWORKS,
  type StellarNetwork,
} from "@/lib/stellar/network";
import type { TxLifecycleStatus } from "@/lib/stellar/soroban";
import { signWithFreighter, submitSignedTransaction } from "@/lib/stellar/wallet-flow";

type WalletState = {
  connected: boolean;
  address?: string;
  network: StellarNetwork;
  status: TxLifecycleStatus;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (network: StellarNetwork) => Promise<void>;
  setTxStatus: (status: TxLifecycleStatus) => void;
  signTransaction: (transactionXdr: string) => Promise<string>;
  submitTransaction: (signedTxXdr: string) => Promise<{ hash: string }>;
  /** Registers a callback that fires whenever the active wallet account changes. */
  onAccountSwitch: (cb: (newAddress: string) => void) => () => void;
  /** True when the user can browse publicly without connecting a wallet. */
  readOnly: boolean;
  /** Prompts the user to connect if not already connected. Returns true if connected after prompt. */
  ensureConnected: () => Promise<boolean>;
};

type WalletKitLike = {
  openModal?: (params: {
    modalTitle?: string;
    onWalletSelected: (wallet: {
      getAddress: () => Promise<{ address: string }>;
    }) => Promise<void>;
  }) => Promise<void>;
};

declare global {
  interface Window {
    stellarWalletsKit?: WalletKitLike;
  }
}

const defaultStatus: TxLifecycleStatus = { id: "", state: "idle" };
const WalletContext = createContext<WalletState | undefined>(undefined);

export function StellarWalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [network, setNetwork] = useState<StellarNetwork>(getDefaultNetwork());
  const [status, setStatus] = useState<TxLifecycleStatus>(defaultStatus);

  // Set of callbacks notified when the active wallet account changes.
  const switchListenersRef = useRef<Set<(addr: string) => void>>(new Set());

  const onAccountSwitch = useCallback((cb: (newAddress: string) => void) => {
    switchListenersRef.current.add(cb);
    return () => switchListenersRef.current.delete(cb);
  }, []);

  // Poll Freighter for address changes on tab focus / visibility change.
  // This is the only reliable way to detect Freighter account switches since
  // the extension doesn't emit DOM events when the user switches accounts.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkForAccountSwitch = async () => {
      if (!connected) return;
      const freighter = window.freighterApi;
      if (!freighter?.getAddress) return;

      try {
        const response = await freighter.getAddress();
        if (!response || response.error || !response.address) return;
        const nextAddress = response.address;

        if (nextAddress !== address) {
          setAddress(nextAddress);
          setStatus(defaultStatus);
          switchListenersRef.current.forEach((cb) => cb(nextAddress));
        }
      } catch {
        // Silently ignore polling errors; they resolve on the next successful poll.
      }
    };

    window.addEventListener("focus", checkForAccountSwitch);
    document.addEventListener("visibilitychange", checkForAccountSwitch);
    return () => {
      window.removeEventListener("focus", checkForAccountSwitch);
      document.removeEventListener("visibilitychange", checkForAccountSwitch);
    };
  }, [connected, address]);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") {
      throw new Error("Wallet connection is only available in browser context");
    }

    const kit = window.stellarWalletsKit;
    if (kit?.openModal) {
      await kit.openModal({
        modalTitle: "Connect Wallet",
        onWalletSelected: async (wallet) => {
          const { address: selectedAddress } = await wallet.getAddress();
          setConnected(true);
          setAddress(selectedAddress);
        },
      });
      return;
    }

    const freighter = window.freighterApi;
    const connectedState = await freighter?.isConnected?.();
    if (!connectedState?.isConnected) {
      throw new Error("Freighter is not connected");
    }

    const response = await freighter?.getAddress?.();
    if (!response || response.error || !response.address) {
      throw new Error(response?.error || "Failed to read Freighter address");
    }

    setConnected(true);
    setAddress(response.address);
  }, []);

  const disconnect = useCallback(async () => {
    setConnected(false);
    setAddress(undefined);
    setStatus(defaultStatus);
  }, []);

  const switchNetwork = useCallback(async (nextNetwork: StellarNetwork) => {
    setNetwork(nextNetwork);
    setStatus({ id: crypto.randomUUID(), state: "idle" });
  }, []);

  const setTxStatus = useCallback((nextStatus: TxLifecycleStatus) => {
    setStatus(nextStatus);
  }, []);

  const signTransaction = useCallback(
    async (transactionXdr: string) => {
      setStatus({ id: crypto.randomUUID(), state: "signing" });
      try {
        const signed = await signWithFreighter(
          transactionXdr,
          STELLAR_NETWORKS[network].passphrase,
        );
        setStatus({ id: crypto.randomUUID(), state: "success" });
        return signed;
      } catch (error) {
        setStatus({
          id: crypto.randomUUID(),
          state: "error",
          error: error instanceof Error ? error.message : "Unknown signing error",
        });
        throw error;
      }
    },
    [network],
  );

  const submitTransaction = useCallback(
    async (signedTxXdr: string) => {
      setStatus({ id: crypto.randomUUID(), state: "submitting" });
      try {
        const submitted = await submitSignedTransaction(network, signedTxXdr);
        setStatus({
          id: crypto.randomUUID(),
          state: "success",
          txHash: submitted.hash,
        });
        return submitted;
      } catch (error) {
        setStatus({
          id: crypto.randomUUID(),
          state: "error",
          error: error instanceof Error ? error.message : "Unknown submission error",
        });
        throw error;
      }
    },
    [network],
  );

  const readOnly = useMemo(() => !connected, [connected]);

  const ensureConnected = useCallback(async () => {
    if (connected) return true;
    try {
      await connect();
      return true;
    } catch {
      return false;
    }
  }, [connected, connect]);

  const value = useMemo(
    () => ({
      connected,
      address,
      network,
      status,
      connect,
      disconnect,
      switchNetwork,
      setTxStatus,
      signTransaction,
      submitTransaction,
      onAccountSwitch,
      readOnly,
      ensureConnected,
    }),
    [
      connected,
      address,
      network,
      status,
      connect,
      disconnect,
      switchNetwork,
      setTxStatus,
      signTransaction,
      submitTransaction,
      onAccountSwitch,
      readOnly,
      ensureConnected,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within StellarWalletProvider");
  }
  return context;
}
