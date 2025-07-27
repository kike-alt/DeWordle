/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WordleSessionController } from './wordle-session.controller';
import { WordleSessionService } from './wordle-session.service';
import { WordleSession } from './entities/wordle-session.entity';
import { Word } from '../entities/word.entity';

describe('WordleSessionController', () => {
  let controller: WordleSessionController;

  const mockWordleSession: WordleSession = {
    id: 1,
    user: null,
    targetWord: {
      id: 'test-word-id',
      word: 'WORLD',
    } as Word,
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
        timestamp: new Date('2024-01-15T10:30:00.000Z'),
      },
    ],
    isCompleted: false,
    isWon: false,
    attemptsRemaining: 5,
    completedAt: null,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:30:00.000Z'),
  };

  const mockService = {
    submitGuess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WordleSessionController],
      providers: [
        {
          provide: WordleSessionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<WordleSessionController>(WordleSessionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitGuess', () => {
    it('should successfully submit a guess', async () => {
      mockService.submitGuess.mockResolvedValue(mockWordleSession);

      const result = await controller.submitGuess('1', { guess: 'AUDIO' });

      expect(mockService.submitGuess).toHaveBeenCalledWith(1, {
        guess: 'AUDIO',
      });
      expect(result).toEqual(mockWordleSession);
    });

    it('should throw NotFoundException for invalid session ID format', async () => {
      await expect(
        controller.submitGuess('invalid', { guess: 'AUDIO' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockService.submitGuess).not.toHaveBeenCalled();
    });

    it('should handle service throwing NotFoundException', async () => {
      mockService.submitGuess.mockRejectedValue(
        new NotFoundException('Wordle session not found'),
      );

      await expect(
        controller.submitGuess('999', { guess: 'AUDIO' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockService.submitGuess).toHaveBeenCalledWith(999, {
        guess: 'AUDIO',
      });
    });

    it('should handle service throwing BadRequestException', async () => {
      mockService.submitGuess.mockRejectedValue(
        new BadRequestException('Game session is already completed'),
      );

      await expect(
        controller.submitGuess('1', { guess: 'AUDIO' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockService.submitGuess).toHaveBeenCalledWith(1, {
        guess: 'AUDIO',
      });
    });

    it('should convert string session ID to number', async () => {
      mockService.submitGuess.mockResolvedValue(mockWordleSession);

      await controller.submitGuess('123', { guess: 'WORLD' });

      expect(mockService.submitGuess).toHaveBeenCalledWith(123, {
        guess: 'WORLD',
      });
    });

    it('should handle edge case session IDs', () => {
      // Test with '0'
      expect(
        async () => await controller.submitGuess('0', { guess: 'AUDIO' }),
      ).not.toThrow();

      expect(mockService.submitGuess).toHaveBeenCalledWith(0, {
        guess: 'AUDIO',
      });

      // Test with negative number string
      expect(
        async () => await controller.submitGuess('-1', { guess: 'AUDIO' }),
      ).not.toThrow();

      expect(mockService.submitGuess).toHaveBeenCalledWith(-1, {
        guess: 'AUDIO',
      });
    });

    it('should handle non-numeric session ID', async () => {
      await expect(
        controller.submitGuess('abc', { guess: 'AUDIO' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockService.submitGuess).not.toHaveBeenCalled();
    });

    it('should handle empty session ID', async () => {
      await expect(
        controller.submitGuess('', { guess: 'AUDIO' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockService.submitGuess).not.toHaveBeenCalled();
    });
  });
});
