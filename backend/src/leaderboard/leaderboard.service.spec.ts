import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Game } from '../games/entities/game.entity';

const mockLeaderboardRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let repo: jest.Mocked<Repository<LeaderboardEntry>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getRepositoryToken(LeaderboardEntry),
          useFactory: mockLeaderboardRepo,
        },
      ],
    }).compile();
    service = module.get<LeaderboardService>(LeaderboardService);
    repo = module.get(getRepositoryToken(LeaderboardEntry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should skip upsert for guest', async () => {
    const result = await service.upsertEntry(
      null as any,
      {} as Game,
      10,
      false,
    );
    expect(result).toBeUndefined();
  });

  it('should create new leaderboard entry', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockReturnValue({
      user: {},
      game: {},
      totalScore: 10,
      wins: 1,
      totalSessions: 1,
    } as any);
    repo.save.mockResolvedValue({ id: 1 } as any);
    const user = {} as User;
    const game = {} as Game;
    const result = await service.upsertEntry(user, game, 10, true);
    expect(repo.create).toBeCalled();
    expect(repo.save).toBeCalled();
    expect(result).toEqual({ id: 1 });
  });

  it('should update existing leaderboard entry', async () => {
    repo.findOne.mockResolvedValue({
      totalScore: 5,
      wins: 0,
      totalSessions: 1,
    } as any);
    repo.save.mockResolvedValue({ id: 2 } as any);
    const user = {} as User;
    const game = {} as Game;
    const result = await service.upsertEntry(user, game, 10, true);
    expect(repo.save).toBeCalled();
    expect(result).toEqual({ id: 2 });
  });

  it('should get game leaderboard', async () => {
    repo.find.mockResolvedValue([{ id: 1 } as any]);
    const game = {} as Game;
    const result = await service.getGameLeaderboard(game, 0, 10);
    expect(repo.find).toBeCalled();
    expect(result).toEqual([{ id: 1 }]);
  });

  it('should get global leaderboard', async () => {
    const qb = repo.createQueryBuilder();
    (qb.getRawMany as jest.Mock).mockResolvedValue([
      { userId: 1, totalScore: 100 },
    ]);
    const result = await service.getGlobalLeaderboard(0, 10);
    expect(result).toEqual([{ userId: 1, totalScore: 100 }]);
  });
});
