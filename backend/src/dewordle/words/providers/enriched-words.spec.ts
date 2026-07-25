import { Repository } from 'typeorm';
import { Word } from 'src/entities/word.entity';
import axios from 'axios';
import { EnrichedWordsProvider } from './enriched-words';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock prom-client Counter
const incMock = jest.fn();
jest.mock('prom-client', () => {
  return {
    Counter: jest.fn().mockImplementation(() => ({
      inc: incMock,
    })),
  };
});

// Mock opossum CircuitBreaker
jest.mock('opossum', () => {
  return jest.fn().mockImplementation((action) => ({
    fire: (...args) => action(...args),
  }));
});

describe('EnrichedWordsProvider', () => {
  let provider: EnrichedWordsProvider;
  let wordRepo: jest.Mocked<Repository<Word>>;

  beforeEach(() => {
    jest.clearAllMocks();

    wordRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    provider = new EnrichedWordsProvider(wordRepo);
  });

  it('should return cached word (cache hit)', async () => {
    const word: Word = { word: 'test', isEnriched: true } as Word;
    wordRepo.findOne.mockResolvedValue(word);

    const result = await provider.getWord('test');

    expect(result).toBe(word);
    expect(wordRepo.findOne).toHaveBeenCalledWith({ where: { word: 'test' } });
    expect(incMock).toHaveBeenCalled(); // cacheHits.inc()
    expect(wordRepo.save).not.toHaveBeenCalled();
  });

  it('should fetch and save word on cache miss (success)', async () => {
    const apiData = { definition: 'something' };
    mockedAxios.get.mockResolvedValue({ data: apiData });
    wordRepo.findOne.mockResolvedValue(null);

    const createdWord = { word: 'test' } as Word;
    wordRepo.create.mockReturnValue(createdWord);
    wordRepo.save.mockResolvedValue(createdWord);

    const result = await provider.getWord('test');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://external-dict-api/test',
    );
    expect(wordRepo.create).toHaveBeenCalledWith({ word: 'test' });
    expect(wordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'test',
        metadata: apiData,
        isEnriched: true,
      }),
    );
    expect(result.isEnriched).toBe(true);
    expect(incMock).toHaveBeenCalled(); // cacheMisses.inc()
  });

  it('should handle API failure gracefully (cache miss, no enrichment)', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API down'));
    wordRepo.findOne.mockResolvedValue(null);

    const createdWord = { word: 'fail' } as Word;
    wordRepo.create.mockReturnValue(createdWord);
    wordRepo.save.mockResolvedValue(createdWord);

    const result = await provider.getWord('fail');

    expect(result.isEnriched).toBe(false);
    expect(result.metadata).toEqual({});
    expect(wordRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'fail',
        metadata: {},
        isEnriched: false,
      }),
    );
    expect(incMock).toHaveBeenCalled();
  });
});
