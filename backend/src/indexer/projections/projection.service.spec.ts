/**
 * Fixture conformance tests for the indexer normalizer and projection processors.
 * Each fixture represents a canonical contract event emitted by a foundation contract.
 * Tests detect schema drift: if the normalizer or projection rejects a known-good fixture,
 * the contract schema has diverged from the indexer's expectations.
 *
 * Fixture source: soroban/contracts/core_game (session_started, guess_submitted, session_finalized),
 *                 soroban/contracts/rewards (reward_claimed),
 *                 soroban/contracts/achievements (achievement_unlocked).
 */
import { EventNormalizerService } from '../processors/event-normalizer.service';
import { ProjectionService } from './projection.service';
import type { IngestedEventDto } from '../dto/ingested-event.dto';

// ---------------------------------------------------------------------------
// Canonical contract event fixtures
// ---------------------------------------------------------------------------

const BASE = {
  network: 'testnet' as const,
  txHash: 'aabbcc0011223344',
  ledger: 1000,
  eventIndex: 0,
  observedAt: new Date('2024-01-01T00:00:00Z'),
};

const FIXTURES: Array<{
  label: string;
  raw: Parameters<EventNormalizerService['normalize']>[1];
  expectedTopic: string;
}> = [
  {
    label: 'core_game: session_started',
    raw: {
      contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
      topic: 'session_started',
      txHash: BASE.txHash,
      ledger: BASE.ledger,
      eventIndex: 0,
      payload: { sessionId: 'sess-001', player: 'GABC', dayId: 42 },
    },
    expectedTopic: 'session_started',
  },
  {
    label: 'core_game: guess_submitted',
    raw: {
      contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
      topic: 'guess_submitted',
      txHash: BASE.txHash,
      ledger: BASE.ledger,
      eventIndex: 1,
      payload: {
        sessionId: 'sess-001',
        player: 'GABC',
        attempt: 1,
        commitment: 'deadbeef',
      },
    },
    expectedTopic: 'guess_submitted',
  },
  {
    label: 'core_game: session_finalized',
    raw: {
      contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
      topic: 'session_finalized',
      txHash: BASE.txHash,
      ledger: BASE.ledger,
      eventIndex: 2,
      payload: {
        sessionId: 'sess-001',
        player: 'GABC',
        dayId: 42,
        status: 'Won',
        attemptsUsed: 3,
      },
    },
    expectedTopic: 'session_finalized',
  },
  {
    label: 'rewards: reward_claimed',
    raw: {
      contractId: 'CREWARDS000000000000000000000000000000000000000000000',
      topic: 'reward_claimed',
      txHash: 'ff00ff00ff00ff00',
      ledger: 1001,
      eventIndex: 0,
      payload: { player: 'GABC', rewardId: 'daily-42', amount: 100 },
    },
    expectedTopic: 'reward_claimed',
  },
  {
    label: 'achievements: achievement_unlocked',
    raw: {
      contractId: 'CACHIEVEMENTS000000000000000000000000000000000000000',
      topic: 'achievement_unlocked',
      txHash: 'ee11ee11ee11ee11',
      ledger: 1002,
      eventIndex: 0,
      payload: { player: 'GABC', achievementId: 'first-win' },
    },
    expectedTopic: 'achievement_unlocked',
  },
];

// ---------------------------------------------------------------------------
// Normalizer conformance
// ---------------------------------------------------------------------------

describe('EventNormalizerService — fixture conformance', () => {
  const normalizer = new EventNormalizerService();

  for (const fixture of FIXTURES) {
    it(`accepts and validates: ${fixture.label}`, () => {
      const event = normalizer.normalize('testnet', fixture.raw);

      expect(event.topic).toBe(fixture.expectedTopic);
      expect(event.contractId).toBeTruthy();
      expect(event.txHash).toBeTruthy();
      expect(event.ledger).toBeGreaterThan(0);
      expect(event.eventIndex).toBeGreaterThanOrEqual(0);

      const valid = normalizer.isValid(event);
      if (!valid) {
        // Actionable diagnostic on schema drift
        throw new Error(
          `[SCHEMA DRIFT] Fixture '${fixture.label}' failed isValid().\n` +
            `  topic='${event.topic}' contractId='${event.contractId}' ledger=${event.ledger}\n` +
            `  Check ALLOWED_TOPICS in event-normalizer.service.ts or fixture payload size.`,
        );
      }
      expect(valid).toBe(true);
    });
  }

  it('rejects a drifted event with unknown topic (schema drift detection)', () => {
    const drifted = normalizer.normalize('testnet', {
      contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
      topic: 'session_upgraded', // hypothetical new topic not yet in allowlist
      txHash: BASE.txHash,
      ledger: BASE.ledger,
      eventIndex: 0,
    });
    expect(normalizer.isValid(drifted)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProjectionService conformance — session_finalized fixture
// ---------------------------------------------------------------------------

describe('ProjectionService — fixture conformance', () => {
  function makeProjectionService() {
    const saved: unknown[] = [];
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: unknown) => data),
      save: jest.fn(async (data: unknown) => {
        saved.push(data);
        return data;
      }),
    };
    // Bypass DI: inject mock repo directly
    const service = new ProjectionService(mockRepo as never);
    return { service, saved, mockRepo };
  }

  it('applies session_finalized fixture and persists projection', async () => {
    const { service, saved } = makeProjectionService();
    const event: IngestedEventDto = {
      network: 'testnet',
      contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
      topic: 'session_finalized',
      txHash: BASE.txHash,
      ledger: BASE.ledger,
      eventIndex: 2,
      payload: {
        sessionId: 'sess-001',
        player: 'GABC',
        dayId: 42,
        status: 'Won',
        attemptsUsed: 3,
      },
      observedAt: BASE.observedAt,
    };

    await service.apply(event);

    expect(saved).toHaveLength(1);
    const projection = saved[0] as Record<string, unknown>;
    expect(projection['sessionId']).toBe('sess-001');
    expect(projection['player']).toBe('GABC');
    expect(projection['dayId']).toBe(42);
    expect(projection['status']).toBe('Won');
    expect(projection['attemptsUsed']).toBe(3);
    expect(projection['finalized']).toBe(true);
  });

  it('skips non-session_finalized topics without persisting', async () => {
    const { service, saved } = makeProjectionService();
    const event: IngestedEventDto = {
      network: 'testnet',
      contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
      topic: 'guess_submitted',
      txHash: BASE.txHash,
      ledger: BASE.ledger,
      eventIndex: 1,
      payload: { sessionId: 'sess-001', attempt: 1 },
      observedAt: BASE.observedAt,
    };

    await service.apply(event);
    expect(saved).toHaveLength(0);
  });

  it('upserts on duplicate session_finalized (idempotency)', async () => {
    const existingProjection = { id: 'existing-id', sessionId: 'sess-001' };
    const mockRepo = {
      findOne: jest.fn().mockResolvedValue(existingProjection),
      create: jest.fn((data: unknown) => data),
      save: jest.fn().mockResolvedValue(existingProjection),
    };
    const service = new ProjectionService(mockRepo as never);

    const event: IngestedEventDto = {
      network: 'testnet',
      contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
      topic: 'session_finalized',
      txHash: BASE.txHash,
      ledger: BASE.ledger,
      eventIndex: 2,
      payload: {
        sessionId: 'sess-001',
        player: 'GABC',
        dayId: 42,
        status: 'Won',
        attemptsUsed: 3,
      },
      observedAt: BASE.observedAt,
    };

    await service.apply(event);
    const createArg = mockRepo.create.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(createArg['id']).toBe('existing-id'); // preserves existing id → upsert
  });
});
