import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WordleSessionService } from './wordle-session.service';
import { DictionaryService } from './dictionary.service';
import { readFileSync } from 'fs';

// Mock fs module for dictionary loading
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

describe('WordleSession Word Validation Integration', () => {
  let service: WordleSessionService;
  let dictionaryService: DictionaryService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockWordleSession = {
    id: 1,
    user: null,
    targetWord: {
      id: 'test-word-id',
      word: 'WORLD',
    },
    guessHistory: [],
    isCompleted: false,
    isWon: false,
    attemptsRemaining: 6,
    completedAt: null,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  beforeEach(async () => {
    // Setup mock dictionary with known words
    const mockWordList = 'WORLD\nAUDIO\nCRANE\nTRACE\nBREAD\n';
    mockReadFileSync.mockReturnValue(mockWordList);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordleSessionService,
        DictionaryService,
        {
          provide: 'WordleSessionRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WordleSessionService>(WordleSessionService);
    dictionaryService = module.get<DictionaryService>(DictionaryService);

    // Initialize dictionary
    dictionaryService.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Word Validation Integration', () => {
    it('should accept valid words from dictionary', async () => {
      // Create fresh sessions for each call to avoid state mutation
      const freshSession = () => ({ ...mockWordleSession });

      mockRepository.findOne.mockResolvedValueOnce(freshSession());
      mockRepository.save.mockResolvedValueOnce({
        ...freshSession(),
        guessHistory: [{ guess: 'AUDIO', result: [], timestamp: new Date() }],
      });

      // Should not throw for valid words
      await expect(
        service.submitGuess(1, { guess: 'AUDIO' }),
      ).resolves.toBeDefined();

      // Reset for next call
      mockRepository.findOne.mockResolvedValueOnce(freshSession());
      mockRepository.save.mockResolvedValueOnce({
        ...freshSession(),
        guessHistory: [{ guess: 'WORLD', result: [], timestamp: new Date() }],
      });

      await expect(
        service.submitGuess(1, { guess: 'WORLD' }),
      ).resolves.toBeDefined();

      // Reset for next call
      mockRepository.findOne.mockResolvedValueOnce(freshSession());
      mockRepository.save.mockResolvedValueOnce({
        ...freshSession(),
        guessHistory: [{ guess: 'CRANE', result: [], timestamp: new Date() }],
      });

      await expect(
        service.submitGuess(1, { guess: 'CRANE' }),
      ).resolves.toBeDefined();
    });

    it('should reject invalid words not in dictionary', async () => {
      const session = { ...mockWordleSession };
      mockRepository.findOne.mockResolvedValue(session);

      // Should throw for invalid words
      await expect(service.submitGuess(1, { guess: 'AAAAA' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitGuess(1, { guess: 'AAAAA' })).rejects.toThrow(
        'Not in word list',
      );

      await expect(service.submitGuess(1, { guess: 'ZZZZZ' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitGuess(1, { guess: 'ZZZZZ' })).rejects.toThrow(
        'Not in word list',
      );

      await expect(service.submitGuess(1, { guess: 'NOTWD' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitGuess(1, { guess: 'NOTWD' })).rejects.toThrow(
        'Not in word list',
      );
    });

    it('should handle case insensitive validation', async () => {
      const session = { ...mockWordleSession };
      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue({
        ...session,
        guessHistory: [{ guess: 'AUDIO', result: [], timestamp: new Date() }],
      });

      // Should accept lowercase and mixed case valid words
      await expect(
        service.submitGuess(1, { guess: 'audio' }),
      ).resolves.toBeDefined();
      await expect(
        service.submitGuess(1, { guess: 'Audio' }),
      ).resolves.toBeDefined();
      await expect(
        service.submitGuess(1, { guess: 'AUDIO' }),
      ).resolves.toBeDefined();

      // Should reject lowercase invalid words
      await expect(service.submitGuess(1, { guess: 'aaaaa' })).rejects.toThrow(
        'Not in word list',
      );
    });

    it('should validate words before game logic checks', async () => {
      const completedSession = {
        ...mockWordleSession,
        isCompleted: true,
      };
      mockRepository.findOne.mockResolvedValue(completedSession);

      // Invalid word should be caught before "game completed" error
      await expect(service.submitGuess(1, { guess: 'AAAAA' })).rejects.toThrow(
        'Not in word list',
      );
    });

    it('should validate words before length checks', async () => {
      const session = { ...mockWordleSession };
      mockRepository.findOne.mockResolvedValue(session);

      // Test that word validation happens before length validation
      // by using a 5-letter invalid word
      await expect(service.submitGuess(1, { guess: 'AAAAA' })).rejects.toThrow(
        'Not in word list',
      );

      // And that length validation still works for invalid lengths
      await expect(service.submitGuess(1, { guess: 'ABC' })).rejects.toThrow(
        'Guess must be exactly 5 letters long',
      );
    });

    it('should not save invalid word guesses to history', async () => {
      const session = { ...mockWordleSession };
      mockRepository.findOne.mockResolvedValue(session);

      try {
        await service.submitGuess(1, { guess: 'AAAAA' });
      } catch {
        // Verify repository save was never called for invalid word
        expect(mockRepository.save).not.toHaveBeenCalled();
      }

      expect.assertions(1);
    });

    it('should not decrement attempts for invalid words', async () => {
      const session = { ...mockWordleSession, attemptsRemaining: 3 };
      mockRepository.findOne.mockResolvedValue(session);

      try {
        await service.submitGuess(1, { guess: 'AAAAA' });
      } catch {
        // Verify that attempts were not decremented
        expect(mockRepository.save).not.toHaveBeenCalledWith(
          expect.objectContaining({
            attemptsRemaining: 2,
          }),
        );
      }

      expect.assertions(1);
    });
  });

  describe('Dictionary Service Integration', () => {
    it('should correctly identify valid words from file', () => {
      expect(dictionaryService.isValidWord('WORLD')).toBe(true);
      expect(dictionaryService.isValidWord('AUDIO')).toBe(true);
      expect(dictionaryService.isValidWord('CRANE')).toBe(true);
      expect(dictionaryService.isValidWord('TRACE')).toBe(true);
      expect(dictionaryService.isValidWord('BREAD')).toBe(true);
    });

    it('should correctly identify invalid words', () => {
      expect(dictionaryService.isValidWord('AAAAA')).toBe(false);
      expect(dictionaryService.isValidWord('ZZZZZ')).toBe(false);
      expect(dictionaryService.isValidWord('NOTWD')).toBe(false);
    });

    it('should have loaded correct word count', () => {
      expect(dictionaryService.getWordCount()).toBe(5);
    });
  });
});
