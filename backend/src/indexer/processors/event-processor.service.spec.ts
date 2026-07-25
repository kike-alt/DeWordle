import { EventProcessorService } from './event-processor.service';
import { ProjectionService } from '../projections/projection.service';
import { IngestedEventDto } from '../dto/ingested-event.dto';
import { computeAuditEventHash } from '../audit/event-hash';

const makeEvent = (
  overrides: Partial<IngestedEventDto> = {},
): IngestedEventDto => ({
  network: 'testnet',
  contractId: 'CABC',
  topic: 'session_finalized',
  txHash: 'tx1',
  ledger: 10,
  eventIndex: 0,
  payload: {
    sessionId: 's1',
    player: 'p1',
    dayId: 1,
    status: 'Finalized',
    attemptsUsed: 3,
  },
  observedAt: new Date(),
  ...overrides,
});

describe('EventProcessorService', () => {
  const makeProcessor = (existingEvent: boolean) => {
    const projectionService = {
      apply: jest.fn().mockResolvedValue(true),
    } as unknown as ProjectionService;
    const eventsRepo = {
      findOne: jest.fn().mockResolvedValue(existingEvent ? { id: 1 } : null),
      create: jest.fn((e) => e),
      save: jest.fn().mockResolvedValue({}),
    };
    const svc = new EventProcessorService(
      eventsRepo as any,
      projectionService,
      {
        process: jest.fn(),
      } as any,
    );
    return { svc, eventsRepo, projectionService };
  };

  it('processes a new event and applies projection', async () => {
    const { svc, eventsRepo, projectionService } = makeProcessor(false);
    const result = await svc.process(makeEvent());
    expect(result).toBe(true);
    expect(eventsRepo.save).toHaveBeenCalled();
    const savedArg = eventsRepo.save.mock.calls[0][0];
    expect(savedArg.auditHash).toEqual(
      computeAuditEventHash({
        network: savedArg.network,
        contractId: savedArg.contractId,
        topic: savedArg.topic,
        txHash: savedArg.txHash,
        ledger: savedArg.ledger,
        eventIndex: savedArg.eventIndex,
        payload: savedArg.payload,
      }),
    );
    expect(projectionService.apply).toHaveBeenCalled();
  });

  it('returns false and skips projection for duplicate event', async () => {
    const { svc, eventsRepo, projectionService } = makeProcessor(true);
    const result = await svc.process(makeEvent());
    expect(result).toBe(false);
    expect(eventsRepo.save).not.toHaveBeenCalled();
    expect(projectionService.apply).not.toHaveBeenCalled();
  });

  it('increments replaySkipCount on each duplicate', async () => {
    const { svc } = makeProcessor(true);
    await svc.process(makeEvent());
    await svc.process(makeEvent());
    expect(svc.getReplaySkipCount()).toBe(2);
  });

  it('deterministic no-op: processing same event twice returns false on second call', async () => {
    let callCount = 0;
    const eventsRepo = {
      findOne: jest
        .fn()
        .mockImplementation(async () => (callCount++ > 0 ? { id: 1 } : null)),
      create: jest.fn((e) => e),
      save: jest.fn().mockResolvedValue({}),
    };
    const projectionService = {
      apply: jest.fn().mockResolvedValue(true),
    } as unknown as ProjectionService;
    const svc = new EventProcessorService(
      eventsRepo as any,
      projectionService,
      {
        process: jest.fn(),
      } as any,
    );

    const first = await svc.process(makeEvent());
    const second = await svc.process(makeEvent());
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});

describe('ProjectionService', () => {
  const makeProjection = (existing?: object) => {
    const sessionsRepo = {
      findOne: jest.fn().mockResolvedValue(existing ?? null),
      create: jest.fn((e) => e),
      save: jest.fn().mockResolvedValue({}),
    };
    const { ProjectionService: PS } = jest.requireActual(
      '../projections/projection.service',
    );
    const svc = new PS(sessionsRepo);
    return { svc, sessionsRepo };
  };

  it('applies session_finalized event', async () => {
    const { svc, sessionsRepo } = makeProjection();
    const result = await svc.apply(makeEvent());
    expect(result).toBe(true);
    expect(sessionsRepo.save).toHaveBeenCalled();
  });

  it('is idempotent: replaying same event upserts with same id', async () => {
    const { svc, sessionsRepo } = makeProjection({ id: 99 });
    await svc.apply(makeEvent());
    const saved = sessionsRepo.save.mock.calls[0][0];
    expect(saved.id).toBe(99);
  });

  it('ignores non-session_finalized topics', async () => {
    const { svc, sessionsRepo } = makeProjection();
    const result = await svc.apply(makeEvent({ topic: 'other_event' }));
    expect(result).toBe(false);
    expect(sessionsRepo.save).not.toHaveBeenCalled();
  });

  it('ignores session_finalized with missing sessionId', async () => {
    const { svc, sessionsRepo } = makeProjection();
    const result = await svc.apply(makeEvent({ payload: {} }));
    expect(result).toBe(false);
    expect(sessionsRepo.save).not.toHaveBeenCalled();
  });
});
