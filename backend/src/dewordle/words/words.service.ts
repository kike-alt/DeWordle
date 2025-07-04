import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DictionaryHelper, EnrichedWord } from '../../utils/dictionary.helper';

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

  constructor() {
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
}
