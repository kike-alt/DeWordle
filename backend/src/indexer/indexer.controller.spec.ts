import { IndexerController } from './indexer.controller';

describe('IndexerController', () => {
  let controller: IndexerController;
  let indexerService: Record<string, jest.Mock>;
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    indexerService = {
      ingest: jest.fn(),
      getLagSnapshot: jest.fn(),
      resetCursor: jest.fn().mockResolvedValue(undefined),
      resetProjections: jest.fn().mockResolvedValue(undefined),
    };

    auditService = {
      log: jest.fn().mockResolvedValue({ id: 1 }),
    };

    controller = new IndexerController(
      indexerService as never,
      auditService as never,
    );
  });

  it('returns the lag snapshot schema and values', async () => {
    indexerService.getLagSnapshot.mockResolvedValue({
      network: 'testnet',
      streamKey: 'core_game_events',
      cursor: {
        lastLedger: 120,
        lastTxHash: 'tx-abc',
        lastEventIndex: 4,
        updatedAt: '2026-05-29T12:34:56.000Z',
      },
      lastProcessedTxHash: 'tx-abc',
      networkLatestLedger: 125,
      lagLedgers: 5,
      replaySkips: 2,
      ingestedTotal: 33,
      projectionErrors: 1,
      pollCycles: 8,
    });

    await expect(controller.getLag()).resolves.toEqual({
      network: 'testnet',
      streamKey: 'core_game_events',
      cursor: {
        lastLedger: 120,
        lastTxHash: 'tx-abc',
        lastEventIndex: 4,
        updatedAt: '2026-05-29T12:34:56.000Z',
      },
      lastProcessedTxHash: 'tx-abc',
      networkLatestLedger: 125,
      lagLedgers: 5,
      replaySkips: 2,
      ingestedTotal: 33,
      projectionErrors: 1,
      pollCycles: 8,
    });
  });

  it('logs audit entry on cursor reset', async () => {
    const req = { user: { walletAddress: 'GBTEST123' } };
    await controller.resetCursor(
      'testnet',
      'core_game_events',
      'true',
      req as any,
    );

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cursor_reset',
        actor: 'GBTEST123',
        network: 'testnet',
      }),
    );
    expect(indexerService.resetCursor).toHaveBeenCalledWith(
      'testnet',
      'core_game_events',
    );
  });

  it('does not reset cursor when confirm is not true', async () => {
    const req = { user: { walletAddress: 'GBTEST123' } };
    const result = await controller.resetCursor(
      'testnet',
      'core_game_events',
      'false',
      req as any,
    );

    expect(result).toEqual({
      status: 'refused',
      reason: 'confirm=true required',
    });
    expect(indexerService.resetCursor).not.toHaveBeenCalled();
  });

  it('logs audit entry on projections reset', async () => {
    const req = { user: { email: 'admin@test.com' } };
    await controller.resetProjections('true', req as any);

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'projections_reset',
        actor: 'admin@test.com',
      }),
    );
    expect(indexerService.resetProjections).toHaveBeenCalled();
  });
});
