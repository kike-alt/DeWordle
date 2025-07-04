import {
  DictionaryHelper,
  EnrichedWord,
  DictionaryApiResponse,
} from './dictionary.helper';
import axios from 'axios';
import { Logger } from '@nestjs/common';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Logger
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('DictionaryHelper', () => {
  let dictionaryHelper: DictionaryHelper;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    dictionaryHelper = new DictionaryHelper();
    mockLogger = new Logger() as jest.Mocked<Logger>;
  });

  describe('enrichWordWithMetadata', () => {
    const mockWordId = 'test-uuid';
    const mockWord = 'crane';

    it('should successfully enrich a word with complete metadata', async () => {
      const mockApiResponse: DictionaryApiResponse = {
        word: 'crane',
        phonetics: [{ text: '/kreɪn/' }],
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [
              {
                definition: 'A large bird with a long neck and legs',
                example: 'The crane stood in the shallow water',
              },
            ],
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: [mockApiResponse],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        definition: 'A large bird with a long neck and legs',
        example: 'The crane stood in the shallow water',
        partOfSpeech: 'noun',
        phonetics: '/kreɪn/',
        isEnriched: true,
      });
    });

    it('should return basic word when API returns no data', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        isEnriched: false,
      });
    });

    it('should return basic word when API request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        isEnriched: false,
      });
    });

    it('should handle partial metadata gracefully', async () => {
      const mockApiResponse: DictionaryApiResponse = {
        word: 'crane',
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [
              {
                definition: 'A large bird with a long neck and legs',
                // No example provided
              },
            ],
          },
        ],
        // No phonetics provided
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: [mockApiResponse],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        definition: 'A large bird with a long neck and legs',
        partOfSpeech: 'noun',
        isEnriched: true,
        // example and phonetics should be undefined
      });
    });

    it('should handle 404 errors (word not found)', async () => {
      const mockError = {
        response: { status: 404 },
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        isEnriched: false,
      });
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should not retry on 404
    });

    it('should retry on rate limiting (429) with exponential backoff', async () => {
      const mockRateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '2' },
        },
        isAxiosError: true,
      };

      const mockApiResponse: DictionaryApiResponse = {
        word: 'crane',
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [{ definition: 'A large bird' }],
          },
        ],
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get
        .mockRejectedValueOnce(mockRateLimitError)
        .mockResolvedValueOnce({
          data: [mockApiResponse],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result.isEnriched).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Initial call + 1 retry
    });

    it('should respect maximum retry attempts', async () => {
      const mockError = {
        response: { status: 500 },
        isAxiosError: true,
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(mockError);

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result.isEnriched).toBe(false);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Initial call + 2 retries (max 3 attempts)
    });
  });
});
