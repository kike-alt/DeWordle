import {
  EventNormalizerService,
  ALLOWED_TOPICS,
  DEFAULT_MAX_PAYLOAD_BYTES,
} from './event-normalizer.service';

describe('EventNormalizerService', () => {
  const service = new EventNormalizerService();

  it('normalizes topic case and defaults payload', () => {
    const normalized = service.normalize('testnet', {
      contractId: 'C123',
      topic: ' Session_Finalized ',
      txHash: 'abc',
      ledger: 123,
      eventIndex: 2,
    });

    expect(normalized.topic).toBe('session_finalized');
    expect(normalized.payload).toEqual({});
    expect(service.isValid(normalized)).toBe(true);
  });

  describe('topic allowlist', () => {
    it('accepts all allowed topics', () => {
      for (const topic of ALLOWED_TOPICS) {
        const event = service.normalize('testnet', {
          contractId: 'C1',
          topic,
          txHash: 'h1',
          ledger: 1,
          eventIndex: 0,
        });
        expect(service.isValid(event)).toBe(true);
      }
    });

    it('rejects unknown topic', () => {
      const event = service.normalize('testnet', {
        contractId: 'C1',
        topic: 'unknown_event',
        txHash: 'h1',
        ledger: 1,
        eventIndex: 0,
      });
      expect(service.isValid(event)).toBe(false);
    });

    it('rejects empty topic', () => {
      const event = service.normalize('testnet', {
        contractId: 'C1',
        topic: '',
        txHash: 'h1',
        ledger: 1,
        eventIndex: 0,
      });
      expect(service.isValid(event)).toBe(false);
    });
  });

  describe('payload size guard', () => {
    it('accepts payload within default limit', () => {
      const payload = { data: 'x'.repeat(100) };
      const event = service.normalize('testnet', {
        contractId: 'C1',
        topic: 'session_finalized',
        txHash: 'h1',
        ledger: 1,
        eventIndex: 0,
        payload,
      });
      expect(service.isValid(event)).toBe(true);
    });

    it('rejects payload exceeding default limit', () => {
      const payload = { data: 'x'.repeat(DEFAULT_MAX_PAYLOAD_BYTES + 1) };
      const event = service.normalize('testnet', {
        contractId: 'C1',
        topic: 'session_finalized',
        txHash: 'h1',
        ledger: 1,
        eventIndex: 0,
        payload,
      });
      expect(service.isValid(event)).toBe(false);
    });

    it('respects INDEXER_MAX_PAYLOAD_BYTES env override', () => {
      process.env.INDEXER_MAX_PAYLOAD_BYTES = '50';
      const small = new EventNormalizerService();
      const payload = { data: 'x'.repeat(60) };
      const event = small.normalize('testnet', {
        contractId: 'C1',
        topic: 'session_finalized',
        txHash: 'h1',
        ledger: 1,
        eventIndex: 0,
        payload,
      });
      expect(small.isValid(event)).toBe(false);
      delete process.env.INDEXER_MAX_PAYLOAD_BYTES;
    });
  });
});
