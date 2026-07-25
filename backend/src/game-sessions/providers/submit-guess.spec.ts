import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { GameSessionStatus } from '../enums/sessionStatus';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { submitGuessProvider } from './submit-guess';
import { GameSession } from '../entities/game-session.entity';

describe('SubmitGuessProvider', () => {
  let provider: submitGuessProvider;
  let repo: jest.Mocked<Repository<GameSession>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        submitGuessProvider,
        {
          provide: getRepositoryToken(GameSession),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<submitGuessProvider>(submitGuessProvider);
    repo = module.get(getRepositoryToken(GameSession));
  });

  it('should throw ForbiddenException if session is already complete', async () => {
    const session = {
      id: 1,
      status: GameSessionStatus.WON,
      user: null,
    } as GameSession;

    repo.findOne.mockResolvedValueOnce(session);

    await expect(provider.submitGuess(1, 'apple', null)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
