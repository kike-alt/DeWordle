import { Logger } from '@nestjs/common';
import axios from 'axios';

export interface EnrichedWord {
  id: string;
  word: string;
  definition?: string;
  example?: string;
  partOfSpeech?: string;
  phonetics?: string;
  isEnriched: boolean;
}

export interface DictionaryApiResponse {
  word: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings?: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

export class DictionaryHelper {
  private readonly logger = new Logger(DictionaryHelper.name);
  private readonly baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';
  private readonly timeout = 5000; // 5 seconds
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  /**
   * Enriches a word with metadata from the dictionary API
   * @param word - The word to enrich
   * @param wordId - The unique ID for the word
   * @returns Promise<EnrichedWord> - Enriched word object or basic word if enrichment fails
   */
  async enrichWordWithMetadata(
    word: string,
    wordId: string,
  ): Promise<EnrichedWord> {
    const baseWord: EnrichedWord = {
      id: wordId,
      word,
      isEnriched: false,
    };

    try {
      this.logger.log(`Attempting to enrich word: ${word}`);
      const apiResponse = await this.fetchWithRetry(word);

      if (
        !apiResponse ||
        !apiResponse.data ||
        !Array.isArray(apiResponse.data) ||
        apiResponse.data.length === 0
      ) {
        this.logger.warn(
          `No data received from dictionary API for word: ${word}`,
        );
        return baseWord;
      }

      const wordData = apiResponse.data[0] as DictionaryApiResponse;
      const enrichedWord = this.transformApiResponse(wordData, baseWord);

      this.logger.log(`Successfully enriched word: ${word}`);
      return enrichedWord;
    } catch (error) {
      this.logger.error(
        `Failed to enrich word '${word}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      return baseWord;
    }
  }

  /**
   * Fetches word data from dictionary API with retry logic
   * @param word - The word to fetch
   * @returns Promise<any> - API response
   */
  private async fetchWithRetry(word: string): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/${encodeURIComponent(word)}`,
          {
            timeout: this.timeout,
            headers: {
              'User-Agent': 'DeWordle-Backend/1.0',
            },
          },
        );

        return response;
      } catch (error: any) {
        lastError = error as Error;

        // Check if it's an axios error by checking for response property
        if (error.response) {
          // Don't retry for 404 (word not found) or 4xx client errors
          if (
            error.response.status === 404 ||
            (error.response.status >= 400 && error.response.status < 500)
          ) {
            throw error;
          }

          // Handle rate limiting (429)
          if (error.response.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            const delay = retryAfter
              ? parseInt(retryAfter) * 1000
              : this.calculateBackoffDelay(attempt);
            this.logger.warn(
              `Rate limited. Retrying after ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
            );
            await this.sleep(delay);
            continue;
          }
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logger.warn(
            `API request failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Unknown error occurred during API request');
  }

  /**
   * Transforms API response to match our enriched word format
   * @param apiData - Raw API response data
   * @param baseWord - Base word object to enrich
   * @returns EnrichedWord - Transformed word object
   */
  private transformApiResponse(
    apiData: DictionaryApiResponse,
    baseWord: EnrichedWord,
  ): EnrichedWord {
    const enriched: EnrichedWord = { ...baseWord, isEnriched: true };

    // Extract phonetics
    if (apiData.phonetics && apiData.phonetics.length > 0) {
      const phoneticWithText = apiData.phonetics.find((p) => p.text);
      if (phoneticWithText?.text) {
        enriched.phonetics = phoneticWithText.text;
      }
    }

    // Extract meanings (definition, example, part of speech)
    if (apiData.meanings && apiData.meanings.length > 0) {
      const primaryMeaning = apiData.meanings[0];

      // Part of speech
      if (primaryMeaning.partOfSpeech) {
        enriched.partOfSpeech = primaryMeaning.partOfSpeech;
      }

      // Definition and example
      if (primaryMeaning.definitions && primaryMeaning.definitions.length > 0) {
        const primaryDefinition = primaryMeaning.definitions[0];

        if (primaryDefinition.definition) {
          enriched.definition = primaryDefinition.definition;
        }

        if (primaryDefinition.example) {
          enriched.example = primaryDefinition.example;
        }
      }
    }

    return enriched;
  }

  /**
   * Calculates exponential backoff delay
   * @param attempt - Current attempt number
   * @returns number - Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    return Math.min(this.baseDelay * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
  }

  /**
   * Sleep utility function
   * @param ms - Milliseconds to sleep
   * @returns Promise<void>
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
