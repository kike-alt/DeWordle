import { Test } from '@nestjs/testing';
import { IndexerService } from './indexer.service';

// #1702: the same ledger event delivered twice must be processed once.
describe('IndexerService dedup', () => {
  it('ignores duplicate ledger events', async () => {
    const moduleRef = await Test.createTestingModule({ providers: [IndexerService] }).compile();
    const indexer = moduleRef.get(IndexerService) as any;
    const handler = jest.fn();
    indexer.handleEvent = handler;

    const event = { id: '0000123-0000001', ledger: 123, type: 'session_started' };
    await indexer.process(event);
    await indexer.process(event);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
