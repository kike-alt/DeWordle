import { IndexerWorkerService } from './indexer-worker.service';
import { ReplayAlertService } from './replay-alert.service';
import {
  INDEXER_NETWORK_TESTNET,
  INDEXER_STREAM_CORE_GAME,
} from '../indexer.constants';

describe('IndexerWorkerService', () => {
  it('includes replay alert tags in the worker tick log payload', async () => {
    const loggerLog = jest.fn();
    const loggerWarn = jest.fn();

    const indexerService = {
      metrics: {
        replaySkips: 6,
        ingestedTotal: 10,
        projectionErrors: 0,
        pollCycles: 3,
      },
      poll: jest.fn().mockResolvedValue(0),
    } as any;

    const cursorService = {
      getOrCreate: jest.fn().mockResolvedValue({
        lastLedger: 99,
        lastTxHash: 'tx-1',
        lastEventIndex: 2,
      }),
    } as any;

    const configService = {
      get: jest.fn().mockReturnValue(INDEXER_NETWORK_TESTNET),
    } as any;

    const replayAlertService = new ReplayAlertService();
    jest.spyOn(replayAlertService, 'snapshot').mockReturnValue({
      windowSkips: 5,
      threshold: 5,
      isAlerting: true,
      lastRejectedAt: new Date('2026-05-30T00:00:00.000Z'),
      alertTag: 'replay_rejection_threshold_exceeded',
    });

    const worker = new IndexerWorkerService(
      indexerService,
      cursorService,
      configService,
      replayAlertService,
    );

    (worker as unknown as { logger: { log: typeof loggerLog } }).logger.log =
      loggerLog;
    (worker as unknown as { logger: { warn: typeof loggerWarn } }).logger.warn =
      loggerWarn;

    await worker.tick();

    expect(cursorService.getOrCreate).toHaveBeenCalledWith(
      INDEXER_NETWORK_TESTNET,
      INDEXER_STREAM_CORE_GAME,
    );
    expect(loggerLog).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'indexer.worker.tick',
        replayAlertTag: 'replay_rejection_threshold_exceeded',
      }),
    );
    expect(indexerService.poll).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: expect.any(String) }),
    );
  });
});
