/**
 * Soak test profile – indexer worker stability (W5-3C-QA-007)
 *
 * Drives the queue through high-volume, sustained ingest cycles and asserts
 * that throughput, error rate, and lag trend stay within acceptable bounds.
 * Runs in Jest (fast, in-process) so it fits the existing test harness.
 */
import { IndexerQueueService } from './indexer-queue.service';
import { IngestedEventDto } from '../dto/ingested-event.dto';

function makeEvent(ledger: number, idx: number): IngestedEventDto {
  return {
    network: 'testnet',
    contractId: 'c1',
    topic: 'guess_submitted',
    txHash: `tx-${ledger}`,
    ledger,
    eventIndex: idx,
    payload: {},
    observedAt: new Date(),
  };
}

const CYCLES = 50; // number of ingest rounds
const BATCH_SIZE = 100; // events per round (well below 500-buffer limit so queue drains each round)
const MAX_ERROR_RATE = 0; // no rejections expected when draining each cycle

describe('IndexerQueueService – soak profile', () => {
  let service: IndexerQueueService;

  beforeEach(() => {
    service = new IndexerQueueService();
  });

  it('sustains throughput across many ingest cycles with zero rejection', async () => {
    let totalEnqueued = 0;
    let totalRejected = 0;
    let ledger = 1;
    const lagSamples: number[] = [];

    for (let cycle = 0; cycle < CYCLES; cycle++) {
      const before = Date.now();

      for (let i = 0; i < BATCH_SIZE; i++, ledger++) {
        const ok = await service.enqueue(makeEvent(ledger, i));
        if (ok) totalEnqueued++;
        else totalRejected++;
      }

      const drained = service.drain();
      const lag = Date.now() - before;
      lagSamples.push(lag);

      // every cycle must drain exactly what was enqueued
      expect(drained).toHaveLength(BATCH_SIZE);
      expect(service.size()).toBe(0);
    }

    const errorRate = totalRejected / (totalEnqueued + totalRejected);
    const avgLag = lagSamples.reduce((a, b) => a + b, 0) / lagSamples.length;
    const maxLag = Math.max(...lagSamples);

    // soak report
    console.log(
      '[soak] throughput:',
      totalEnqueued,
      'events over',
      CYCLES,
      'cycles',
    );
    console.log('[soak] error rate:', (errorRate * 100).toFixed(2) + '%');
    console.log(
      '[soak] avg lag/cycle (ms):',
      avgLag.toFixed(2),
      '  max:',
      maxLag,
    );

    expect(errorRate).toBe(MAX_ERROR_RATE);
    expect(totalEnqueued).toBe(CYCLES * BATCH_SIZE);
    // lag trend: no individual cycle should exceed 1 second (generous for CI)
    expect(maxLag).toBeLessThan(1000);
  });

  it('recovers buffer to zero after each drain (no memory leak across cycles)', async () => {
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      for (let i = 0; i < 10; i++) {
        await service.enqueue(makeEvent(cycle * 10 + i + 1, i));
      }
      service.drain();
      expect(service.size()).toBe(0);
    }
  });
});
