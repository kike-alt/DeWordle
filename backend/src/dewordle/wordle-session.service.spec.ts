/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WordleSessionService } from './wordle-session.service';
import { WordleSession } from './entities/wordle-session.entity';
import { Word } from '../entities/word.entity';

describe('WordleSessionService', () => {
  let service: WordleSessionService;

  const mockWordleSession: WordleSession = {
    id: 1,
    user: null,
    targetWord: {
      id: 'test-word-id',
      word: 'WORLD',
    } as Word,
    guessHistory: [],
    isCompleted: false,
    isWon: false,
    attemptsRemaining: 6,
    completedAt: null,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordleSessionService,
        {
          provide: getRepositoryToken(WordleSession),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WordleSessionService>(WordleSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a wordle session when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockWordleSession);

      const result = await service.findById(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['targetWord', 'user'],
      });
      expect(result).toEqual(mockWordleSession);
    });

    it('should throw NotFoundException when session not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        relations: ['targetWord', 'user'],
      });
    });
  });

  describe('submitGuess', () => {
    it('should successfully submit a correct guess and win the game', async () => {
      const session = { ...mockWordleSession };
      const updatedSession = {
        ...session,
        guessHistory: [
          {
            guess: 'WORLD',
            result: [
              { letter: 'W', status: 'correct' },
              { letter: 'O', status: 'correct' },
              { letter: 'R', status: 'correct' },
              { letter: 'L', status: 'correct' },
              { letter: 'D', status: 'correct' },
            ],
            timestamp: expect.any(Date),
          },
        ],
        isWon: true,
        isCompleted: true,
        attemptsRemaining: 5,
        completedAt: expect.any(Date),
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue(updatedSession);

      const result = await service.submitGuess(1, { guess: 'WORLD' });

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['targetWord', 'user'],
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isWon: true,
          isCompleted: true,
          attemptsRemaining: 5,
          guessHistory: expect.arrayContaining([
            expect.objectContaining({
              guess: 'WORLD',
              result: expect.arrayContaining([
                { letter: 'W', status: 'correct' },
                { letter: 'O', status: 'correct' },
                { letter: 'R', status: 'correct' },
                { letter: 'L', status: 'correct' },
                { letter: 'D', status: 'correct' },
              ]),
            }),
          ]),
        }),
      );
      expect(result).toEqual(updatedSession);
    });

    it('should successfully submit an incorrect guess', async () => {
      const session = { ...mockWordleSession };
      const updatedSession = {
        ...session,
        guessHistory: [
          {
            guess: 'AUDIO',
            result: [
              { letter: 'A', status: 'absent' },
              { letter: 'U', status: 'absent' },
              { letter: 'D', status: 'present' },
              { letter: 'I', status: 'absent' },
              { letter: 'O', status: 'present' },
            ],
            timestamp: expect.any(Date),
          },
        ],
        attemptsRemaining: 5,
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue(updatedSession);

      const result = await service.submitGuess(1, { guess: 'AUDIO' });

      expect(result.attemptsRemaining).toBe(5);
      expect(result.isWon).toBe(false);
      expect(result.isCompleted).toBe(false);
      expect(result.guessHistory).toHaveLength(1);
      expect(result.guessHistory[0].guess).toBe('AUDIO');
    });

    it('should complete the game when no attempts remaining', async () => {
      const session = {
        ...mockWordleSession,
        attemptsRemaining: 1,
      };
      const updatedSession = {
        ...session,
        attemptsRemaining: 0,
        isCompleted: true,
        completedAt: expect.any(Date),
        guessHistory: [
          {
            guess: 'AUDIO',
            result: expect.any(Array),
            timestamp: expect.any(Date),
          },
        ],
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue(updatedSession);

      const result = await service.submitGuess(1, { guess: 'AUDIO' });

      expect(result.attemptsRemaining).toBe(0);
      expect(result.isCompleted).toBe(true);
      expect(result.isWon).toBe(false);
    });

    it('should throw BadRequestException when session is already completed', async () => {
      const completedSession = {
        ...mockWordleSession,
        isCompleted: true,
      };

      mockRepository.findOne.mockResolvedValue(completedSession);

      await expect(service.submitGuess(1, { guess: 'AUDIO' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when no attempts remaining', async () => {
      const noAttemptsSession = {
        ...mockWordleSession,
        attemptsRemaining: 0,
      };

      mockRepository.findOne.mockResolvedValue(noAttemptsSession);

      await expect(service.submitGuess(1, { guess: 'AUDIO' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid guess length', async () => {
      mockRepository.findOne.mockResolvedValue(mockWordleSession);

      await expect(service.submitGuess(1, { guess: 'ABC' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should normalize guess to uppercase', async () => {
      const session = { ...mockWordleSession };
      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue({
        ...session,
        guessHistory: [{ guess: 'AUDIO', result: [], timestamp: new Date() }],
      });

      await service.submitGuess(1, { guess: 'audio' });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          guessHistory: expect.arrayContaining([
            expect.objectContaining({
              guess: 'AUDIO',
            }),
          ]),
        }),
      );
    });

    it('should handle session not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.submitGuess(999, { guess: 'AUDIO' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
