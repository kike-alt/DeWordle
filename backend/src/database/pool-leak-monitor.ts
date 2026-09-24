import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

const POOL_MAX = 25;
const IDLE_TIMEOUT_MS = 30_000;
const WARN_UTILIZATION = 0.8;

const logger = new Logger('PoolLeakMonitor');

export const poolOptions = {
  max: POOL_MAX,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
};

export function watchPoolUtilization(dataSource: DataSource): NodeJS.Timeout {
  return setInterval(() => {
    const driver = dataSource.driver as unknown as { pool?: { totalCount: number; idleCount: number } };
    const pool = driver.pool;
    if (!pool) return;

    const used = pool.totalCount - pool.idleCount;
    const utilization = used / POOL_MAX;

    if (utilization >= WARN_UTILIZATION) {
      logger.warn(`Connection pool utilization at ${(utilization * 100).toFixed(0)}%`);
    }
  }, 5_000);
}
