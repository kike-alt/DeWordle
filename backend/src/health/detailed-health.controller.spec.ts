import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DetailedHealthController } from './detailed-health.controller';

describe('DetailedHealthController', () => {
  const heartbeat = new Date('2026-11-19T12:00:00.000Z');
  let controller: DetailedHealthController;
  let redisHealth: { check: jest.Mock };
  let jobService: { getQueueHealth: jest.Mock };
  let indexerWorker: { getLastHeartbeatAt: jest.Mock };
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    redisHealth = { check: jest.fn().mockResolvedValue({ redis: { status: 'up' } }) };
    jobService = {
      getQueueHealth: jest.fn().mockResolvedValue({
        active: 1,
        waiting: 2,
        failed: 0,
        paused: false,
        workerCount: 1,
      }),
    };
    indexerWorker = { getLastHeartbeatAt: jest.fn().mockReturnValue(heartbeat) };
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    controller = new DetailedHealthController(
      redisHealth as never,
      jobService as never,
      indexerWorker as never,
    );
  });

  it('reports queue metrics and a worker heartbeat when connected', async () => {
    await controller.check(response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        queue: {
          status: 'up',
          active: 1,
          waiting: 2,
          failed: 0,
          paused: false,
          workerCount: 1,
          workerHeartbeatAt: heartbeat.toISOString(),
        },
      }),
    );
  });

  it('returns 503 when Redis is unavailable', async () => {
    redisHealth.check.mockRejectedValue(new Error('redis unavailable'));

    await controller.check(response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ queue: expect.objectContaining({ status: 'down' }) }),
    );
    expect(jobService.getQueueHealth).not.toHaveBeenCalled();
  });
});
