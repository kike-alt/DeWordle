import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { DictionaryHelper, EnrichedWord } from '../../utils/dictionary.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word as WordEntity } from '../../entities/word.entity';
import { WordScoringProvider } from './providers/word-scoring-provider';
import { CreateWordDto } from './dto/create-word.dto';
import { WordValidationProvider } from './providers/word-validation-provider';
import { EnrichedWordsProvider } from './providers/enriched-words';

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

  constructor(
    @InjectRepository(WordEntity)
    private readonly wordRepo: Repository<WordEntity>,

    private readonly wordScoringProvider: WordScoringProvider,

    private readonly wordValidationProvider: WordValidationProvider,

    private readonly enrichedWordsProvider: EnrichedWordsProvider,
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

  async getRandomWord(): Promise<EnrichedWord> {
    this.logger.log('Attempting to retrieve a random 5-letter word.');

    // Filter for 5-letter words specifically
    const fiveLetterWords = this.words.filter((w) => w.length === 5);

    if (fiveLetterWords.length === 0) {
      this.logger.warn('No 5-letter words found in the database.');
      throw new NotFoundException(
        'No 5-letter words available in the database.',
      );
    }

    // Efficient random selection from the filtered list
    const randomIndex = Math.floor(Math.random() * fiveLetterWords.length);
    const randomWord = fiveLetterWords[randomIndex];

    // Check if randomWord is actually found
    if (!randomWord) {
      this.logger.error(
        'Failed to select a random word despite words being available.',
      );
      throw new InternalServerErrorException(
        'Failed to retrieve a random word.',
      );
    }

    this.logger.log(`Selected random word: ${randomWord.word}`);

    // Enrich the word with dictionary metadata
    try {
      const enrichedWord = await this.dictionaryHelper.enrichWordWithMetadata(
        randomWord.word,
        randomWord.id,
      );
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

  public async getDailyArchive(limit = 100): Promise<
    { date: string; word: string }[]
  > {
    if (!Number.isInteger(limit) || limit < 1 || limit > 365) {
      throw new BadRequestException('limit must be an integer between 1 and 365');
    }

    const timezone = process.env.DAILY_WORD_TIMEZONE || 'UTC';
    const today = moment().tz(timezone).format('YYYY-MM-DD');
    const words = await this.wordRepo
      .createQueryBuilder('word')
      .select('word.dailyDate', 'date')
      .addSelect('word.word', 'word')
      .where('word.dailyDate IS NOT NULL')
      .andWhere('word.dailyDate < :today', { today })
      .orderBy('word.dailyDate', 'DESC')
      .limit(limit)
      .getRawMany<{ date: string | Date; word: string }>();

    return words
      .reverse()
      .map(({ date, word }) => ({
        date: moment(date).format('YYYY-MM-DD'),
        word,
      }));
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

  public async wordScoring(word: string) {
    return this.wordScoringProvider.scoreWord(word);
  }

  async tagAllWords() {
    const words = await this.wordRepo.find();

    const toUpdate = [];

    for (const word of words) {
      const difficulty = this.wordScoringProvider.scoreWord(word.word);
      word.difficulty = difficulty;
      toUpdate.push(word);
    }

    await this.wordRepo.save(toUpdate);
    return { updated: toUpdate.length };
  }

  public async createWord(createDto: CreateWordDto): Promise<WordEntity> {
    // Validate before creation
    const validation = await this.wordValidationProvider.validateWord(
      createDto.word,
    );

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Word validation failed',
        reasons: validation.reasons,
      });
    }

    // Score & save
    const difficulty = this.wordScoringProvider.scoreWord(createDto.word);
    const word = this.wordRepo.create({
      ...createDto,
      difficulty,
      definition: validation.definition,
      sources: validation.sources,
    });

    return this.wordRepo.save(word);
  }

  public async validateWord(wordText: string) {
    return this.wordValidationProvider.validateWord(wordText);
  }

  public async enrichedWords(text: string) {
    return this.enrichedWordsProvider.getWord(text);
  }
}
