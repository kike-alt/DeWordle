/**
 * QA-217: Read-model endpoint performance smoke benchmarks.
 *
 * Scope: measures wall-clock latency of key projection-backed service methods
 * under a synchronous mock so timings reflect pure application logic overhead.
 * These are NOT load tests; they establish a deterministic regression baseline
 * that maintainers can run locally or in CI to catch accidental quadratic scans
 * or unbounded loops introduced during refactors.
 *
 * Thresholds (mocked I/O, no DB):
 *   - single-player summary: < 20 ms
 *   - batch of 50 sessions: < 50 ms
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
    sessionId: 'sess-1',
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

function makeBatch(count: number): SessionProjectionEntity[] {
  return Array.from({ length: count }, (_, i) =>
    makeSession({
      id: i + 1,
      sessionId: `sess-${i + 1}`,
      attemptsUsed: (i % 6) + 1,
      status: i % 4 === 0 ? 'Lost' : 'Won',
    }),
  );
}

describe('QA-217: RewardSummaryService — performance smoke benchmarks', () => {
  let service: RewardSummaryService;
  const repo = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardSummaryService,
        { provide: getRepositoryToken(SessionProjectionEntity), useValue: repo },
      ],
    }).compile();
    service = module.get(RewardSummaryService);
  });

  it('single-player summary completes within 20 ms (mocked I/O)', async () => {
    repo.find.mockResolvedValue([makeSession()]);

    const t0 = Date.now();
    await service.getForPlayer('testnet', 'GABC');
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(20);
  });

  it('batch of 50 sessions completes within 50 ms (mocked I/O)', async () => {
    repo.find.mockResolvedValue(makeBatch(50));

    const t0 = Date.now();
    await service.getForPlayer('testnet', 'GABC');
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(50);
  });

  it('empty-player summary completes within 20 ms', async () => {
    repo.find.mockResolvedValue([]);

    const t0 = Date.now();
    await service.getForPlayer('testnet', 'GHOST');
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(20);
  });

  it('benchmark result shape is consistent across repeated calls', async () => {
    repo.find.mockResolvedValue([makeSession({ attemptsUsed: 2 })]);

    const [r1, r2] = await Promise.all([
      service.getForPlayer('testnet', 'GABC'),
      service.getForPlayer('testnet', 'GABC'),
    ]);

    expect(r1.accrued).toBe(r2.accrued);
    expect(r1.sessionCount).toBe(r2.sessionCount);
    expect(r1.state).toBe(r2.state);
  });

  it('100-session batch: accrued is deterministic and > 0', async () => {
    repo.find.mockResolvedValue(makeBatch(100));

    const result = await service.getForPlayer('testnet', 'GABC');

    expect(result.sessionCount).toBe(100);
    expect(result.accrued).toBeGreaterThan(0);
    expect(typeof result.accrued).toBe('number');
    expect(Number.isFinite(result.accrued)).toBe(true);
  });
});
