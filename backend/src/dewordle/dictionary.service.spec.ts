import { Test, TestingModule } from '@nestjs/testing';
import { DictionaryService } from './dictionary.service';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock fs module
jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<
  typeof readFileSync
>;

describe('DictionaryService', () => {
  let service: DictionaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DictionaryService],
    }).compile();

    service = module.get<DictionaryService>(DictionaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should load dictionary successfully', () => {
      const mockWordList = 'APPLE\nBREAD\nCRANE\nDREAM\nEAGLE\n';
      mockReadFileSync.mockReturnValue(mockWordList);

      service.onModuleInit();

      expect(mockReadFileSync).toHaveBeenCalledWith(
        join(process.cwd(), 'data', 'five-letter-words.txt'),
        'utf-8',
      );
      expect(service.getWordCount()).toBe(5);
    });

    it('should handle file read errors', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => service.onModuleInit()).toThrow(
        'Failed to load word dictionary',
      );
    });

    it('should filter out words that are not 5 letters', () => {
      const mockWordList = 'APPLE\nBREAD\nCAT\nDREAM\nELEPHANT\nFIELD\n';
      mockReadFileSync.mockReturnValue(mockWordList);

      service.onModuleInit();

      expect(service.getWordCount()).toBe(4); // Only APPLE, BREAD, DREAM, FIELD
    });

    it('should handle empty lines and whitespace', () => {
      const mockWordList = 'APPLE\n\nBREAD  \n  CRANE\n\n  \nDREAM\n';
      mockReadFileSync.mockReturnValue(mockWordList);

      service.onModuleInit();

      expect(service.getWordCount()).toBe(4); // APPLE, BREAD, CRANE, DREAM
    });
  });

  describe('isValidWord', () => {
    beforeEach(() => {
      const mockWordList = 'APPLE\nBREAD\nCRANE\nDREAM\nEAGLE\n';
      mockReadFileSync.mockReturnValue(mockWordList);
      service.onModuleInit();
    });

    it('should return true for valid words', () => {
      expect(service.isValidWord('APPLE')).toBe(true);
      expect(service.isValidWord('BREAD')).toBe(true);
      expect(service.isValidWord('CRANE')).toBe(true);
    });

    it('should return false for invalid words', () => {
      expect(service.isValidWord('AAAAA')).toBe(false);
      expect(service.isValidWord('NOTWD')).toBe(false);
      expect(service.isValidWord('XXXXX')).toBe(false);
    });

    it('should handle case insensitive validation', () => {
      expect(service.isValidWord('apple')).toBe(true);
      expect(service.isValidWord('Apple')).toBe(true);
      expect(service.isValidWord('APPLE')).toBe(true);
      expect(service.isValidWord('aPpLe')).toBe(true);
    });

    it('should handle words with whitespace', () => {
      expect(service.isValidWord(' APPLE ')).toBe(true);
      expect(service.isValidWord('  BREAD  ')).toBe(true);
    });

    it('should return false for words with incorrect length', () => {
      expect(service.isValidWord('APP')).toBe(false);
      expect(service.isValidWord('APPLES')).toBe(false);
      expect(service.isValidWord('')).toBe(false);
    });
  });

  describe('getWordCount', () => {
    it('should return correct word count', () => {
      const mockWordList = 'APPLE\nBREAD\nCRANE\nDREAM\nEAGLE\n';
      mockReadFileSync.mockReturnValue(mockWordList);
      service.onModuleInit();

      expect(service.getWordCount()).toBe(5);
    });

    it('should return 0 when no words are loaded', () => {
      const mockWordList = '';
      mockReadFileSync.mockReturnValue(mockWordList);
      service.onModuleInit();

      expect(service.getWordCount()).toBe(0);
    });
  });
});
