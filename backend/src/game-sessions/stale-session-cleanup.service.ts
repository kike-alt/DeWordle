import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThan } from 'typeorm';
import { GameSession } from './entities/game-session.entity';
import { GameSessionStatus } from './game-sessions.constants';

const STALE_SESSION_AGE_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class StaleSessionCleanupService {
  private readonly logger = new Logger(StaleSessionCleanupService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupStaleSessions(): Promise<number> {
    const startedAt = Date.now();
    const cutoff = new Date(startedAt - STALE_SESSION_AGE_MS);
    const result = await this.dataSource.transaction((manager) =>
      manager.update(
        GameSession,
        {
          status: GameSessionStatus.IN_PROGRESS,
          playedAt: LessThan(cutoff),
        },
        { status: GameSessionStatus.EXPIRED },
      ),
    );
    const count = result.affected ?? 0;

    this.logger.log({
      msg: 'sessions.stale_cleanup.complete',
      count,
      durationMs: Date.now() - startedAt,
    });

    return count;
  }
}
