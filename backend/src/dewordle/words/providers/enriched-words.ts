import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from '../../../entities/word.entity';
import axios from 'axios';
import CircuitBreaker from 'opossum';
import { Counter } from 'prom-client';

@Injectable()
export class EnrichedWordsProvider {
  private readonly logger = new Logger(EnrichedWordsProvider.name);

  private readonly cacheHits = new Counter({
    name: 'cache_hits',
    help: 'Number of cache hits',
  });

  private readonly cacheMisses = new Counter({
    name: 'cache_misses',
    help: 'Number of cache misses',
  });

  private breaker = new CircuitBreaker(this.enrichWord.bind(this), {
    timeout: 5000, // fail after 5s
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // retry after 30s
  });

  constructor(
    @InjectRepository(Word)
    private readonly wordRepo: Repository<Word>,
  ) {}

  public async getWord(text: string): Promise<Word> {
    let word = await this.wordRepo.findOne({ where: { word: text } });

    // 1. Cache hit
    if (word?.isEnriched) {
      this.logger.debug(`Cache hit for ${text}`);
      this.cacheHits.inc();
      return word;
    }

    this.logger.debug(`Cache miss for ${text}, fetching from API...`);
    this.cacheMisses.inc();

    const apiResponse = await this.breaker.fire(text);

    if (!word) {
      word = this.wordRepo.create({ word: text });
    }

    word.metadata = apiResponse ?? {};
    word.isEnriched = !!apiResponse;
    await this.wordRepo.save(word);

    return word;
  }

  private async enrichWord(
    text: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await axios.get<Record<string, unknown>>(
        `https://external-dict-api/${text}`,
      );
      return response.data;
    } catch (err) {
      this.logger.error(
        `API enrichment failed for ${text}`,
        err instanceof Error ? err.stack : String(err),
      );
      return null;
    }
  }
}
