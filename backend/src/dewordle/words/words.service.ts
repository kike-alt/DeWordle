import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment-timezone';
import { DictionaryHelper, EnrichedWord } from '../../utils/dictionary.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word as WordEntity } from 'src/entities/word.entity';

export interface Word {
  id: string;
  word: string;
  length: number;
}

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);
  private readonly dictionaryHelper = new DictionaryHelper();
  private words: Word[] = [];
  
  // Performance tracking
  private cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    startTime: Date.now(),
  };

  constructor(
    @InjectRepository(WordEntity)
    private readonly wordRepo: Repository<WordEntity>,
  ) {
    // Seed the words when the service is initialized
    this.seedWords();
  }

  test(): string {
    return 'OK';
  }

  // Method to populate the in-memory word list
  private seedWords(): void {
    this.logger.log('Seeding 5-letter words...');
    const fiveLetterWords = [
      'apple',
      'baker',
      'crane',
      'dream',
      'eagle',
      'flame',
      'grape',
      'house',
      'igloo',
      'jolly',
      'knife',
      'lemon',
      'magic',
      'night',
      'ocean',
      'peach',
      'queen',
      'river',
      'sugar',
      'table',
      'umbra',
      'vivid',
      'whale',
      'xerox',
      'yacht',
      'zebra',
      'abode',
      'blaze',
      'chill',
      'daisy',
      'earth',
      'fable',
      'giant',
      'happy',
      'ivory',
      'jumbo',
      'kiosk',
      'light',
      'mirth',
      'noble',
      'oasis',
      'pixel',
      'quilt',
      'robot',
      'shade',
      'tango',
      'unity',
      'vowel',
      'witty',
      'xenon',
      'yield',
      'zonal',
      'about',
      'board',
      'cabin',
      'dance',
      'early',
      'fancy',
      'grace',
      'hello',
      'ideal',
      'joint',
      'karma',
      'latch',
      'mango',
      'north',
      'opera',
      'party',
      'quiet',
      'ruler',
      'smile',
      'train',
      'urban',
      'value',
      'watch',
      'xylem',
      'young',
      'zesty',
      'above',
      'brave',
      'chase',
      'drive',
      'empty',
      'feast',
      'glory',
      'honor',
      'image',
      'joust',
      'kudos',
      'lucky',
      'mount',
      'never',
      'order',
      'plant',
      'quick',
      'rusty',
      'shine',
      'truth',
      'unity',
      'vogue',
      'wagon',
      'extra',
      'yummy',
      'zesty',
      'alert',
      'birth',
      'charm',
      'drain',
      'entry',
      'fluid',
      'grand',
      'hasty',
      'inner',
      'jolly',
      'kiosk',
      'lunar',
      'major',
      'naive',
      'ozone',
      'proud',
      'quash',
      'rapid',
      'story',
      'tasty',
      'ultra',
      'vocal',
      'waste',
      'xeric',
      'yacht',
      'zonal',
    ];

    this.words = fiveLetterWords.map((word) => ({
      id: uuidv4(),
      word: word,
      length: word.length,
      isDaily: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    this.logger.log(`Seeded ${this.words.length} 5-letter words.`);
  }

  /**
   * Gets current cache performance statistics
   * @returns Object containing cache hit rates and performance metrics
   */
  getCacheStats() {
    const hitRate = this.cacheStats.totalRequests > 0 
      ? (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(2)
      : '0.00';
    
    const uptime = Date.now() - this.cacheStats.startTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    return {
      cacheHits: this.cacheStats.hits,
      cacheMisses: this.cacheStats.misses,
      totalRequests: this.cacheStats.totalRequests,
      hitRate: `${hitRate}%`,
      uptime: `${uptimeHours} hours`,
      performance: {
        isOptimal: parseFloat(hitRate) >= 90,
        targetHitRate: '90%',
        currentStatus: parseFloat(hitRate) >= 90 ? 'OPTIMAL' : 'NEEDS_IMPROVEMENT'
      }
    };
  }

  /**
   * Checks if a word has complete enrichment data
   * Handles partial enrichment scenarios by requiring minimal essential data
   * @param word - The word entity to check
   * @returns boolean - True if word has sufficient enrichment data
   */
  private hasCompleteEnrichment(word: WordEntity): boolean {
    // Essential data: at least definition OR partOfSpeech
    const hasEssentialData = !!(word.definition || word.partOfSpeech);
    
    // Consider partially enriched if we have essential data
    // Even if some optional fields (example, phonetics) are missing
    if (hasEssentialData) {
      this.logger.debug(`Word '${word.word}' has partial enrichment: definition=${!!word.definition}, partOfSpeech=${!!word.partOfSpeech}, example=${!!word.example}, phonetics=${!!word.phonetics}`);
      return true;
    }
    
    return false;
  }

  /**
   * Saves enriched word data back to the database
   * Handles partial enrichment by only updating fields that have data
   * @param originalWord - The original word entity
   * @param enrichedData - The enriched data from API
   */
  private async saveEnrichedWordToDatabase(
    originalWord: WordEntity,
    enrichedData: EnrichedWord,
  ): Promise<void> {
    try {
      // Build update object with only non-null/non-undefined fields
      const updateData: Partial<WordEntity> = {};
      
      if (enrichedData.definition) updateData.definition = enrichedData.definition;
      if (enrichedData.example) updateData.example = enrichedData.example;
      if (enrichedData.partOfSpeech) updateData.partOfSpeech = enrichedData.partOfSpeech;
      if (enrichedData.phonetics) updateData.phonetics = enrichedData.phonetics;
      
      // Only mark as enriched if we have at least essential data
      const hasEssentialData = !!(enrichedData.definition || enrichedData.partOfSpeech);
      if (hasEssentialData) {
        updateData.isEnriched = true;
      }

      await this.wordRepo.update(originalWord.id, updateData);

      const fieldsUpdated = Object.keys(updateData).join(', ');
      this.logger.log(
        `Successfully cached ${hasEssentialData ? 'enriched' : 'partial'} data for word '${originalWord.word}'. Fields: ${fieldsUpdated}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to save enriched data for word '${originalWord.word}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace available',
      );
    }
  }

  async getRandomWord(): Promise<EnrichedWord> {
    this.logger.log('Attempting to retrieve a random 5-letter word.');

    // Get random word from database
    const randomWord = await this.wordRepo
      .createQueryBuilder('word')
      .where('LENGTH(word.word) = :length', { length: 5 })
      .orderBy('RANDOM()')
      .limit(1)
      .getOne();

    if (!randomWord) {
      this.logger.warn('No 5-letter words found in the database.');
      throw new NotFoundException(
        'No 5-letter words available in the database.',
      );
    }

    this.logger.log(`Selected random word: ${randomWord.word}`);

    // Update total requests counter
    this.cacheStats.totalRequests++;

    // Check if word is already enriched (cache hit)
    if (randomWord.isEnriched && this.hasCompleteEnrichment(randomWord)) {
      this.cacheStats.hits++;
      const hitRate = (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(2);
      
      this.logger.log(`Cache HIT: Word '${randomWord.word}' already enriched. Hit rate: ${hitRate}%`);
      
      return {
        id: randomWord.id,
        word: randomWord.word,
        definition: randomWord.definition,
        example: randomWord.example,
        partOfSpeech: randomWord.partOfSpeech,
        phonetics: randomWord.phonetics,
        isEnriched: true,
      };
    }

    // Cache miss - need to enrich from API
    this.cacheStats.misses++;
    const hitRate = (this.cacheStats.hits / this.cacheStats.totalRequests * 100).toFixed(2);
    this.logger.log(`Cache MISS: Enriching word '${randomWord.word}' from API. Hit rate: ${hitRate}%`);
    
    try {
      const enrichedWord = await this.dictionaryHelper.enrichWordWithMetadata(
        randomWord.word,
        randomWord.id,
      );
      
      // Save enriched data back to database if enrichment was successful
      if (enrichedWord.isEnriched) {
        await this.saveEnrichedWordToDatabase(randomWord, enrichedWord);
      }
      
      return enrichedWord;
    } catch (error) {
      this.logger.error(
        `Failed to enrich word '${randomWord.word}', returning basic word`,
        error instanceof Error ? error.stack : 'No stack trace available',
      );

      // Return basic word if enrichment fails
      return {
        id: randomWord.id,
        word: randomWord.word,
        isEnriched: false,
      };
    }
  }

  public async getTodaysWord() {
    const timezone = process.env.DAILY_WORD_TIMEZONE || 'UTC';
    const today = moment().tz(timezone).startOf('day').format('YYYY-MM-DD');
    const todayDate = new Date(today);

    const word = await this.wordRepo.findOneBy({ dailyDate: todayDate });
    if (!word) {
      throw new NotFoundException('Daily word not found');
    }

    return word;
  }

  public async getHealthStatus() {
    const timezone = process.env.DAILY_WORD_TIMEZONE || 'UTC';
    const today = moment().tz(timezone).startOf('day').format('YYYY-MM-DD');
    const todayDate = new Date(today);
    const word = await this.wordRepo.findOneBy({ dailyDate: todayDate });
    const remaining = await this.wordRepo.countBy({ isDaily: false });

    return {
      status: word ? 'ok' : 'missing',
      last_update: word?.updatedAt,
      next_update: moment(today).add(1, 'day').toISOString(),
      words_remaining: remaining,
    };
  }
}
