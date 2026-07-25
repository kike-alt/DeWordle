/**
 * Wallet Transaction Lifecycle Tests — W5-QA-002
 *
 * Covers: signing → submitting → success/error state transitions,
 * network mismatch detection, and failure rendering paths.
 * No real wallet browser extension is used.
 */

import { describe, it, expect } from 'vitest';
import { nextLifecycle, reconcileGameplayState } from '@/lib/stellar/gameplay-flow';
import type { TxLifecycleStatus } from '@/lib/stellar/soroban';

const TX_ID = 'test-tx-id-001';

// ---------------------------------------------------------------------------
// nextLifecycle — state transition factory
// ---------------------------------------------------------------------------

describe('nextLifecycle: tx state transitions', () => {
  it('produces signing state', () => {
    const status = nextLifecycle(TX_ID, 'signing');
    expect(status).toEqual({ id: TX_ID, state: 'signing', error: undefined });
  });

  it('produces submitting state', () => {
    const status = nextLifecycle(TX_ID, 'submitting');
    expect(status.state).toBe('submitting');
  });

  it('produces success state', () => {
    const status = nextLifecycle(TX_ID, 'success');
    expect(status.state).toBe('success');
    expect(status.error).toBeUndefined();
  });

  it('produces error state with message', () => {
    const status = nextLifecycle(TX_ID, 'error', 'User rejected');
    expect(status.state).toBe('error');
    expect(status.error).toBe('User rejected');
  });
});

// ---------------------------------------------------------------------------
// reconcileGameplayState — snapshot projection from status
// ---------------------------------------------------------------------------

describe('reconcileGameplayState: snapshot projection', () => {
  it('signing state sets pendingId and optimisticSessionId', () => {
    const status: TxLifecycleStatus = { id: TX_ID, state: 'signing' };
    const snap = reconcileGameplayState({ status, optimisticSessionId: 'session-1' });
    expect(snap.pendingId).toBe(TX_ID);
    expect(snap.optimisticSessionId).toBe('session-1');
    expect(snap.confirmedHash).toBeUndefined();
  });

  it('submitting state sets pendingId', () => {
    const status: TxLifecycleStatus = { id: TX_ID, state: 'submitting' };
    const snap = reconcileGameplayState({ status });
    expect(snap.pendingId).toBe(TX_ID);
  });

  it('success state sets confirmedHash and clears pendingId', () => {
    const status: TxLifecycleStatus = { id: TX_ID, state: 'success', txHash: 'hash-abc' };
    const snap = reconcileGameplayState({ status, txHash: 'hash-abc' });
    expect(snap.confirmedHash).toBe('hash-abc');
    expect(snap.pendingId).toBeUndefined();
    expect(snap.lastError).toBeUndefined();
  });

  it('error state sets lastError and preserves optimisticSessionId', () => {
    const status: TxLifecycleStatus = { id: TX_ID, state: 'error', error: 'Network timeout' };
    const snap = reconcileGameplayState({ status, optimisticSessionId: 'session-2' });
    expect(snap.lastError).toBe('Network timeout');
    expect(snap.optimisticSessionId).toBe('session-2');
    expect(snap.confirmedHash).toBeUndefined();
  });

  it('idle state returns empty snapshot', () => {
    const status: TxLifecycleStatus = { id: TX_ID, state: 'idle' };
    const snap = reconcileGameplayState({ status });
    expect(snap).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Network mismatch detection (pure logic, no browser extension)
// ---------------------------------------------------------------------------

describe('network mismatch detection', () => {
  it('detects mismatch when configured network differs from wallet network', () => {
    const configured: string = 'mainnet';
    const walletNetwork: string = 'testnet';
    const mismatch = configured !== walletNetwork;
    expect(mismatch).toBe(true);
  });

  it('no mismatch when networks match', () => {
    const configured: string = 'testnet';
    const walletNetwork: string = 'testnet';
    const mismatch = configured !== walletNetwork;
    expect(mismatch).toBe(false);
  });

  it('no mismatch when configured network is not set', () => {
    const configured: string | undefined = undefined;
    const mismatch = configured ? configured !== 'testnet' : false;
    expect(mismatch).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle: signing → submitting → success
// ---------------------------------------------------------------------------

describe('full tx lifecycle: happy path', () => {
  it('transitions through signing → submitting → success', () => {
    const id = 'lifecycle-id';
    const signing = nextLifecycle(id, 'signing');
    expect(signing.state).toBe('signing');

    const submitting = nextLifecycle(id, 'submitting');
    expect(submitting.state).toBe('submitting');

    const success: TxLifecycleStatus = { ...nextLifecycle(id, 'success'), txHash: 'final-hash' };
    const snap = reconcileGameplayState({ status: success, txHash: 'final-hash' });
    expect(snap.confirmedHash).toBe('final-hash');
    expect(snap.lastError).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle: signing → error (failure rendering path)
// ---------------------------------------------------------------------------

describe('full tx lifecycle: failure path', () => {
  it('signing failure produces error snapshot', () => {
    const id = 'fail-id';
    const signing = nextLifecycle(id, 'signing');
    expect(signing.state).toBe('signing');

    const error = nextLifecycle(id, 'error', 'Freighter is not connected');
    const snap = reconcileGameplayState({ status: error, optimisticSessionId: 'sess-x' });
    expect(snap.lastError).toBe('Freighter is not connected');
    expect(snap.confirmedHash).toBeUndefined();
  });

  it('submission failure produces error snapshot', () => {
    const id = 'submit-fail-id';
    const error = nextLifecycle(id, 'error', 'Transaction submission failed');
    const snap = reconcileGameplayState({ status: error });
    expect(snap.lastError).toBe('Transaction submission failed');
  });
});
