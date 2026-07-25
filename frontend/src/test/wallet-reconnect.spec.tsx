/**
 * wallet-reconnect.spec.tsx — QA-203 (#800)
 *
 * Regression suite for wallet disconnect, reconnect, account switch, and
 * resumed action flows inside StellarWalletProvider / useStellarWallet.
 *
 * No real wallet extension is used. Freighter's browser API and
 * stellarWalletsKit are stubbed via vi.stubGlobal.
 *
 * Unsupported scenarios discovered during test design are documented at the
 * bottom of this file.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Minimal freighterApi stub factory
// ---------------------------------------------------------------------------

interface FreighterApiStub {
  isConnected: ReturnType<typeof vi.fn>;
  getAddress: ReturnType<typeof vi.fn>;
}

function makeFreighterStub(address: string, connected = true): FreighterApiStub {
  return {
    isConnected: vi.fn().mockResolvedValue({ isConnected: connected }),
    getAddress: vi.fn().mockResolvedValue({ address }),
  };
}

// ---------------------------------------------------------------------------
// Wallet display component
// ---------------------------------------------------------------------------

import { StellarWalletProvider } from '@/providers/stellar-wallet-provider';
import { useStellarWallet } from '@/hooks/useStellarWallet';

function WalletDisplay() {
  const wallet = useStellarWallet();
  return (
    <div>
      <span data-testid="connected">{String(wallet.connected)}</span>
      <span data-testid="address">{wallet.address ?? 'none'}</span>
      <span data-testid="network">{wallet.network}</span>
      <span data-testid="tx-state">{wallet.status.state}</span>
      <span data-testid="read-only">{String(wallet.readOnly)}</span>
      <button onClick={() => wallet.connect().catch(() => { /* connect errors are handled by the provider */ })} data-testid="btn-connect">
        Connect
      </button>
      <button onClick={() => wallet.disconnect()} data-testid="btn-disconnect">
        Disconnect
      </button>
      <button
        onClick={() => wallet.switchNetwork('mainnet')}
        data-testid="btn-switch-mainnet"
      >
        Switch Mainnet
      </button>
    </div>
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  return <StellarWalletProvider>{children}</StellarWalletProvider>;
}

function renderWallet() {
  return render(
    <Wrapper>
      <WalletDisplay />
    </Wrapper>,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADDR_A = 'GABC1111111111111111111111111111111111111111111111111111111111';
const ADDR_B = 'GXYZ9999999999999999999999999999999999999999999999999999999999';

function stubFreighter(address: string, connected = true) {
  const stub = makeFreighterStub(address, connected);
  vi.stubGlobal('freighterApi', stub);
  vi.stubGlobal('stellarWalletsKit', undefined);
  return stub;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Wallet reconnect regression suite (QA-203)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts disconnected with no address', () => {
      renderWallet();
      expect(screen.getByTestId('connected').textContent).toBe('false');
      expect(screen.getByTestId('address').textContent).toBe('none');
    });

    it('starts in read-only mode', () => {
      renderWallet();
      expect(screen.getByTestId('read-only').textContent).toBe('true');
    });

    it('defaults to testnet', () => {
      renderWallet();
      expect(screen.getByTestId('network').textContent).toBe('testnet');
    });

    it('tx status defaults to idle', () => {
      renderWallet();
      expect(screen.getByTestId('tx-state').textContent).toBe('idle');
    });
  });

  // -------------------------------------------------------------------------
  // Connect flow
  // -------------------------------------------------------------------------

  describe('connect flow', () => {
    it('connects and sets address via Freighter', async () => {
      stubFreighter(ADDR_A);
      renderWallet();
      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => {
        expect(screen.getByTestId('connected').textContent).toBe('true');
        expect(screen.getByTestId('address').textContent).toBe(ADDR_A);
      });
    });

    it('leaves read-only false after connect', async () => {
      stubFreighter(ADDR_A);
      renderWallet();
      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => {
        expect(screen.getByTestId('read-only').textContent).toBe('false');
      });
    });

    it('stays disconnected when Freighter isConnected returns false', async () => {
      stubFreighter(ADDR_A, false /* isConnected = false */);
      renderWallet();
      await userEvent.click(screen.getByTestId('btn-connect'));
      // connect() throws internally but ensureConnected catches; state stays false
      await waitFor(() => {
        expect(screen.getByTestId('connected').textContent).toBe('false');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Disconnect flow
  // -------------------------------------------------------------------------

  describe('disconnect flow', () => {
    beforeEach(async () => {
      stubFreighter(ADDR_A);
      renderWallet();
      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('connected').textContent).toBe('true'));
    });

    it('clears connected and address on disconnect', async () => {
      await userEvent.click(screen.getByTestId('btn-disconnect'));
      await waitFor(() => {
        expect(screen.getByTestId('connected').textContent).toBe('false');
        expect(screen.getByTestId('address').textContent).toBe('none');
      });
    });

    it('resets tx status to idle on disconnect', async () => {
      await userEvent.click(screen.getByTestId('btn-disconnect'));
      await waitFor(() => {
        expect(screen.getByTestId('tx-state').textContent).toBe('idle');
      });
    });

    it('restores read-only mode after disconnect', async () => {
      await userEvent.click(screen.getByTestId('btn-disconnect'));
      await waitFor(() => {
        expect(screen.getByTestId('read-only').textContent).toBe('true');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Reconnect flow
  // -------------------------------------------------------------------------

  describe('reconnect flow', () => {
    it('reconnects to the same account after disconnect', async () => {
      stubFreighter(ADDR_A);
      renderWallet();

      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('connected').textContent).toBe('true'));

      await userEvent.click(screen.getByTestId('btn-disconnect'));
      await waitFor(() => expect(screen.getByTestId('connected').textContent).toBe('false'));

      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => {
        expect(screen.getByTestId('connected').textContent).toBe('true');
        expect(screen.getByTestId('address').textContent).toBe(ADDR_A);
      });
    });

    it('reconnects to a different account after disconnect', async () => {
      stubFreighter(ADDR_A);
      renderWallet();

      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('address').textContent).toBe(ADDR_A));

      await userEvent.click(screen.getByTestId('btn-disconnect'));
      await waitFor(() => expect(screen.getByTestId('connected').textContent).toBe('false'));

      stubFreighter(ADDR_B);
      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => {
        expect(screen.getByTestId('connected').textContent).toBe('true');
        expect(screen.getByTestId('address').textContent).toBe(ADDR_B);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Account switch detection (focus / visibilitychange polling)
  // -------------------------------------------------------------------------

  describe('account switch detection', () => {
    it('detects an account switch on window focus', async () => {
      const stub = stubFreighter(ADDR_A);
      renderWallet();

      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('address').textContent).toBe(ADDR_A));

      // Simulate user switching accounts in Freighter then returning to the tab
      stub.getAddress.mockResolvedValue({ address: ADDR_B });

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        // Flush the microtask that checkForAccountSwitch schedules
        await new Promise((r) => setTimeout(r, 0));
      });

      await waitFor(() => {
        expect(screen.getByTestId('address').textContent).toBe(ADDR_B);
      });
    });

    it('detects an account switch on visibilitychange', async () => {
      const stub = stubFreighter(ADDR_A);
      renderWallet();

      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('address').textContent).toBe(ADDR_A));

      stub.getAddress.mockResolvedValue({ address: ADDR_B });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await new Promise((r) => setTimeout(r, 0));
      });

      await waitFor(() => {
        expect(screen.getByTestId('address').textContent).toBe(ADDR_B);
      });
    });

    it('notifies onAccountSwitch listeners when address changes', async () => {
      const stub = stubFreighter(ADDR_A);

      const switchCallback = vi.fn();

      function ListenerComponent() {
        const wallet = useStellarWallet();
        // Register on first render — the hook returns an unsubscribe fn
        wallet.onAccountSwitch(switchCallback);
        return null;
      }

      render(
        <Wrapper>
          <WalletDisplay />
          <ListenerComponent />
        </Wrapper>,
      );

      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('connected').textContent).toBe('true'));

      stub.getAddress.mockResolvedValue({ address: ADDR_B });

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        await new Promise((r) => setTimeout(r, 0));
      });

      await waitFor(() => {
        expect(screen.getByTestId('address').textContent).toBe(ADDR_B);
        expect(switchCallback).toHaveBeenCalledWith(ADDR_B);
      });
    });

    it('does not poll getAddress when wallet is disconnected', async () => {
      const stub = stubFreighter(ADDR_A);
      renderWallet();
      // Do NOT connect

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(stub.getAddress).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Network switch flow
  // -------------------------------------------------------------------------

  describe('network switch flow', () => {
    it('switches to mainnet', async () => {
      renderWallet();
      await userEvent.click(screen.getByTestId('btn-switch-mainnet'));
      await waitFor(() => {
        expect(screen.getByTestId('network').textContent).toBe('mainnet');
      });
    });

    it('resets tx status to idle when network switches', async () => {
      stubFreighter(ADDR_A);
      renderWallet();
      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('connected').textContent).toBe('true'));

      await userEvent.click(screen.getByTestId('btn-switch-mainnet'));
      await waitFor(() => {
        expect(screen.getByTestId('tx-state').textContent).toBe('idle');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Resumed action flow — ensureConnected
  // -------------------------------------------------------------------------

  describe('resumed action flow — ensureConnected', () => {
    it('returns true immediately when already connected', async () => {
      stubFreighter(ADDR_A);

      let result: boolean | undefined;
      function EnsureTest() {
        const wallet = useStellarWallet();
        return (
          <button
            data-testid="btn-ensure"
            onClick={async () => {
              result = await wallet.ensureConnected();
            }}
          >
            Ensure
          </button>
        );
      }

      render(
        <Wrapper>
          <WalletDisplay />
          <EnsureTest />
        </Wrapper>,
      );

      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => expect(screen.getByTestId('connected').textContent).toBe('true'));

      await userEvent.click(screen.getByTestId('btn-ensure'));
      await waitFor(() => expect(result).toBe(true));
    });

    it('connects and returns true when disconnected but Freighter is available', async () => {
      stubFreighter(ADDR_A);

      let result: boolean | undefined;
      function EnsureTest() {
        const wallet = useStellarWallet();
        return (
          <button
            data-testid="btn-ensure"
            onClick={async () => {
              result = await wallet.ensureConnected();
            }}
          >
            Ensure
          </button>
        );
      }

      render(
        <Wrapper>
          <WalletDisplay />
          <EnsureTest />
        </Wrapper>,
      );

      await userEvent.click(screen.getByTestId('btn-ensure'));
      await waitFor(() => {
        expect(result).toBe(true);
        expect(screen.getByTestId('connected').textContent).toBe('true');
      });
    });

    it('returns false when no wallet extension is available', async () => {
      vi.stubGlobal('freighterApi', undefined);
      vi.stubGlobal('stellarWalletsKit', undefined);

      let result: boolean | undefined;
      function EnsureTest() {
        const wallet = useStellarWallet();
        return (
          <button
            data-testid="btn-ensure"
            onClick={async () => {
              result = await wallet.ensureConnected();
            }}
          >
            Ensure
          </button>
        );
      }

      render(
        <Wrapper>
          <WalletDisplay />
          <EnsureTest />
        </Wrapper>,
      );

      await userEvent.click(screen.getByTestId('btn-ensure'));
      await waitFor(() => expect(result).toBe(false));
    });
  });

  // -------------------------------------------------------------------------
  // WalletKit (stellarWalletsKit) path
  // -------------------------------------------------------------------------

  describe('WalletKit connect path', () => {
    it('connects via stellarWalletsKit when available', async () => {
      vi.stubGlobal('freighterApi', undefined);
      vi.stubGlobal('stellarWalletsKit', {
        openModal: vi.fn().mockImplementation(
          async (params: {
            onWalletSelected: (wallet: {
              getAddress: () => Promise<{ address: string }>;
            }) => Promise<void>;
          }) => {
            await params.onWalletSelected({
              getAddress: async () => ({ address: ADDR_B }),
            });
          },
        ),
      });

      renderWallet();
      await userEvent.click(screen.getByTestId('btn-connect'));
      await waitFor(() => {
        expect(screen.getByTestId('connected').textContent).toBe('true');
        expect(screen.getByTestId('address').textContent).toBe(ADDR_B);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// UNSUPPORTED SCENARIOS — documented per QA-203 acceptance criteria
// ---------------------------------------------------------------------------
//
// 1. Freighter extension removal mid-session
//    The provider polls on focus/visibilitychange but has no mechanism to
//    detect extension uninstall while the tab is active. A "health check"
//    polling interval would be needed to cover this.
//
// 2. Hardware wallet (Ledger) account switch
//    Ledger devices don't expose event-driven account-switch APIs. Detecting
//    a Ledger switch requires a polling loop not yet implemented in the provider.
//
// 3. WalletKit account switch events
//    stellarWalletsKit does not emit DOM events for account switches. The
//    provider only polls freighterApi.getAddress; WalletKit sessions are
//    unmonitored until the user triggers a focus event.
//
// 4. Mobile wallet deep-link reconnect
//    WalletConnect-style deep-link wallets have an async reconnect handshake
//    not modelled in the current provider implementation.
