/**
 * QA-209: Golden fixture tests for session history API responses.
 *
 * Each golden fixture represents a representative case for a session history
 * response that frontend contributors can use as a stable integration baseline.
 * If the service logic changes and a golden output drifts, this suite fails and
 * the contributor must consciously update the fixture.
 *
 * Cases covered:
 *   win       — player completed the session in ≤ 6 attempts
 *   loss      — player exhausted all attempts without solving
 *   multi-win — multiple sessions with mixed attempt counts
 *   empty     — player has no session history
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RewardSummaryService } from './reward-summary.service';
import { SessionProjectionEntity } from './entities/session-projection.entity';

function makeSession(
  overrides: Partial<SessionProjectionEntity> = {},
): SessionProjectionEntity {
  return {
    id: 1,
    network: 'testnet',
    sessionId: 'sess-golden-1',
    player: 'GABC',
    dayId: 1,
    status: 'Won',
    attemptsUsed: 3,
    finalized: true,
    schemaVersion: 1,
    updatedAt: new Date('2026-01-15T12:00:00Z'),
    ...overrides,
  } as SessionProjectionEntity;
}

describe('QA-209: RewardSummaryService — golden fixture tests', () => {
  let service: RewardSummaryService;
  const repo = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardSummaryService,
        {
          provide: getRepositoryToken(SessionProjectionEntity),
          useValue: repo,
        },
      ],
    }).compile();
    service = module.get(RewardSummaryService);
  });

  // -- Win fixture -----------------------------------------------------------
  it('golden: win session (3 attempts) — accrued=4, state=pending', async () => {
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 3, status: 'Won' }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');

    // Golden snapshot
    expect(result).toMatchObject({
      accrued: 4, // 6 - 3 + 1
      claimed: 0,
      pendingClaim: 4,
      sessionCount: 1,
      state: 'pending',
    });
    expect(typeof result.lastUpdatedAt).toBe('string');
  });

  // -- Loss fixture ----------------------------------------------------------
  it('golden: loss session — accrued=0, state=pending', async () => {
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 6, status: 'Lost' }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');

    expect(result).toMatchObject({
      accrued: 0,
      claimed: 0,
      pendingClaim: 0,
      sessionCount: 1,
      state: 'pending',
    });
  });

  // -- Multi-win fixture -----------------------------------------------------
  it('golden: multiple wins (1, 3, 6 attempts) — accrued=11, sessionCount=3', async () => {
    repo.find.mockResolvedValue([
      makeSession({ sessionId: 'sess-a', attemptsUsed: 1, status: 'Won' }),
      makeSession({ sessionId: 'sess-b', attemptsUsed: 3, status: 'Won' }),
      makeSession({ sessionId: 'sess-c', attemptsUsed: 6, status: 'Won' }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');

    expect(result.accrued).toBe(11); // 6 + 4 + 1
    expect(result.sessionCount).toBe(3);
    expect(result.pendingClaim).toBe(11);
  });

  // -- Mixed fixture ---------------------------------------------------------
  it('golden: mixed win+loss — only won sessions contribute to accrued', async () => {
    repo.find.mockResolvedValue([
      makeSession({ sessionId: 'sess-w', attemptsUsed: 2, status: 'Won' }),
      makeSession({ sessionId: 'sess-l', attemptsUsed: 6, status: 'Lost' }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');

    expect(result.accrued).toBe(5); // 6 - 2 + 1 = 5; Lost contributes 0
    expect(result.sessionCount).toBe(2);
  });

  // -- Empty history fixture -------------------------------------------------
  it('golden: empty history — state=unavailable, all counts=0', async () => {
    repo.find.mockResolvedValue([]);

    const result = await service.getForPlayer('testnet', 'GHOST');

    expect(result).toEqual({
      accrued: 0,
      claimed: 0,
      pendingClaim: 0,
      sessionCount: 0,
      state: 'unavailable',
    });
    expect(result.lastUpdatedAt).toBeUndefined();
  });

  // -- Max-attempts win fixture ----------------------------------------------
  it('golden: minimum-score win (6 attempts) — accrued=1', async () => {
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 6, status: 'Won' }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.accrued).toBe(1); // 6 - 6 + 1
  });

  // -- 1-attempt win fixture ------------------------------------------------
  it('golden: perfect win (1 attempt) — accrued=6', async () => {
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 1, status: 'Won' }),
    ]);

    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.accrued).toBe(6); // 6 - 1 + 1
  });
});
