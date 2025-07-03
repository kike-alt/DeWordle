import { Test, TestingModule } from '@nestjs/testing';
import { WordsService, Word } from './words.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('WordsService (Unit Tests)', () => {
  let service: WordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordsService],
    }).compile();

    service = module.get<WordsService>(WordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return "OK" for the test method', () => {
    expect(service.test()).toBe('OK');
  });

  describe('getRandomWord', () => {
    let wordsServiceSpy: jest.SpyInstance;

    beforeEach(() => {
      wordsServiceSpy = jest.spyOn(service as any, 'words', 'get');
    });

    afterEach(() => {
      wordsServiceSpy.mockRestore();
    });

    it('should return a random 5-letter word when words are available', async () => {
      const mockWords: Word[] = [
        { id: '1', word: 'apple', length: 5 },
        { id: '2', word: 'baker', length: 5 },
        { id: '3', word: 'longword', length: 8 },
        { id: '4', word: 'short', length: 5 },
      ];
      wordsServiceSpy.mockReturnValue(mockWords);

      const results = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const { word } = await service.getRandomWord();
        expect(word).toBeDefined();
        expect(word.length).toBe(5);
        expect(['apple', 'baker', 'short']).toContain(word);
        results.add(word);
      }
      expect(results.size).toBeGreaterThanOrEqual(1);
      expect(results.size).toBeLessThanOrEqual(3);
    });

    it('should throw NotFoundException if no 5-letter words are available', async () => {
      wordsServiceSpy.mockReturnValue([]);

      await expect(service.getRandomWord()).rejects.toThrow(NotFoundException);
      await expect(service.getRandomWord()).rejects.toThrow(
        'No 5-letter words available in the database.',
      );
    });

    it('should throw NotFoundException if only non-5-letter words are available', async () => {
      const mockWords: Word[] = [
        { id: '1', word: 'four', length: 4 },
        { id: '2', word: 'sixths', length: 6 },
      ];
      wordsServiceSpy.mockReturnValue(mockWords);

      await expect(service.getRandomWord()).rejects.toThrow(NotFoundException);
      await expect(service.getRandomWord()).rejects.toThrow(
        'No 5-letter words available in the database.',
      );
    });

    it('should handle the unlikely case where randomWord is undefined after selection', async () => {
      const mockWords: Word[] = [{ id: '1', word: 'testo', length: 5 }];
      wordsServiceSpy.mockReturnValue(mockWords);

      const originalMathFloor = Math.floor;
      jest.spyOn(Math, 'floor').mockReturnValue(mockWords.length);

      await expect(service.getRandomWord()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getRandomWord()).rejects.toThrow(
        'Failed to retrieve a random word.',
      );

      (Math.floor as jest.Mock).mockRestore();
    });
  });
});
