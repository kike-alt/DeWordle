import { Test, TestingModule } from '@nestjs/testing';
import { GameSessionsService } from './game-sessions.service';

describe('GameSessionsService', () => {
  let service: GameSessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameSessionsService],
    }).compile();

    service = module.get<GameSessionsService>(GameSessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
