import { computeAuditEventHash, verifyAuditEventHash } from './event-hash';

const base = {
  network: 'testnet',
  contractId: 'CABC',
  topic: 'session_finalized',
  txHash: 'tx1',
  ledger: 10,
  eventIndex: 0,
  payload: { a: 1, b: 'two' },
} as const;

// ---------------------------------------------------------------------------
// computeAuditEventHash
// ---------------------------------------------------------------------------

describe('computeAuditEventHash', () => {
  it('is deterministic for the same input', () => {
    expect(computeAuditEventHash(base)).toBe(computeAuditEventHash(base));
  });

  it('returns a 64-character lowercase hex string (SHA-256)', () => {
    const hash = computeAuditEventHash(base);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when payload changes', () => {
    const a = computeAuditEventHash({ ...base, payload: { a: 1 } });
    const b = computeAuditEventHash({ ...base, payload: { a: 2 } });
    expect(a).not.toBe(b);
  });

  it('changes when network changes', () => {
    const a = computeAuditEventHash({ ...base, network: 'testnet' });
    const b = computeAuditEventHash({ ...base, network: 'mainnet' });
    expect(a).not.toBe(b);
  });

  it('changes when contractId changes', () => {
    const a = computeAuditEventHash({ ...base, contractId: 'C1' });
    const b = computeAuditEventHash({ ...base, contractId: 'C2' });
    expect(a).not.toBe(b);
  });

  it('changes when topic changes', () => {
    const a = computeAuditEventHash({ ...base, topic: 'session_finalized' });
    const b = computeAuditEventHash({ ...base, topic: 'reward_claimed' });
    expect(a).not.toBe(b);
  });

  it('changes when txHash changes', () => {
    const a = computeAuditEventHash({ ...base, txHash: 'aaaa' });
    const b = computeAuditEventHash({ ...base, txHash: 'bbbb' });
    expect(a).not.toBe(b);
  });

  it('changes when ledger changes', () => {
    const a = computeAuditEventHash({ ...base, ledger: 10 });
    const b = computeAuditEventHash({ ...base, ledger: 11 });
    expect(a).not.toBe(b);
  });

  it('changes when eventIndex changes', () => {
    const a = computeAuditEventHash({ ...base, eventIndex: 0 });
    const b = computeAuditEventHash({ ...base, eventIndex: 1 });
    expect(a).not.toBe(b);
  });

  it('produces different hashes for payloads with the same keys in different order', () => {
    // JSON.stringify preserves V8 insertion order; callers must not reorder keys
    // when reconstructing payloads for verification (see AUDIT_LOG_RETENTION.md).
    const ab = computeAuditEventHash({ ...base, payload: { a: 1, b: 2 } });
    const ba = computeAuditEventHash({ ...base, payload: { b: 2, a: 1 } });
    expect(ab).not.toBe(ba);
  });

  it('produces the same hash for an empty payload', () => {
    const first = computeAuditEventHash({ ...base, payload: {} });
    const second = computeAuditEventHash({ ...base, payload: {} });
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// verifyAuditEventHash
// ---------------------------------------------------------------------------

describe('verifyAuditEventHash', () => {
  it('returns true when the recomputed hash matches the stored hash', () => {
    const stored = computeAuditEventHash(base);
    expect(verifyAuditEventHash(base, stored)).toBe(true);
  });

  it('returns false when any field differs from the stored hash', () => {
    const stored = computeAuditEventHash(base);
    expect(verifyAuditEventHash({ ...base, ledger: 99 }, stored)).toBe(false);
    expect(verifyAuditEventHash({ ...base, txHash: 'tampered' }, stored)).toBe(
      false,
    );
    expect(verifyAuditEventHash({ ...base, payload: { a: 999 } }, stored)).toBe(
      false,
    );
  });

  it('returns false when storedHash is null', () => {
    expect(verifyAuditEventHash(base, null)).toBe(false);
  });

  it('returns false when storedHash is undefined', () => {
    expect(verifyAuditEventHash(base, undefined)).toBe(false);
  });

  it('returns false when storedHash is an empty string', () => {
    expect(verifyAuditEventHash(base, '')).toBe(false);
  });

  it('returns false when storedHash is a valid-looking but wrong hex string', () => {
    const wrong = 'a'.repeat(64);
    expect(verifyAuditEventHash(base, wrong)).toBe(false);
  });
});
