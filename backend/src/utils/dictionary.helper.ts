import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';

interface DictionaryApiResponse {
  word: string;
  phonetics: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

interface EnrichedWordData {
  definition: string;
  example: string;
  partOfSpeech: string;
  phonetics?: string;
}

export class DictionaryHelper {
  private static readonly logger = new Logger(DictionaryHelper.name);
  private static readonly API_BASE_URL =
    'https://api.dictionaryapi.dev/api/v2/entries/en';
  private static readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_BASE = 1000; // 1 second

  /**
   * Enriches a word with metadata from the dictionary API
   * @param word The word to enrich
   * @returns Promise<EnrichedWordData | null>
   */
  static async enrichWordWithMetadata(
    word: string,
  ): Promise<EnrichedWordData | null> {
    if (!word || word.trim().length === 0) {
      this.logger.warn('Empty word provided for enrichment');
      return null;
    }

    const cleanWord = word.trim().toLowerCase();

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logger.debug(
          `Attempting to enrich word '${cleanWord}' (attempt ${attempt}/${this.MAX_RETRIES})`,
        );

        const response: AxiosResponse<DictionaryApiResponse[]> =
          await axios.get(
            `${this.API_BASE_URL}/${encodeURIComponent(cleanWord)}`,
            {
              timeout: this.REQUEST_TIMEOUT,
              headers: {
                'User-Agent': 'DeWordle-Backend/1.0',
              },
            },
          );

        if (!response.data || response.data.length === 0) {
          this.logger.warn(`No data found for word: ${cleanWord}`);
          return null;
        }

        const wordData = response.data[0];
        return this.transformApiResponse(wordData);
      } catch (error) {
        this.logger.error(
          `Attempt ${attempt} failed for word '${cleanWord}':`,
          error.message,
        );

        if (attempt === this.MAX_RETRIES) {
          this.logger.error(
            `All ${this.MAX_RETRIES} attempts failed for word '${cleanWord}'`,
          );
          return null;
        }

        // Exponential backoff
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    return null;
  }

  /**
   * Transforms the API response to match our database schema
   * @param apiData Raw API response data
   * @returns EnrichedWordData
   */
  private static transformApiResponse(
    apiData: DictionaryApiResponse,
  ): EnrichedWordData {
    // Get the first meaning with definitions
    const primaryMeaning = apiData.meanings?.find(
      (m) => m.definitions?.length > 0,
    );

    if (!primaryMeaning) {
      throw new Error('No valid meanings found in API response');
    }

    // Get primary definition
    const primaryDefinition = primaryMeaning.definitions[0];

    // Get phonetics (prefer the first one with text)
    const phonetic = apiData.phonetics?.find((p) => p.text)?.text || undefined; // Changed to undefined

    // Find an example (try primary definition first, then search other definitions)
    let example = primaryDefinition.example;
    if (!example) {
      // Search through all definitions for an example
      for (const meaning of apiData.meanings) {
        for (const def of meaning.definitions) {
          if (def.example) {
            example = def.example;
            break;
          }
        }
        if (example) break;
      }
    }

    return {
      definition: primaryDefinition.definition,
      example: example || `Example usage of "${apiData.word}" in a sentence.`,
      partOfSpeech: primaryMeaning.partOfSpeech,
      phonetics: phonetic, // Now correctly typed as string | undefined
    };
  }

  /**
   * Sleep utility for retry delays
   * @param ms Milliseconds to sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validates if a word is suitable for enrichment
   * @param word The word to validate
   * @returns boolean
   */
  static isValidWordForEnrichment(word: string): boolean {
    if (!word || typeof word !== 'string') return false;

    const cleanWord = word.trim();
    return (
      cleanWord.length >= 2 &&
      cleanWord.length <= 20 &&
      /^[a-zA-Z]+$/.test(cleanWord)
    );
  }
}
