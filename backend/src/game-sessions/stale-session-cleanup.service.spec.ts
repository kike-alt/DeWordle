import { DataSource, LessThan } from 'typeorm';
import { GameSession } from './entities/game-session.entity';
import { GameSessionStatus } from './game-sessions.constants';
import { StaleSessionCleanupService } from './stale-session-cleanup.service';

describe('StaleSessionCleanupService', () => {
  const now = new Date('2026-11-19T12:00:00.000Z');
  let service: StaleSessionCleanupService;
  let update: jest.Mock;
  let transaction: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    update = jest.fn().mockResolvedValue({ affected: 2 });
    transaction = jest.fn((callback: (manager: { update: jest.Mock }) => unknown) =>
      callback({ update }),
    );
    service = new StaleSessionCleanupService({
      transaction,
    } as unknown as DataSource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('expires only in-progress sessions older than 48 hours in one transaction', async () => {
    await expect(service.cleanupStaleSessions()).resolves.toBe(2);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      GameSession,
      {
        status: GameSessionStatus.IN_PROGRESS,
        playedAt: LessThan(new Date(now.getTime() - 48 * 60 * 60 * 1000)),
      },
      { status: GameSessionStatus.EXPIRED },
    );
  });
});
