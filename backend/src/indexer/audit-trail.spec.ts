import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailEntity, AuditAction } from './entities/audit-trail.entity';

describe('AuditTrailService', () => {
  let service: AuditTrailService;
  let repo: jest.Mocked<Repository<AuditTrailEntity>>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTrailService,
        {
          provide: getRepositoryToken(AuditTrailEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AuditTrailService>(AuditTrailService);
    repo = module.get(getRepositoryToken(AuditTrailEntity));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save an audit entry', async () => {
      const input = {
        action: AuditAction.REGISTRY_CHANGE,
        actor: 'admin@example.com',
        details: { field: 'maxAttempts', oldValue: 5, newValue: 6 },
        targetResource: 'core_game',
        network: 'testnet',
      };

      const createdEntity = { id: 1, ...input, createdAt: new Date() };
      mockRepo.create.mockReturnValue(createdEntity);
      mockRepo.save.mockResolvedValue(createdEntity);

      const result = await service.log(input);

      expect(mockRepo.create).toHaveBeenCalledWith({
        action: AuditAction.REGISTRY_CHANGE,
        actor: 'admin@example.com',
        details: { field: 'maxAttempts', oldValue: 5, newValue: 6 },
        targetResource: 'core_game',
        network: 'testnet',
      });
      expect(mockRepo.save).toHaveBeenCalledWith(createdEntity);
      expect(result.id).toBe(1);
    });

    it('should default actor to system', async () => {
      const input = { action: AuditAction.PAUSE };
      const createdEntity = {
        id: 2,
        ...input,
        actor: 'system',
        createdAt: new Date(),
      };
      mockRepo.create.mockReturnValue(createdEntity);
      mockRepo.save.mockResolvedValue(createdEntity);

      await service.log(input);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ actor: 'system' }),
      );
    });
  });

  describe('query', () => {
    it('should return paginated results', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.query({ limit: 10, offset: 0 });

      expect(result).toEqual({ data: [], total: 0 });
      expect(mockQb.take).toHaveBeenCalledWith(10);
      expect(mockQb.skip).toHaveBeenCalledWith(0);
    });

    it('should filter by action', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ action: AuditAction.CONFIG_UPDATE });

      expect(mockQb.andWhere).toHaveBeenCalledWith('audit.action = :action', {
        action: AuditAction.CONFIG_UPDATE,
      });
    });

    it('should clamp limit between 1 and 200', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.query({ limit: 500 });
      expect(mockQb.take).toHaveBeenCalledWith(200);

      await service.query({ limit: 0 });
      expect(mockQb.take).toHaveBeenCalledWith(1);
    });
  });

  describe('findById', () => {
    it('should find an entry by id', async () => {
      const entity = {
        id: 1,
        action: AuditAction.CURSOR_RESET,
      } as AuditTrailEntity;
      mockRepo.findOne.mockResolvedValue(entity);

      const result = await service.findById(1);

      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null for non-existent id', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });
});
