import { Test, TestingModule } from '@nestjs/testing';
import { WordsService, Word } from './words.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DictionaryHelper } from '../../utils/dictionary.helper';

// Mock the DictionaryHelper
jest.mock('../../utils/dictionary.helper');

describe('WordsService (Unit Tests)', () => {
  let service: WordsService;
  let mockDictionaryHelper: jest.Mocked<DictionaryHelper>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordsService],
    }).compile();

    service = module.get<WordsService>(WordsService);
    mockDictionaryHelper = (service as any).dictionaryHelper;
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

    it('should return an enriched random 5-letter word when enrichment succeeds', async () => {
      const mockWords: Word[] = [
        { id: '1', word: 'apple', length: 5 },
        { id: '2', word: 'baker', length: 5 },
      ];
      wordsServiceSpy.mockReturnValue(mockWords);

      const mockEnrichedWord = {
        id: '1',
        word: 'apple',
        definition: 'A round fruit',
        example: 'I ate an apple',
        partOfSpeech: 'noun',
        phonetics: '/ˈæpəl/',
        isEnriched: true,
      };

      mockDictionaryHelper.enrichWordWithMetadata.mockResolvedValue(
        mockEnrichedWord,
      );

      const result = await service.getRandomWord();

      expect(result.isEnriched).toBe(true);
      expect(result.word).toBeDefined();
      expect(['apple', 'baker']).toContain(result.word);
      expect(mockDictionaryHelper.enrichWordWithMetadata).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
    });

    it('should return basic word when enrichment fails', async () => {
      const mockWords: Word[] = [{ id: '1', word: 'apple', length: 5 }];
      wordsServiceSpy.mockReturnValue(mockWords);

      mockDictionaryHelper.enrichWordWithMetadata.mockRejectedValue(
        new Error('API Error'),
      );

      const result = await service.getRandomWord();

      expect(result.isEnriched).toBe(false);
      expect(result.word).toBe('apple');
      expect(result.id).toBe('1');
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
