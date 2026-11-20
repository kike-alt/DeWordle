/**
 * Unit tests for event indexer parsing and projection updates.
 *
 * The Soroban RPC is mocked (`fetchEvents` returns fixture events) and the
 * repositories are in-memory fakes, so nothing here needs a database or a
 * network. Event shapes come from `shared/test/fixtures/events`.
 */

// @nestjs/typeorm's DI decorator cannot be loaded under this jest setup;
// providers are constructed by hand below, so a no-op decorator is enough.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import {
  ALL_FIXTURES,
  sessionFinalizedFixture,
} from '../../../shared/test/fixtures/events';
import { IndexerService } from './indexer.service';
import type { IngestedEventDto } from './dto/ingested-event.dto';
import type { IngestedEventEntity } from './entities/ingested-event.entity';
import type { SessionProjectionEntity } from './entities/session-projection.entity';
import type {
  MalformedEvent,
  MalformedEventSink,
} from './malformed-event-sink';
import {
  ALLOWED_TOPICS,
  EventNormalizerService,
} from './processors/event-normalizer.service';
import { EventProcessorService } from './processors/event-processor.service';
import { AdminRegistryProcessorService } from './processors/admin-registry-processor.service';
import { CursorService } from './projections/cursor.service';
import { ProjectionService } from './projections/projection.service';
import { ReplayAlertService } from './queue/replay-alert.service';
import { EventDedupService } from './dedup/event-dedup.service';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

class FakeRepo<T extends { id?: number }> {
  rows: T[] = [];
  private nextId = 1;

  async findOne({ where }: { where: Partial<T> }): Promise<T | null> {
    return (
      this.rows.find((row) =>
        Object.entries(where).every(
          ([k, v]) => (row as Record<string, unknown>)[k] === v,
        ),
      ) ?? null
    );
  }

  create(data: Partial<T>): T {
    return { ...data } as T;
  }

  async save(entity: T): Promise<T> {
    if (entity.id === undefined) {
      const saved = { ...entity, id: this.nextId++ } as T;
      this.rows.push(saved);
      return saved;
    }
    const index = this.rows.findIndex((r) => r.id === entity.id);
    this.rows[index] = { ...entity };
    return this.rows[index];
  }
}

const NETWORK = 'testnet' as const;
const CONTRACT = 'CCOREGAMEFIXTURE';

function rawEvent(overrides: Record<string, unknown> = {}) {
  return {
    contractId: CONTRACT,
    topic: 'session_started',
    txHash: 'tx-1',
    ledger: 100,
    eventIndex: 0,
    payload: { sessionId: 's-1' },
    ...overrides,
  };
}

/** A raw RPC event for each known topic, built from the shared fixtures. */
function fixtureRawEvents(): Record<string, unknown>[] {
  return ALL_FIXTURES.map((fixture, i) =>
    rawEvent({
      topic: fixture.topic,
      txHash: `tx-${i + 1}`,
      ledger: 100 + i,
      payload: fixture.samplePayload,
    }),
  );
}

function finalizedEvent(overrides: Partial<IngestedEventDto> = {}) {
  return {
    network: NETWORK,
    contractId: CONTRACT,
    topic: 'session_finalized',
    txHash: 'tx-final',
    ledger: 200,
    eventIndex: 0,
    observedAt: new Date('2026-03-01T00:00:00Z'),
    payload: {
      sessionId: sessionFinalizedFixture.sampleTopic[1],
      player: sessionFinalizedFixture.samplePayload.player,
      dayId: 42,
      attemptsUsed: 3,
    },
    ...overrides,
  } as IngestedEventDto;
}

function build(options: { rpcEvents?: Record<string, unknown>[] } = {}) {
  const eventsRepo = new FakeRepo<IngestedEventEntity>();
  const sessionsRepo = new FakeRepo<SessionProjectionEntity>();

  const projection = new ProjectionService(
    sessionsRepo as unknown as Repository<SessionProjectionEntity>,
  );
  const processor = new EventProcessorService(
    eventsRepo as unknown as Repository<IngestedEventEntity>,
    projection,
    new AdminRegistryProcessorService(),
    { emit: jest.fn() } as any,
  );
  const normalizer = new EventNormalizerService();

  const cursorService = {
    getOrCreate: jest.fn().mockResolvedValue({
      lastLedger: 0,
      lastTxHash: '',
      lastEventIndex: 0,
      updatedAt: new Date('2026-03-01T00:00:00Z'),
    }),
    checkpoint: jest.fn().mockResolvedValue(undefined),
  } as unknown as CursorService;

  const config = {
    get: (key: string) =>
      ({
        SOROBAN_RPC_URL: 'http://rpc.test',
        SOROBAN_CORE_GAME_CONTRACT_ID: CONTRACT,
        SOROBAN_NETWORK: NETWORK,
      })[key],
  } as unknown as ConfigService;

  const dedup = {
    isDuplicate: jest.fn().mockResolvedValue(false),
  } as unknown as EventDedupService;

  const indexer = new IndexerService(
    processor,
    normalizer,
    cursorService,
    config,
    new ReplayAlertService(),
    dedup,
  );
  // Mock the Soroban RPC client: return fixture events instead of calling out.
  const fetchEvents = jest
    .spyOn(indexer, 'fetchEvents')
    .mockResolvedValue(options.rpcEvents ?? []);

  return {
    indexer,
    processor,
    projection,
    normalizer,
    eventsRepo,
    sessionsRepo,
    fetchEvents,
  };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

describe('event parsing', () => {
  const normalizer = new EventNormalizerService();

  it('accepts the topic of every shared contract-event fixture', () => {
    for (const fixture of ALL_FIXTURES) {
      expect(ALLOWED_TOPICS.has(fixture.topic)).toBe(true);
    }
  });

  it('still accepts the legacy reward_claimed topic', () => {
    const event = normalizer.normalize(
      NETWORK,
      rawEvent({ topic: 'reward_claimed' }),
    );
    expect(normalizer.isValid(event)).toBe(true);
  });

  it.each(ALL_FIXTURES.map((f) => [f.topic, f] as const))(
    'normalizes and accepts a %s event',
    (_topic, fixture) => {
      const event = normalizer.normalize(
        NETWORK,
        rawEvent({ topic: fixture.topic, payload: fixture.samplePayload }),
      );
      expect(event).toMatchObject({
        network: NETWORK,
        contractId: CONTRACT,
        topic: fixture.topic,
        txHash: 'tx-1',
        ledger: 100,
        eventIndex: 0,
        payload: fixture.samplePayload,
      });
      expect(normalizer.isValid(event)).toBe(true);
    },
  );

  it('trims and lower-cases topics', () => {
    const event = normalizer.normalize(
      NETWORK,
      rawEvent({ topic: '  Session_Started ' }),
    );
    expect(event.topic).toBe('session_started');
    expect(normalizer.isValid(event)).toBe(true);
  });

  it.each([
    ['unknown topic', { topic: 'something_else' }],
    ['missing contract id', { contractId: undefined }],
    ['missing transaction hash', { txHash: undefined }],
    ['zero ledger', { ledger: 0 }],
    ['negative event index', { eventIndex: -1 }],
    ['fractional ledger', { ledger: 1.5 }],
  ])('rejects an event with %s', (_label, override) => {
    const event = normalizer.normalize(NETWORK, rawEvent(override));
    expect(normalizer.isValid(event)).toBe(false);
  });

  it('rejects a payload larger than the size limit', () => {
    const event = normalizer.normalize(
      NETWORK,
      rawEvent({ payload: { blob: 'x'.repeat(9_000) } }),
    );
    expect(normalizer.isValid(event)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

describe('projection updates', () => {
  it('creates a finalized session projection from session_finalized', async () => {
    const { projection, sessionsRepo } = build();
    const applied = await projection.apply(finalizedEvent());

    expect(applied).toBe(true);
    expect(sessionsRepo.rows).toHaveLength(1);
    expect(sessionsRepo.rows[0]).toMatchObject({
      network: NETWORK,
      sessionId: sessionFinalizedFixture.sampleTopic[1],
      player: sessionFinalizedFixture.samplePayload.player,
      dayId: 42,
      attemptsUsed: 3,
      status: 'Finalized',
      finalized: true,
    });
  });

  it('honours an explicit status from the payload', async () => {
    const { projection, sessionsRepo } = build();
    const event = finalizedEvent();
    event.payload = { ...event.payload, status: 'Won' };
    await projection.apply(event);
    expect(sessionsRepo.rows[0].status).toBe('Won');
  });

  it.each([
    'session_started',
    'guess_submitted',
    'reward_claimed',
    'achievement_unlocked',
  ])('does not touch the session projection for %s', async (topic) => {
    const { projection, sessionsRepo } = build();
    const applied = await projection.apply(finalizedEvent({ topic }));
    expect(applied).toBe(false);
    expect(sessionsRepo.rows).toHaveLength(0);
  });

  it('skips a session_finalized event that has no session id', async () => {
    const { projection, sessionsRepo } = build();
    const applied = await projection.apply(
      finalizedEvent({ payload: { player: 'GABC' } }),
    );
    expect(applied).toBe(false);
    expect(sessionsRepo.rows).toHaveLength(0);
  });

  it('updates the existing projection instead of adding a second row', async () => {
    const { projection, sessionsRepo } = build();
    await projection.apply(finalizedEvent());
    const updated = finalizedEvent({ txHash: 'tx-final-2' });
    updated.payload = { ...updated.payload, attemptsUsed: 5 };
    await projection.apply(updated);

    expect(sessionsRepo.rows).toHaveLength(1);
    expect(sessionsRepo.rows[0].attemptsUsed).toBe(5);
  });

  it('keeps projections for different networks separate', async () => {
    const { projection, sessionsRepo } = build();
    await projection.apply(finalizedEvent());
    await projection.apply(finalizedEvent({ network: 'mainnet' }));
    expect(sessionsRepo.rows.map((r) => r.network).sort()).toEqual([
      'mainnet',
      'testnet',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Idempotent reprocessing
// ---------------------------------------------------------------------------

describe('idempotent reprocessing', () => {
  it('stores an event once and ignores the replay', async () => {
    const { processor, eventsRepo, sessionsRepo } = build();
    const event = finalizedEvent();

    expect(await processor.process(event)).toBe(true);
    expect(await processor.process(event)).toBe(false);

    expect(eventsRepo.rows).toHaveLength(1);
    expect(sessionsRepo.rows).toHaveLength(1);
    expect(processor.getReplaySkipCount()).toBe(1);
  });

  it('leaves the projection identical after reprocessing the whole stream', async () => {
    const { processor, sessionsRepo, eventsRepo } = build();
    const stream = [
      finalizedEvent({
        txHash: 'a',
        ledger: 10,
        payload: { sessionId: 's-a', player: 'GA', dayId: 1, attemptsUsed: 2 },
      }),
      finalizedEvent({
        txHash: 'b',
        ledger: 11,
        payload: { sessionId: 's-b', player: 'GB', dayId: 1, attemptsUsed: 4 },
      }),
    ];

    for (const e of stream) await processor.process(e);
    const snapshot = JSON.stringify({
      projections: sessionsRepo.rows,
      events: eventsRepo.rows,
    });

    for (const e of stream) expect(await processor.process(e)).toBe(false);
    expect(
      JSON.stringify({
        projections: sessionsRepo.rows,
        events: eventsRepo.rows,
      }),
    ).toBe(snapshot);
  });

  it('treats the same transaction on another network as a different event', async () => {
    const { processor, eventsRepo } = build();
    await processor.process(finalizedEvent());
    expect(
      await processor.process(finalizedEvent({ network: 'mainnet' })),
    ).toBe(true);
    expect(eventsRepo.rows).toHaveLength(2);
  });

  it('reprocessing the same RPC page twice produces the same state', async () => {
    const page = [
      rawEvent({
        topic: 'session_finalized',
        txHash: 'tx-final',
        ledger: 200,
        payload: finalizedEvent().payload,
      }),
    ];
    const { indexer, sessionsRepo, eventsRepo } = build({ rpcEvents: page });

    await indexer.poll();
    const first = JSON.stringify({ s: sessionsRepo.rows, e: eventsRepo.rows });
    await indexer.poll();

    expect(JSON.stringify({ s: sessionsRepo.rows, e: eventsRepo.rows })).toBe(
      first,
    );
    expect(eventsRepo.rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Polling with mocked RPC + malformed events
// ---------------------------------------------------------------------------

describe('polling fixture events', () => {
  it('ingests every known event type returned by the mocked RPC', async () => {
    const { indexer, eventsRepo, fetchEvents } = build({
      rpcEvents: fixtureRawEvents(),
    });

    const ingested = await indexer.poll();

    expect(fetchEvents).toHaveBeenCalledWith('http://rpc.test', CONTRACT, 0);
    expect(ingested).toBe(ALL_FIXTURES.length);
    expect(eventsRepo.rows.map((r) => r.topic).sort()).toEqual(
      ALL_FIXTURES.map((f) => f.topic).sort(),
    );
  });

  it('ingests events in cursor order regardless of RPC order', async () => {
    const reversed = fixtureRawEvents().reverse();
    const { indexer, eventsRepo } = build({ rpcEvents: reversed });
    await indexer.poll();
    expect(eventsRepo.rows.map((r) => r.ledger)).toEqual(
      [...eventsRepo.rows.map((r) => r.ledger)].sort((a, b) => a - b),
    );
  });
});

describe('malformed events', () => {
  const sinkRecords = (): {
    sink: MalformedEventSink;
    records: MalformedEvent[];
  } => {
    const records: MalformedEvent[] = [];
    return { sink: { record: (e) => void records.push(e) }, records };
  };

  const malformed = [
    { label: 'not an object', raw: 'garbage', stage: 'structure' },
    {
      label: 'missing tx hash',
      raw: rawEvent({ txHash: undefined }),
      stage: 'structure',
    },
    {
      label: 'ledger of the wrong type',
      raw: rawEvent({ ledger: '100' }),
      stage: 'structure',
    },
    {
      label: 'unknown topic',
      raw: rawEvent({ topic: 'not_a_topic' }),
      stage: 'validation',
    },
    {
      label: 'oversized payload',
      raw: rawEvent({ payload: { x: 'y'.repeat(9_000) } }),
      stage: 'validation',
    },
  ] as const;

  it.each(malformed)(
    'routes an event with $label to the dead-letter sink',
    async ({ raw, stage }) => {
      const { indexer, eventsRepo } = build({
        rpcEvents: [raw as Record<string, unknown>],
      });
      const { sink, records } = sinkRecords();
      indexer.setMalformedEventSink(sink);

      const ingested = await indexer.poll();

      expect(ingested).toBe(0);
      expect(eventsRepo.rows).toHaveLength(0);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ stage, index: 0, raw });
      expect(records[0].reason.length).toBeGreaterThan(0);
    },
  );

  it('still ingests the valid events around a malformed one', async () => {
    const good = rawEvent({
      topic: 'session_started',
      txHash: 'good-1',
      ledger: 10,
    });
    const alsoGood = rawEvent({
      topic: 'guess_submitted',
      txHash: 'good-2',
      ledger: 11,
    });
    const { indexer, eventsRepo } = build({
      rpcEvents: [good, { nope: true }, alsoGood],
    });
    const { sink, records } = sinkRecords();
    indexer.setMalformedEventSink(sink);

    expect(await indexer.poll()).toBe(2);
    expect(eventsRepo.rows.map((r) => r.txHash)).toEqual(['good-1', 'good-2']);
    expect(records.map((r) => r.index)).toEqual([1]);
  });

  it('drops malformed events without a sink instead of failing the cycle', async () => {
    const { indexer, eventsRepo } = build({ rpcEvents: [{ nope: true }] });
    await expect(indexer.poll()).resolves.toBe(0);
    expect(eventsRepo.rows).toHaveLength(0);
  });

  it('keeps polling when the sink itself throws', async () => {
    const good = rawEvent({
      topic: 'session_started',
      txHash: 'good-1',
      ledger: 10,
    });
    const { indexer, eventsRepo } = build({
      rpcEvents: [{ nope: true }, good],
    });
    indexer.setMalformedEventSink({
      record: () => {
        throw new Error('queue down');
      },
    });

    expect(await indexer.poll()).toBe(1);
    expect(eventsRepo.rows).toHaveLength(1);
  });
});
