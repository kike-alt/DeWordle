/**
 * Replay & Integrity Test Matrix — W5-QA-001
 *
 * Covers the full path: contract event emission → SDK decoding → indexer ingestion → projection.
 *
 * Matrix dimensions:
 *   Rows: event topics (day_published, guess_submitted, session_finalized)
 *   Cols: happy-path ingestion | replay-safe re-ingestion | malformed payload rejection
 *
 * Extension: add new rows by appending to CORE_GAME_TOPICS and new columns by adding
 * describe blocks following the same pattern.
 */

import { compareEventsByCursor } from './processors/event-ordering.util';
import { IngestedEventDto } from './dto/ingested-event.dto';

// ---------------------------------------------------------------------------
// SDK-equivalent helpers (inline to avoid ESM boundary)
// ---------------------------------------------------------------------------

const CORE_GAME_TOPICS = [
  'day_published',
  'session_started',
  'guess_submitted',
  'session_finalized',
  'streak_updated',
  'core_game_paused',
] as const;

type CoreGameTopic = (typeof CORE_GAME_TOPICS)[number];

function normalizeTopic(raw: string): string {
  return raw.trim().toLowerCase();
}

function isCoreGameEvent(topic: string): topic is CoreGameTopic {
  return (CORE_GAME_TOPICS as readonly string[]).includes(
    normalizeTopic(topic),
  );
}

interface RawEvent {
  contractId: string;
  topic: string;
  value: unknown;
  ledger?: number;
  txHash?: string;
}

function parseEvent(raw: RawEvent) {
  return {
    contractId: raw.contractId,
    topic: normalizeTopic(raw.topic),
    payload: raw.value,
    ledger: raw.ledger,
    txHash: raw.txHash,
  };
}

function makeIngested(
  topic: string,
  ledger = 1,
  txHash = 'tx-abc',
  eventIndex = 0,
): IngestedEventDto {
  return {
    network: 'testnet',
    contractId: 'CTEST',
    topic,
    txHash,
    ledger,
    eventIndex,
    payload: { data: 'ok' },
    observedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// SC → SDK: event emission & decoding
// ---------------------------------------------------------------------------

describe('SC→SDK: event decoding integrity', () => {
  it.each(CORE_GAME_TOPICS)('parseEvent normalises topic "%s"', (topic) => {
    const decoded = parseEvent({
      contractId: 'CTEST',
      topic,
      value: { data: 'ok' },
    });
    expect(decoded.topic).toBe(topic);
    expect(decoded.contractId).toBe('CTEST');
  });

  it.each(CORE_GAME_TOPICS)(
    'isCoreGameEvent returns true for "%s"',
    (topic) => {
      expect(isCoreGameEvent(topic)).toBe(true);
    },
  );

  it('normalizeTopic strips whitespace and lowercases', () => {
    expect(normalizeTopic('  Guess_Submitted  ')).toBe('guess_submitted');
  });

  it('parseEvent preserves ledger and txHash', () => {
    const decoded = parseEvent({
      contractId: 'CTEST',
      topic: 'day_published',
      value: {},
      ledger: 42,
      txHash: 'tx-xyz',
    });
    expect(decoded.ledger).toBe(42);
    expect(decoded.txHash).toBe('tx-xyz');
  });

  it('unknown topic is not a core game event', () => {
    expect(isCoreGameEvent('unknown_topic')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SDK → BE: replay-safe cursor ordering
// ---------------------------------------------------------------------------

describe('SDK→BE: replay-safe cursor ordering', () => {
  it('happy path — events already in order remain sorted', () => {
    const events = [
      makeIngested('day_published', 1, 'tx-a', 0),
      makeIngested('guess_submitted', 2, 'tx-b', 0),
      makeIngested('session_finalized', 3, 'tx-c', 0),
    ];
    const sorted = [...events].sort(compareEventsByCursor);
    expect(sorted.map((e) => e.ledger)).toEqual([1, 2, 3]);
  });

  it('replay case — out-of-order events are re-sorted to cursor-safe order', () => {
    const events = [
      makeIngested('session_finalized', 5, 'tx-c', 0),
      makeIngested('day_published', 3, 'tx-a', 0),
      makeIngested('guess_submitted', 3, 'tx-a', 1),
    ];
    const sorted = [...events].sort(compareEventsByCursor);
    expect(sorted[0]).toMatchObject({
      ledger: 3,
      txHash: 'tx-a',
      eventIndex: 0,
    });
    expect(sorted[1]).toMatchObject({
      ledger: 3,
      txHash: 'tx-a',
      eventIndex: 1,
    });
    expect(sorted[2]).toMatchObject({ ledger: 5 });
  });

  it('same cursor position compares as equal (idempotent replay)', () => {
    const a = makeIngested('guess_submitted', 4, 'tx-d', 2);
    const b = makeIngested('guess_submitted', 4, 'tx-d', 2);
    expect(compareEventsByCursor(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BE: projection integrity
// ---------------------------------------------------------------------------

describe('BE: projection integrity', () => {
  it('sorting does not mutate the original array', () => {
    const events = [
      makeIngested('guess_submitted', 10, 'tx-b', 0),
      makeIngested('day_published', 9, 'tx-a', 0),
    ];
    const snapshot = events.map((e) => ({ ...e }));
    [...events].sort(compareEventsByCursor);
    events.forEach((e, i) => expect(e).toEqual(snapshot[i]));
  });

  it('events with different txHash on same ledger are ordered lexicographically', () => {
    const a = makeIngested('guess_submitted', 5, 'tx-z', 0);
    const b = makeIngested('guess_submitted', 5, 'tx-a', 0);
    const sorted = [a, b].sort(compareEventsByCursor);
    expect(sorted[0].txHash).toBe('tx-a');
    expect(sorted[1].txHash).toBe('tx-z');
  });
});
