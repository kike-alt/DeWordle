import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegistrySnapshotService } from './registry-snapshot.service';
import { RegistrySnapshotEntity } from '../entities/registry-snapshot.entity';
import { AuditTrailService } from '../audit-trail.service';

const MOCK_REGISTRY = { contractId: 'C123', version: '1.0.0' };

function makeRepo(overrides: Partial<ReturnType<typeof buildRepo>> = {}) {
  return buildRepo(overrides);
}

function buildRepo(overrides: Record<string, unknown> = {}) {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((v) => v),
    save: jest.fn().mockImplementation((v) => Promise.resolve({ id: 1, ...v })),
    find: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const mockAuditService = {
  log: jest.fn().mockResolvedValue({ id: 1 }),
};

describe('RegistrySnapshotService', () => {
  let service: RegistrySnapshotService;
  let repo: ReturnType<typeof buildRepo>;

  beforeEach(async () => {
    repo = makeRepo();
    mockAuditService.log.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrySnapshotService,
        { provide: getRepositoryToken(RegistrySnapshotEntity), useValue: repo },
        { provide: AuditTrailService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get(RegistrySnapshotService);
  });

  describe('save', () => {
    it('persists a new snapshot when none exists', async () => {
      const result = await service.save({
        network: 'testnet',
        contractId: 'C123',
        registry: MOCK_REGISTRY,
        capturedAtLedger: 100,
      });

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result.network).toBe('testnet');
      expect(result.capturedAtLedger).toBe(100);
    });

    it('updates existing snapshot on second save', async () => {
      const existing: Partial<RegistrySnapshotEntity> = {
        id: 5,
        capturedAtLedger: 50,
      };
      repo.findOne.mockResolvedValue(existing);

      await service.save({
        network: 'testnet',
        contractId: 'C123',
        registry: MOCK_REGISTRY,
        capturedAtLedger: 200,
      });

      const created = (repo.create as jest.Mock).mock.calls[0][0];
      expect(created.id).toBe(5);
      expect(created.capturedAtLedger).toBe(200);
    });

    it('logs an audit entry on save', async () => {
      await service.save({
        network: 'testnet',
        contractId: 'C123',
        registry: MOCK_REGISTRY,
        capturedAtLedger: 100,
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'registry_change',
          actor: 'indexer',
          network: 'testnet',
          targetResource: 'C123',
        }),
      );
    });
  });

  describe('getLatest', () => {
    it('returns null when no snapshot exists', async () => {
      const result = await service.getLatest('testnet', 'C123');
      expect(result).toBeNull();
    });

    it('returns the snapshot when found', async () => {
      const snapshot = { id: 1, network: 'testnet', contractId: 'C123' };
      repo.findOne.mockResolvedValue(snapshot);

      const result = await service.getLatest('testnet', 'C123');
      expect(result).toBe(snapshot);
    });
  });

  describe('listByNetwork', () => {
    it('returns snapshots for the given network', async () => {
      const snapshots = [{ id: 1 }, { id: 2 }];
      repo.find.mockResolvedValue(snapshots);

      const result = await service.listByNetwork('testnet');
      expect(result).toHaveLength(2);
    });
  });
});
