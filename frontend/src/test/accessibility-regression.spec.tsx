/**
 * QA-214 (#811): Accessibility regression checks — wallet and gameplay screens
 *
 * Uses @testing-library/react (already a project dependency) to verify ARIA
 * roles, live-region announcements, keyboard operability, and structural a11y
 * requirements on the highest-traffic wallet and gameplay components.
 *
 * No axe-core is required; all checks use explicit ARIA/role queries which
 * are the canonical source of truth for what assistive technology exposes.
 *
 * Known limitations (manual checks still required):
 *   - Colour contrast ratios (requires visual/automated CSS inspection tool)
 *   - Focus-trap behaviour inside modals with real keyboard navigation
 *   - Screen-reader reading order on real AT (NVDA/VoiceOver)
 *
 * @see docs/QA_KNOWN_LIMITATIONS.md
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Components under test
// ---------------------------------------------------------------------------
import { WalletNetworkMismatchBanner } from '@/components/WalletNetworkMismatchBanner';
import { WalletErrorBoundary } from '@/components/WalletErrorBoundary';
import { TxStatusTimeline } from '@/components/TxStatusTimeline';
import { GameplaySkeleton } from '@/components/skeletons/GameplaySkeleton';
import { NetworkCapabilityCallout } from '@/components/NetworkCapabilityBadge';
import type { TxLifecycleStatus } from '@/lib/stellar/soroban';

// ===========================================================================
// WalletNetworkMismatchBanner
// ===========================================================================

describe('WalletNetworkMismatchBanner — accessibility', () => {
  it('renders nothing when networks match (no false alerts)', () => {
    const { container } = render(
      <WalletNetworkMismatchBanner
        activeNetwork="testnet"
        configuredNetwork="testnet"
        onSwitch={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('has role="alert" when networks mismatch', () => {
    render(
      <WalletNetworkMismatchBanner
        activeNetwork="mainnet"
        configuredNetwork="testnet"
        onSwitch={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live="polite" on the alert container', () => {
    render(
      <WalletNetworkMismatchBanner
        activeNetwork="mainnet"
        configuredNetwork="testnet"
        onSwitch={vi.fn()}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('the switch button has an accessible label', () => {
    render(
      <WalletNetworkMismatchBanner
        activeNetwork="mainnet"
        configuredNetwork="testnet"
        onSwitch={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('switch button is keyboard operable (invokes handler on click)', () => {
    const onSwitch = vi.fn();
    render(
      <WalletNetworkMismatchBanner
        activeNetwork="mainnet"
        configuredNetwork="testnet"
        onSwitch={onSwitch}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSwitch).toHaveBeenCalledWith('testnet');
  });

  it('mismatch text describes both networks for context', () => {
    render(
      <WalletNetworkMismatchBanner
        activeNetwork="mainnet"
        configuredNetwork="testnet"
        onSwitch={vi.fn()}
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('mainnet');
    expect(alert.textContent).toContain('testnet');
  });
});

// ===========================================================================
// WalletErrorBoundary
// ===========================================================================

describe('WalletErrorBoundary — accessibility', () => {
  // Suppress expected console.warn from error boundary
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('renders children normally when no error', () => {
    render(
      <WalletErrorBoundary>
        <span data-testid="child">ok</span>
      </WalletErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders role="alert" fallback when boundary catches an error', () => {
    const Bomb = () => {
      throw new Error('wallet exploded');
    };
    render(
      <WalletErrorBoundary>
        <Bomb />
      </WalletErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('fallback contains a heading', () => {
    const Bomb = () => {
      throw new Error('boom');
    };
    render(
      <WalletErrorBoundary>
        <Bomb />
      </WalletErrorBoundary>,
    );
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('fallback has Retry and Reset buttons with labels', () => {
    const Bomb = () => {
      throw new Error('boom');
    };
    render(
      <WalletErrorBoundary>
        <Bomb />
      </WalletErrorBoundary>,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    buttons.forEach((btn) =>
      expect(btn.textContent?.trim().length).toBeGreaterThan(0),
    );
  });

  it('custom fallbackLabel is rendered in the heading', () => {
    const Bomb = () => {
      throw new Error('boom');
    };
    render(
      <WalletErrorBoundary fallbackLabel="Wallet connection failed">
        <Bomb />
      </WalletErrorBoundary>,
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Wallet connection failed');
  });
});

// ===========================================================================
// TxStatusTimeline (gameplay transaction status)
// ===========================================================================

describe('TxStatusTimeline — accessibility', () => {
  const status = (state: TxLifecycleStatus['state'], extra: Partial<TxLifecycleStatus> = {}) =>
    ({ id: 'tx-1', state, ...extra } as TxLifecycleStatus);

  it('has aria-live="polite" for screen-reader announcements', () => {
    render(<TxStatusTimeline status={status('idle')} />);
    const el = document.querySelector('[aria-live="polite"]');
    expect(el).toBeInTheDocument();
  });

  it('has aria-label="Transaction status"', () => {
    render(<TxStatusTimeline status={status('signing')} />);
    expect(screen.getByLabelText('Transaction status')).toBeInTheDocument();
  });

  it('has aria-atomic="true" so full message replaces partial reads', () => {
    render(<TxStatusTimeline status={status('submitting')} />);
    const el = document.querySelector('[aria-atomic="true"]');
    expect(el).toBeInTheDocument();
  });

  it('error state renders role="alert"', () => {
    render(<TxStatusTimeline status={status('error', { error: 'rejected' })} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('error alert contains the error message', () => {
    render(<TxStatusTimeline status={status('error', { error: 'Network timeout' })} />);
    expect(screen.getByRole('alert').textContent).toContain('Network timeout');
  });

  it('sr-only span describes current state so screen readers announce it', () => {
    render(<TxStatusTimeline status={status('signing')} />);
    const srOnly = document.querySelector('.sr-only');
    expect(srOnly).toBeInTheDocument();
    expect(srOnly?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('step list is aria-hidden to avoid noisy duplicate announcements', () => {
    render(<TxStatusTimeline status={status('signing')} />);
    const list = document.querySelector('ol[aria-hidden="true"]');
    expect(list).toBeInTheDocument();
  });
});

// ===========================================================================
// GameplaySkeleton (loading state)
// ===========================================================================

describe('GameplaySkeleton — accessibility', () => {
  it('has role="status" for live region', () => {
    render(<GameplaySkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label to describe the loading state', () => {
    render(<GameplaySkeleton />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-label');
    expect(el.getAttribute('aria-label')?.trim().length).toBeGreaterThan(0);
  });

  it('has an sr-only text inside the status region', () => {
    render(<GameplaySkeleton />);
    const srOnly = document.querySelector('.sr-only');
    expect(srOnly).toBeInTheDocument();
    expect(srOnly?.textContent?.trim().length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// NetworkCapabilityCallout (wallet / network capability screen)
// ===========================================================================

describe('NetworkCapabilityCallout — accessibility', () => {
  it('renders nothing when feature is available (no false alerts)', () => {
    const { container } = render(
      <NetworkCapabilityCallout
        network="testnet"
        feature="Daily puzzle"
        actionLabel="Daily puzzle"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders role="alert" when feature is unavailable', () => {
    render(
      <NetworkCapabilityCallout
        network="mainnet"
        feature="Free transactions"
        actionLabel="Free transactions"
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('alert message explains why the feature is unavailable', () => {
    render(
      <NetworkCapabilityCallout
        network="mainnet"
        feature="Free transactions"
        actionLabel="Free transactions"
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent?.trim().length).toBeGreaterThan(10);
  });
});
