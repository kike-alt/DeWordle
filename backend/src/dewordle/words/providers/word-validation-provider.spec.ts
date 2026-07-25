import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { WordValidationProvider } from './word-validation-provider';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      headers: {},
    } as any,
  };
}

// Mock profanity list
jest.mock('../../../utils/profanity-list.json', () => ['badword']);

describe('WordValidationProvider', () => {
  let provider: WordValidationProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new WordValidationProvider();
  });

  it('should reject words that are profane', async () => {
    const result = await provider.validateWord('badword');
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Profanity detected');
  });

  it('should reject words with non-alphabetic characters', async () => {
    const result = await provider.validateWord('hello1');
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Contains non-alphabetic characters');
  });

  it('should reject hyphenated words', async () => {
    const result = await provider.validateWord('hello-world');
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Hyphenated word');
  });

  it('should reject too short words', async () => {
    const result = await provider.validateWord('a');
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('Too short to be playable');
  });

  it('should accept a valid word with dictionary definition', async () => {
    // Mock dictionary lookups
    mockedAxios.get;
    mockedAxios.get
      .mockResolvedValueOnce(mockAxiosResponse([{ shortdef: ['A greeting'] }])) // Merriam-Webster
      .mockResolvedValueOnce(
        mockAxiosResponse({
          results: [
            {
              lexicalEntries: [
                {
                  entries: [
                    {
                      senses: [{ definitions: ['A greeting definition'] }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ) // Oxford
      .mockResolvedValueOnce(
        mockAxiosResponse({
          query: {
            pages: {
              '123': {
                extract: '<p>Hello. A greeting in English.</p>',
              },
            },
          },
        }),
      ); // Wiktionary

    const result = await provider.validateWord('hello');

    expect(result.valid).toBe(true);
    expect(result.definition).toBe('A greeting');
    expect(result.sources).toContain('Merriam-Webster');
    expect(result.sources.length).toBeGreaterThan(1); // multiple sources should add confidence
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('should reject word if no dictionary returns a definition', async () => {
    mockedAxios.get.mockResolvedValue(mockAxiosResponse({}));

    const result = await provider.validateWord('unknownword');
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('No valid dictionary definition found');
  });
});
