import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import profanityList from '../../../utils/profanity-list.json';
import { OxfordResponse } from '../interfaces/oxfordResponse.interface';
import { WiktionaryResponse } from '../interfaces/wiktionaryResponse.interface';

type DictionaryLookupResult = {
  definition: string;
  source: string;
};

@Injectable()
export class WordValidationProvider {
  private readonly logger = new Logger(WordValidationProvider.name);
  private readonly wiktionaryBaseUrl = 'https://en.wiktionary.org/w/api.php';
  private readonly oxfordBaseUrl =
    'https://od-api.oxforddictionaries.com/api/v2';

  public async validateWord(wordText: string) {
    const reasons: string[] = [];
    let definition: string | null = null;
    const sources: string[] = [];
    let score = 0;

    if (profanityList.includes(wordText.toLowerCase())) {
      reasons.push('Profanity detected');
      return { valid: false, reasons, score };
    }

    if (/[^a-zA-Z]/.test(wordText)) {
      reasons.push('Contains non-alphabetic characters');
    }

    if (wordText.includes('-')) {
      reasons.push('Hyphenated word');
    }

    if (wordText.length < 2) {
      reasons.push('Too short to be playable');
    }

    if (reasons.length) {
      return { valid: false, reasons, score };
    }

    const dictApis = [
      this.lookupMerriamWebster(wordText),
      this.lookupOxford(wordText),
      this.lookupWiktionary(wordText),
    ];

    const results = await Promise.allSettled(dictApis);
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.definition) {
        definition = definition ?? result.value.definition;
        sources.push(result.value.source);
        score += 40;
      }
    });

    if (!definition) {
      reasons.push('No valid dictionary definition found');
      return { valid: false, reasons, score };
    }

    if (sources.length > 1) {
      score += 20;
    }

    score = Math.min(score, 100);

    return {
      valid: score >= 70,
      reasons,
      score,
      definition,
      sources,
    };
  }

  private async lookupMerriamWebster(
    word: string,
  ): Promise<DictionaryLookupResult | null> {
    try {
      const apiKey = process.env.MW_API_KEY;
      if (!apiKey) {
        return null;
      }

      const res = await axios.get(
        `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${apiKey}`,
      );

      if (res.data[0]?.shortdef?.length) {
        return {
          definition: res.data[0].shortdef[0] as string,
          source: 'Merriam-Webster',
        };
      }
    } catch (error) {
      this.logger.warn(
        `Merriam-Webster lookup failed for "${word}": ${this.getErrorMessage(error)}`,
      );
    }

    return null;
  }

  private async lookupOxford(
    word: string,
  ): Promise<DictionaryLookupResult | null> {
    try {
      const appId = process.env.OXFORD_APP_ID;
      const appKey = process.env.OXFORD_APP_KEY;
      if (!appId || !appKey) {
        return null;
      }

      const res = await axios.get<OxfordResponse>(
        `${this.oxfordBaseUrl}/entries/en-us/${word.toLowerCase()}`,
        {
          headers: {
            app_id: appId,
            app_key: appKey,
          },
        },
      );

      const lexicalEntries = res.data.results?.[0]?.lexicalEntries;
      if (!lexicalEntries?.length) {
        return null;
      }

      const definition =
        lexicalEntries[0].entries?.[0]?.senses?.[0]?.definitions?.[0];
      if (!definition) {
        return null;
      }

      return {
        definition,
        source: 'Oxford',
      };
    } catch (error) {
      this.logger.warn(
        `Oxford lookup failed for "${word}": ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private async lookupWiktionary(
    word: string,
  ): Promise<DictionaryLookupResult | null> {
    try {
      const res = await axios.get<WiktionaryResponse>(this.wiktionaryBaseUrl, {
        params: {
          action: 'query',
          prop: 'extracts',
          titles: word,
          format: 'json',
          redirects: 1,
          origin: '*',
        },
      });

      const pages = res.data?.query?.pages;
      const firstPageKey = pages ? Object.keys(pages)[0] : null;
      if (!firstPageKey || firstPageKey === '-1') {
        return null;
      }

      const extract = pages[firstPageKey]?.extract;
      if (!extract) {
        return null;
      }

      const plainText = extract.replace(/<[^>]+>/g, '').trim();
      const definition = plainText.split('. ')[0];

      if (!definition) {
        return null;
      }

      return {
        definition,
        source: 'Wiktionary',
      };
    } catch (error) {
      this.logger.warn(
        `Wiktionary lookup failed for "${word}": ${this.getErrorMessage(error)}`,
      );
      return null;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
