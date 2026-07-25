import { createHash } from 'crypto';

export type AuditEventHashInput = {
  network: string;
  contractId: string;
  topic: string;
  txHash: string;
  ledger: number;
  eventIndex: number;
  payload: Record<string, unknown>;
};

/**
 * Computes a SHA-256 fingerprint of the canonical event fields.
 *
 * Serialization is a fixed-order JSON array to avoid key-enumeration
 * non-determinism. Field order is part of the stable contract — do not
 * reorder without a migration that recomputes all stored hashes.
 *
 * See docs/AUDIT_LOG_RETENTION.md for the full tamper-detection policy.
 */
export function computeAuditEventHash(e: AuditEventHashInput): string {
  const json = JSON.stringify([
    e.network,
    e.contractId,
    e.topic,
    e.txHash,
    e.ledger,
    e.eventIndex,
    e.payload,
  ]);
  return createHash('sha256').update(json).digest('hex');
}

/**
 * Returns true if recomputing the hash from the given fields matches
 * storedHash, false otherwise.
 *
 * A null or empty storedHash always returns false — pre-policy rows that
 * were saved without a hash must not silently pass verification.
 */
export function verifyAuditEventHash(
  input: AuditEventHashInput,
  storedHash: string | null | undefined,
): boolean {
  if (!storedHash) return false;
  return computeAuditEventHash(input) === storedHash;
}
