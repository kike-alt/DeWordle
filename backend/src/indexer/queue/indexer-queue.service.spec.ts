import { IndexerQueueService } from './indexer-queue.service';
import { IngestedEventDto } from '../dto/ingested-event.dto';

function makeEvent(
  ledger: number,
  txHash: string,
  eventIndex: number,
): IngestedEventDto {
  return {
    network: 'testnet',
    contractId: 'contract-1',
    topic: 'guess_submitted',
    txHash,
    ledger,
    eventIndex,
    payload: {},
    observedAt: new Date(),
  };
}

describe('IndexerQueueService', () => {
  let service: IndexerQueueService;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new IndexerQueueService();
    const logger = (
      service as unknown as { logger: { warn: (...args: unknown[]) => void } }
    ).logger;
    loggerWarnSpy = jest.spyOn(logger, 'warn');
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
  });

  it('drain returns events sorted by ledger -> txHash -> eventIndex', async () => {
    await service.enqueue(makeEvent(10, 'tx-b', 0));
    await service.enqueue(makeEvent(10, 'tx-a', 1));
    await service.enqueue(makeEvent(9, 'tx-z', 0));
    await service.enqueue(makeEvent(10, 'tx-a', 0));

    const drained = service.drain();

    expect(drained).toHaveLength(4);
    expect(drained[0]).toMatchObject({
      ledger: 9,
      txHash: 'tx-z',
      eventIndex: 0,
    });
    expect(drained[1]).toMatchObject({
      ledger: 10,
      txHash: 'tx-a',
      eventIndex: 0,
    });
    expect(drained[2]).toMatchObject({
      ledger: 10,
      txHash: 'tx-a',
      eventIndex: 1,
    });
    expect(drained[3]).toMatchObject({
      ledger: 10,
      txHash: 'tx-b',
      eventIndex: 0,
    });
  });

  it('drain on empty queue returns empty array', () => {
    expect(service.drain()).toEqual([]);
  });

  it('drain clears the queue (no mutation side effects)', async () => {
    await service.enqueue(makeEvent(1, 'tx-a', 0));
    expect(service.size()).toBe(1);

    service.drain();

    expect(service.size()).toBe(0);
    expect(service.drain()).toEqual([]);
  });

  it('drain result is a snapshot — mutating it does not affect the queue', async () => {
    await service.enqueue(makeEvent(1, 'tx-a', 0));
    await service.enqueue(makeEvent(2, 'tx-b', 0));

    const first = service.drain();
    first.push(makeEvent(99, 'tx-injected', 0));

    expect(service.size()).toBe(0);
  });

  it('size reflects enqueued count before drain', async () => {
    expect(service.size()).toBe(0);
    await service.enqueue(makeEvent(1, 'tx-a', 0));
    await service.enqueue(makeEvent(2, 'tx-b', 0));
    expect(service.size()).toBe(2);
  });

  it('rejects events once the bounded buffer is full', async () => {
    for (let i = 0; i < 500; i += 1) {
      expect(await service.enqueue(makeEvent(i + 1, `tx-${i}`, 0))).toBe(true);
    }

    expect(service.enqueue(makeEvent(999, 'tx-overflow', 0))).toBe(false);
    expect(service.size()).toBe(500);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'indexer.queue.rejected',
        reason: 'buffer_limit_reached',
      }),
    );
  });
});
