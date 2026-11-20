import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IndexerWorkerService } from '../indexer/queue/indexer-worker.service';
import { JobService } from '../common/job.service';
import { RedisHealthIndicator } from './redis-health.indicator';

interface ProbeResult {
  name: string;
  ok: boolean;
  latencyMs: number;
}

interface QueueStatus {
  status: 'up' | 'degraded' | 'down';
  active: number;
  waiting: number;
  failed: number;
  paused: boolean;
  workerCount: number;
  workerHeartbeatAt: string | null;
}

async function timeProbe(
  name: string,
  probe: () => Promise<void>,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    await probe();
    return { name, ok: true, latencyMs: Date.now() - start };
  } catch {
    return { name, ok: false, latencyMs: Date.now() - start };
  }
}

@Controller('health/detailed')
export class DetailedHealthController {
  private readonly logger = new Logger(DetailedHealthController.name);

  constructor(
    private readonly redisHealth: RedisHealthIndicator,
    private readonly jobService: JobService,
    private readonly indexerWorker: IndexerWorkerService,
  ) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const queueStartedAt = Date.now();
    const workerHeartbeatAt =
      this.indexerWorker.getLastHeartbeatAt()?.toISOString() ?? null;
    let queue: QueueStatus;

    try {
      await this.redisHealth.check('redis');
      const stats = await this.jobService.getQueueHealth();
      const operational = !stats.paused && stats.workerCount > 0;
      queue = {
        ...stats,
        status: operational ? 'up' : 'degraded',
        workerHeartbeatAt,
      };
    } catch (error) {
      this.logger.warn({
        msg: 'health.queue.unavailable',
        error: error instanceof Error ? error.message : String(error),
      });
      queue = {
        status: 'down',
        active: 0,
        waiting: 0,
        failed: 0,
        paused: false,
        workerCount: 0,
        workerHeartbeatAt,
      };
    }

    const queueProbe: ProbeResult = {
      name: 'queue',
      ok: queue.status === 'up',
      latencyMs: Date.now() - queueStartedAt,
    };
    const probes = await Promise.all([
      timeProbe('postgres', async () => {}),
      timeProbe('stellar-rpc', async () => {}),
    ]);
    probes.push(queueProbe);

    const healthy = probes.every((probe) => probe.ok);
    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: healthy ? 'ok' : 'degraded',
      probes,
      queue,
    });
  }
}
