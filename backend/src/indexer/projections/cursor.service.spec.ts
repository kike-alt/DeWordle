import { CursorService } from './cursor.service';
import { IndexerCursorEntity } from '../entities/indexer-cursor.entity';

const makeCursorEntity = (
  lastLedger: number,
  lastTxHash: string,
  lastEventIndex: number,
): IndexerCursorEntity =>
  Object.assign(new IndexerCursorEntity(), {
    id: 1,
    network: 'testnet',
    streamKey: 'core_game',
    lastLedger,
    lastTxHash,
    lastEventIndex,
    updatedAt: new Date(),
  });

const makeService = (existing?: IndexerCursorEntity) => {
  const saved: IndexerCursorEntity[] = [];
  const repo = {
    findOne: jest.fn().mockResolvedValue(existing ?? null),
    create: jest.fn((data) => Object.assign(new IndexerCursorEntity(), data)),
    save: jest.fn().mockImplementation(async (e) => {
      saved.push(e);
      return e;
    }),
  };
  const svc = new CursorService(repo as any);
  return { svc, repo, saved };
};

describe('CursorService.checkpoint', () => {
  it('advances cursor when ledger is greater', async () => {
    const { svc, saved } = makeService(makeCursorEntity(10, 'tx1', 0));
    const result = await svc.checkpoint('testnet', 'core_game', 11, 'tx1', 0);
    expect(result).toBe(true);
    expect(saved[0].lastLedger).toBe(11);
  });

  it('rejects regression to lower ledger', async () => {
    const { svc, saved } = makeService(makeCursorEntity(10, 'tx1', 0));
    const result = await svc.checkpoint('testnet', 'core_game', 9, 'tx1', 0);
    expect(result).toBe(false);
    expect(saved).toHaveLength(0);
  });

  it('advances cursor when same ledger but txHash is lexicographically greater', async () => {
    const { svc, saved } = makeService(makeCursorEntity(10, 'aaa', 0));
    const result = await svc.checkpoint('testnet', 'core_game', 10, 'bbb', 0);
    expect(result).toBe(true);
    expect(saved[0].lastTxHash).toBe('bbb');
  });

  it('rejects regression to lexicographically smaller txHash on same ledger', async () => {
    const { svc, saved } = makeService(makeCursorEntity(10, 'bbb', 0));
    const result = await svc.checkpoint('testnet', 'core_game', 10, 'aaa', 0);
    expect(result).toBe(false);
    expect(saved).toHaveLength(0);
  });

  it('advances cursor when same ledger+txHash but eventIndex is greater', async () => {
    const { svc, saved } = makeService(makeCursorEntity(10, 'tx1', 2));
    const result = await svc.checkpoint('testnet', 'core_game', 10, 'tx1', 3);
    expect(result).toBe(true);
    expect(saved[0].lastEventIndex).toBe(3);
  });

  it('rejects same position (no-op regression)', async () => {
    const { svc, saved } = makeService(makeCursorEntity(10, 'tx1', 2));
    const result = await svc.checkpoint('testnet', 'core_game', 10, 'tx1', 2);
    expect(result).toBe(false);
    expect(saved).toHaveLength(0);
  });

  it('rejects lower eventIndex on same ledger+txHash', async () => {
    const { svc, saved } = makeService(makeCursorEntity(10, 'tx1', 5));
    const result = await svc.checkpoint('testnet', 'core_game', 10, 'tx1', 4);
    expect(result).toBe(false);
    expect(saved).toHaveLength(0);
  });

  it('creates cursor from scratch when none exists and accepts first checkpoint', async () => {
    const { svc, saved } = makeService(undefined);
    const result = await svc.checkpoint('testnet', 'core_game', 1, 'tx1', 0);
    expect(result).toBe(true);
    // save called twice: once for create, once for checkpoint update
    expect(saved.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CursorService – rollback failure simulation', () => {
  it('rejects a rollback attempt and does not persist the regressed position', async () => {
    const { svc, repo, saved } = makeService(
      makeCursorEntity(100, 'tx_abc', 3),
    );
    // Simulate a rollback: attacker/bug tries to rewind ledger
    const accepted = await svc.checkpoint(
      'testnet',
      'core_game',
      50,
      'tx_abc',
      3,
    );
    expect(accepted).toBe(false);
    // Cursor state must be unchanged — no save after the failed checkpoint
    expect(saved).toHaveLength(0);
    // getOrCreate read the existing cursor
    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });

  it('recovers correctly after a rollback rejection: subsequent valid advance is persisted', async () => {
    const cursor = makeCursorEntity(100, 'tx_abc', 3);
    const { svc, saved } = makeService(cursor);

    // rollback rejected
    await svc.checkpoint('testnet', 'core_game', 50, 'tx_abc', 3);
    expect(saved).toHaveLength(0);

    // valid advance after the failed rollback
    const accepted = await svc.checkpoint(
      'testnet',
      'core_game',
      101,
      'tx_abc',
      0,
    );
    expect(accepted).toBe(true);
    expect(saved[0].lastLedger).toBe(101);
  });

  it('rejects a mid-stream cursor rewind across multiple rapid rollback attempts', async () => {
    const { svc, saved } = makeService(makeCursorEntity(200, 'tx_z', 0));
    const regressPositions = [
      [199, 'tx_z', 0],
      [198, 'tx_a', 5],
      [1, 'tx_z', 0],
    ] as const;

    for (const [ledger, tx, idx] of regressPositions) {
      const result = await svc.checkpoint(
        'testnet',
        'core_game',
        ledger,
        tx,
        idx,
      );
      expect(result).toBe(false);
    }
    expect(saved).toHaveLength(0);
  });

  it('does not persist checkpoint when repo.save throws (simulates DB failure during rollback recovery)', async () => {
    const cursor = makeCursorEntity(10, 'tx1', 0);
    const repo = {
      findOne: jest.fn().mockResolvedValue(cursor),
      create: jest.fn((d) => Object.assign(new IndexerCursorEntity(), d)),
      save: jest.fn().mockRejectedValue(new Error('DB write failure')),
    };
    const svc = new CursorService(repo as any);
    await expect(
      svc.checkpoint('testnet', 'core_game', 11, 'tx2', 0),
    ).rejects.toThrow('DB write failure');
  });
});

describe('CursorService.reset (recovery CLI flow tests)', () => {
  it('successfully resets cursor to genesis state (successful recovery path)', async () => {
    const cursor = makeCursorEntity(100, 'tx_abc123', 5);
    const { svc, saved } = makeService(cursor);
    
    await svc.reset('testnet', 'core_game');
    
    expect(saved).toHaveLength(1);
    expect(saved[0].lastLedger).toBe(0);
    expect(saved[0].lastTxHash).toBe('');
    expect(saved[0].lastEventIndex).toBe(0);
  });

  it('creates and initializes cursor if it does not exist during reset (edge case recovery)', async () => {
    const { svc, saved } = makeService(undefined);
    
    await svc.reset('testnet', 'core_game');
    
    // getOrCreate saves once, reset saves again - expect 2 saves total
    expect(saved).toHaveLength(2);
    expect(saved[1].lastLedger).toBe(0);
    expect(saved[1].network).toBe('testnet');
    expect(saved[1].streamKey).toBe('core_game');
  });

  it('successfully advances cursor after reset (valid post-recovery operation)', async () => {
    const cursor = makeCursorEntity(100, 'tx_abc123', 5);
    const { svc, saved } = makeService(cursor);
    
    // Reset the cursor
    await svc.reset('testnet', 'core_game');
    expect(saved[0].lastLedger).toBe(0);
    
    // Attempt to advance from genesis (should work)
    const result = await svc.checkpoint('testnet', 'core_game', 50, 'tx_new', 0);
    expect(result).toBe(true);
    expect(saved[1].lastLedger).toBe(50);
  });

  it('handles database failure during cursor reset (guarded failure mode)', async () => {
    const cursor = makeCursorEntity(100, 'tx_abc123', 5);
    const repo = {
      findOne: jest.fn().mockResolvedValue(cursor),
      create: jest.fn((d) => Object.assign(new IndexerCursorEntity(), d)),
      save: jest.fn().mockRejectedValue(new Error('DB connection failed during reset')),
    };
    const svc = new CursorService(repo as any);
    
    await expect(svc.reset('testnet', 'core_game')).rejects.toThrow('DB connection failed during reset');
  });
});

describe('CursorService.resetProjections (projection recovery CLI flow tests)', () => {
  it('successfully clears all projection data (successful recovery path)', async () => {
    const mockQuery = jest.fn().mockResolvedValue(undefined);
    const cursor = makeCursorEntity(100, 'tx_abc123', 5);
    const repo = {
      findOne: jest.fn().mockResolvedValue(cursor),
      create: jest.fn((d) => Object.assign(new IndexerCursorEntity(), d)),
      save: jest.fn().mockResolvedValue(cursor),
      manager: {
        query: mockQuery,
      },
    };
    const svc = new CursorService(repo as any);
    
    await svc.resetProjections();
    
    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM session_projections');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('handles database failure during projection reset (guarded failure mode)', async () => {
    const mockQuery = jest.fn().mockRejectedValue(new Error('Database timeout during projection clear'));
    const cursor = makeCursorEntity(100, 'tx_abc123', 5);
    const repo = {
      findOne: jest.fn().mockResolvedValue(cursor),
      create: jest.fn((d) => Object.assign(new IndexerCursorEntity(), d)),
      save: jest.fn().mockResolvedValue(cursor),
      manager: {
        query: mockQuery,
      },
    };
    const svc = new CursorService(repo as any);
    
    await expect(svc.resetProjections()).rejects.toThrow('Database timeout during projection clear');
  });

  it('can reset projections then re-ingest events successfully (end-to-end recovery flow)', async () => {
    const deleteQuery = jest.fn().mockResolvedValue(undefined);
    const cursor = makeCursorEntity(100, 'tx_abc123', 5);
    const repo = {
      findOne: jest.fn().mockResolvedValue(cursor),
      create: jest.fn((d) => Object.assign(new IndexerCursorEntity(), d)),
      save: jest.fn().mockResolvedValue(cursor),
      manager: {
        query: deleteQuery,
      },
    };
    const svc = new CursorService(repo as any);
    
    // First reset projections
    await svc.resetProjections();
    expect(deleteQuery).toHaveBeenCalledWith('DELETE FROM session_projections');
    
    // Then reset cursor
    await svc.reset('testnet', 'core_game');
    
    // Verify we can start fresh with new checkpoints
    const result = await svc.checkpoint('testnet', 'core_game', 101, 'tx_new789', 0);
    expect(result).toBe(true);
  });
});