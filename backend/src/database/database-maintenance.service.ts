import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

const MAINTENANCE_TABLES = ['game_sessions', 'guess_history', 'audit_trail'] as const;

@Injectable()
export class DatabaseMaintenanceService {
  private readonly logger = new Logger(DatabaseMaintenanceService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_WEEK, { timeZone: 'UTC' })
  async runVacuumAnalyze(): Promise<void> {
    const startedAt = Date.now();
    this.logger.log({
      msg: 'db.maintenance.start',
      tables: MAINTENANCE_TABLES,
    });

    try {
      for (const table of MAINTENANCE_TABLES) {
        await this.dataSource.query(`VACUUM ANALYZE ${table}`);
      }
      this.logger.log({
        msg: 'db.maintenance.complete',
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      this.logger.error({
        msg: 'db.maintenance.failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
