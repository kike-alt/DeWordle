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
    sessionId: 'sess-1',
    player: 'GABC',
    dayId: 1,
    status: 'Won',
    attemptsUsed: 3,
    finalized: true,
    schemaVersion: 1,
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  } as SessionProjectionEntity;
}

describe('RewardSummaryService', () => {
  let service: RewardSummaryService;
  const repo = {
    find: jest.fn(),
  };

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

  it('returns unavailable state when no sessions exist', async () => {
    repo.find.mockResolvedValue([]);
    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.state).toBe('unavailable');
    expect(result.accrued).toBe(0);
    expect(result.sessionCount).toBe(0);
  });

  it('correctly accrues points for won sessions', async () => {
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 1, status: 'Won' }), // 6 pts
      makeSession({ attemptsUsed: 3, status: 'Won' }), // 4 pts
      makeSession({ attemptsUsed: 6, status: 'Won' }), // 1 pt
    ]);
    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.accrued).toBe(11);
    expect(result.sessionCount).toBe(3);
    expect(result.state).toBe('pending');
  });

  it('does not accrue points for lost sessions', async () => {
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 6, status: 'Lost' }),
    ]);
    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.accrued).toBe(0);
  });

  it('calculates pendingClaim as accrued minus claimed', async () => {
    repo.find.mockResolvedValue([
      makeSession({ attemptsUsed: 2, status: 'Won' }),
    ]);
    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.pendingClaim).toBe(result.accrued - result.claimed);
  });

  it('includes lastUpdatedAt from the most recent session', async () => {
    const date = new Date('2026-06-26T10:00:00Z');
    repo.find.mockResolvedValue([makeSession({ updatedAt: date })]);
    const result = await service.getForPlayer('testnet', 'GABC');
    expect(result.lastUpdatedAt).toBe(date.toISOString());
  });
});
