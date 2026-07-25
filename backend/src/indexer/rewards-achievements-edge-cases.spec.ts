/**
 * QA-210: Edge-case test matrix for rewards and achievements projections.
 *
 * Covers boundary conditions and anomalous inputs that projection processors
 * must handle gracefully without throwing unhandled exceptions or persisting
 * corrupt state.
 *
 * Matrix dimensions:
 *   Rows: duplicate events | missing definitions | empty balances | partial states
 *   Cols: ProjectionService (session) | RewardSummaryService (reward aggregation)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RewardSummaryService } from './reward-summary.service';
import { ProjectionService } from './projections/projection.service';
import { SessionProjectionEntity } from './entities/session-projection.entity';
import type { IngestedEventDto } from './dto/ingested-event.dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(
  overrides: Partial<SessionProjectionEntity> = {},
): SessionProjectionEntity {
  return {
    id: 1,
    network: 'testnet',
    sessionId: 'sess-edge-1',
    player: 'GABC',
    dayId: 1,
    status: 'Won',
    attemptsUsed: 3,
    finalized: true,
    schemaVersion: 1,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as SessionProjectionEntity;
}

function makeFinalizedEvent(
  overrides: Partial<IngestedEventDto> = {},
): IngestedEventDto {
  return {
    network: 'testnet',
    contractId: 'CCOREGAME0000000000000000000000000000000000000000000',
    topic: 'session_finalized',
    txHash: 'aaaa0000',
    ledger: 100,
    eventIndex: 0,
    payload: {
      sessionId: 'sess-edge-1',
      player: 'GABC',
      dayId: 1,
      status: 'Won',
      attemptsUsed: 3,
    },
    observedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeProjectionService(
  existingSession: SessionProjectionEntity | null = null,
) {
  const saved: unknown[] = [];
  const mockRepo = {
    findOne: jest.fn().mockResolvedValue(existingSession),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: unknown) => {
      saved.push(data);
      return data;
    }),
  };
  const service = new ProjectionService(mockRepo as never);
  return { service, saved, mockRepo };
}

// ---------------------------------------------------------------------------
// A: Duplicate events (idempotency)
// ---------------------------------------------------------------------------

describe('QA-210 edge-case: duplicate events (idempotency)', () => {
  it('ProjectionService: replaying the same session_finalized twice upserts (does not duplicate)', async () => {
    const { service, saved, mockRepo } = makeProjectionService(null);

    const event = makeFinalizedEvent();
    await service.apply(event);

    // Second replay: repo now returns the first projection
    mockRepo.findOne.mockResolvedValue({ id: 99, sessionId: 'sess-edge-1' });
    await service.apply(event);

    // Should have saved twice (upsert), but both times with the same sessionId
    expect(saved).toHaveLength(2);
    const ids = (saved as Array<Record<string, unknown>>).map(
      (s) => s['sessionId'],
    );
    expect(ids.every((id) => id === 'sess-edge-1')).toBe(true);
  });

  it('ProjectionService: second save preserves the existing row id (upsert, not insert)', async () => {
    const existing = { id: 42, sessionId: 'sess-edge-1' };
    const { service, saved } = makeProjectionService(existing as never);

    await service.apply(makeFinalizedEvent());

    const saved0 = saved[0] as Record<string, unknown>;
    expect(saved0['id']).toBe(42);
  });

  it('RewardSummaryService: duplicate sessions in query result are summed (not deduplicated)', async () => {
    const repo = { find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardSummaryService,
        {
          provide: getRepositoryToken(SessionProjectionEntity),
          useValue: repo,
        },
      ],
    }).compile();
    const service = module.get(RewardSummaryService);

    // Two rows with the same sessionId simulate a double-write bug upstream
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 3, status: 'Won' }),
      makeSession({ attemptsUsed: 3, status: 'Won' }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');
    // Both rows counted: total = 4 + 4
    expect(result.sessionCount).toBe(2);
    expect(result.accrued).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// B: Missing definitions / null payload fields
// ---------------------------------------------------------------------------

describe('QA-210 edge-case: missing definitions and null payload fields', () => {
  it('ProjectionService: skips event with missing sessionId (returns false)', async () => {
    const { service, saved } = makeProjectionService();
    const event = makeFinalizedEvent({ payload: { player: 'GABC' } }); // no sessionId

    const result = await service.apply(event);

    expect(result).toBe(false);
    expect(saved).toHaveLength(0);
  });

  it('ProjectionService: skips non-session_finalized topic (returns false)', async () => {
    const { service, saved } = makeProjectionService();
    const event = makeFinalizedEvent({ topic: 'guess_submitted' });

    const result = await service.apply(event);

    expect(result).toBe(false);
    expect(saved).toHaveLength(0);
  });

  it('ProjectionService: missing player field falls back to empty string (does not throw)', async () => {
    const { service, saved } = makeProjectionService();
    const event = makeFinalizedEvent({
      payload: {
        sessionId: 'sess-edge-1',
        dayId: 1,
        status: 'Won',
        attemptsUsed: 3,
      },
    });

    await expect(service.apply(event)).resolves.toBe(true);

    const projection = saved[0] as Record<string, unknown>;
    expect(projection['player']).toBe('');
  });
});

// ---------------------------------------------------------------------------
// C: Empty balances
// ---------------------------------------------------------------------------

describe('QA-210 edge-case: empty balances', () => {
  it('RewardSummaryService: player with zero finalized sessions returns 0 accrued', async () => {
    const repo = { find: jest.fn().mockResolvedValue([]) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardSummaryService,
        {
          provide: getRepositoryToken(SessionProjectionEntity),
          useValue: repo,
        },
      ],
    }).compile();
    const service = module.get(RewardSummaryService);

    const result = await service.getForPlayer('testnet', 'GNEW');
    expect(result.accrued).toBe(0);
    expect(result.state).toBe('unavailable');
  });

  it('RewardSummaryService: all-Lost sessions produce accrued=0 and state=pending', async () => {
    const repo = { find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardSummaryService,
        {
          provide: getRepositoryToken(SessionProjectionEntity),
          useValue: repo,
        },
      ],
    }).compile();
    const service = module.get(RewardSummaryService);

    repo.find.mockResolvedValue([
      makeSession({ status: 'Lost', attemptsUsed: 6 }),
      makeSession({ sessionId: 'sess-2', status: 'Lost', attemptsUsed: 6 }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.accrued).toBe(0);
    expect(result.pendingClaim).toBe(0);
    expect(result.state).toBe('pending'); // sessions exist, but zero balance
  });
});

// ---------------------------------------------------------------------------
// D: Partial state transitions
// ---------------------------------------------------------------------------

describe('QA-210 edge-case: partial state transitions', () => {
  it('ProjectionService: applies attemptsUsed=0 without throwing (clamped to 1 by scoring)', async () => {
    const { service, saved } = makeProjectionService();
    const event = makeFinalizedEvent({
      payload: {
        sessionId: 'sess-edge-1',
        player: 'GABC',
        dayId: 1,
        status: 'Won',
        attemptsUsed: 0,
      },
    });

    await service.apply(event);

    const projection = saved[0] as Record<string, unknown>;
    expect(projection['attemptsUsed']).toBe(0);
  });

  it('RewardSummaryService: attemptsUsed=0 is clamped to 1 for scoring (6 pts max)', async () => {
    const repo = {
      find: jest
        .fn()
        .mockResolvedValue([makeSession({ attemptsUsed: 0, status: 'Won' })]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardSummaryService,
        {
          provide: getRepositoryToken(SessionProjectionEntity),
          useValue: repo,
        },
      ],
    }).compile();
    const service = module.get(RewardSummaryService);

    const result = await service.getForPlayer('testnet', 'GABC');
    // 0 is clamped to 1 → 6 - 1 + 1 = 6
    expect(result.accrued).toBe(6);
  });

  it('RewardSummaryService: mixed partial state (some Won, some Lost) accrues only Won pts', async () => {
    const repo = { find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardSummaryService,
        {
          provide: getRepositoryToken(SessionProjectionEntity),
          useValue: repo,
        },
      ],
    }).compile();
    const service = module.get(RewardSummaryService);

    repo.find.mockResolvedValue([
      makeSession({ sessionId: 'a', attemptsUsed: 1, status: 'Won' }), // 6
      makeSession({ sessionId: 'b', attemptsUsed: 6, status: 'Lost' }), // 0
      makeSession({ sessionId: 'c', attemptsUsed: 4, status: 'Won' }), // 3
      makeSession({ sessionId: 'd', attemptsUsed: 6, status: 'Lost' }), // 0
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.accrued).toBe(9); // 6 + 0 + 3 + 0
    expect(result.sessionCount).toBe(4);
  });
});
