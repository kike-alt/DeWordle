import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Word } from '../../entities/word.entity';
import { DictionaryHelper } from '../../utils/dictionary.helper';

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);

  constructor(
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
  ) {}

  test(): string {
    return 'OK';
  }

  /**
   * Get a random word with enriched metadata
   * @returns Promise<Word & { isEnriched: boolean }>
   */
  async getRandomWord(): Promise<Word & { isEnriched: boolean }> {
    try {
      // First, try to get a random word from the database
      const randomWord = await this.wordRepository
        .createQueryBuilder('word')
        .orderBy('RANDOM()')
        .getOne();

      if (randomWord) {
        this.logger.debug(
          `Found existing word in database: ${randomWord.word}`,
        );
        return {
          ...randomWord,
          isEnriched: true,
        };
      }

      // If no words in database, create a fallback word and try to enrich it
      return await this.createFallbackEnrichedWord();
    } catch (error) {
      this.logger.error('Error getting random word:', error);
      return await this.createFallbackEnrichedWord();
    }
  }

  /**
   * Creates a fallback enriched word when database is empty
   * @returns Promise<Word & { isEnriched: boolean }>
   */
  private async createFallbackEnrichedWord(): Promise<
    Word & { isEnriched: boolean }
  > {
    const fallbackWords = [
      'crane',
      'slate',
      'audio',
      'house',
      'plant',
      'world',
      'music',
      'light',
      'water',
      'earth',
    ];
    const randomFallback =
      fallbackWords[Math.floor(Math.random() * fallbackWords.length)];

    this.logger.debug(`Creating fallback word: ${randomFallback}`);

    // Try to enrich the fallback word
    const enrichedData =
      await DictionaryHelper.enrichWordWithMetadata(randomFallback);

    if (enrichedData) {
      // Create and save the enriched word
      const newWord = this.wordRepository.create({
        word: randomFallback,
        definition: enrichedData.definition,
        example: enrichedData.example,
        partOfSpeech: enrichedData.partOfSpeech,
        phonetics: enrichedData.phonetics,
      });

      try {
        const savedWord = await this.wordRepository.save(newWord);
        this.logger.log(
          `Successfully enriched and saved word: ${randomFallback}`,
        );
        return {
          ...savedWord,
          isEnriched: true,
        };
      } catch (saveError) {
        this.logger.error(
          `Failed to save enriched word: ${randomFallback}`,
          saveError,
        );
      }
    }

    // Return basic fallback if enrichment fails
    this.logger.warn(`Returning basic fallback for word: ${randomFallback}`);

    // Create a proper Word object that matches the entity structure
    const fallbackWord: Word = {
      id: 'fallback-' + Date.now(),
      word: randomFallback,
      definition: `A ${randomFallback} is a common English word.`,
      example: `Here is an example sentence with the word ${randomFallback}.`,
      partOfSpeech: 'noun',
      phonetics: undefined, // Changed from null to undefined
      isDaily: false,
      dailyDate: undefined, // Changed from null to undefined
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      ...fallbackWord,
      isEnriched: false,
    };
  }

  /**
   * Enrich an existing word with dictionary data
   * @param wordText The word to enrich
   * @returns Promise<Word>
   */
  async enrichWord(wordText: string): Promise<Word> {
    if (!DictionaryHelper.isValidWordForEnrichment(wordText)) {
      throw new Error(`Invalid word for enrichment: ${wordText}`);
    }

    const cleanWord = wordText.trim().toLowerCase();

    // Check if word already exists
    let existingWord = await this.wordRepository.findOne({
      where: { word: cleanWord },
    });

    const enrichedData =
      await DictionaryHelper.enrichWordWithMetadata(cleanWord);

    if (!enrichedData) {
      throw new Error(`Failed to enrich word: ${cleanWord}`);
    }

    if (existingWord) {
      // Update existing word
      existingWord.definition = enrichedData.definition;
      existingWord.example = enrichedData.example;
      existingWord.partOfSpeech = enrichedData.partOfSpeech;
      existingWord.phonetics = enrichedData.phonetics;
      existingWord.updatedAt = new Date();

      return await this.wordRepository.save(existingWord);
    } else {
      // Create new word
      const newWord = this.wordRepository.create({
        word: cleanWord,
        definition: enrichedData.definition,
        example: enrichedData.example,
        partOfSpeech: enrichedData.partOfSpeech,
        phonetics: enrichedData.phonetics,
      });

      return await this.wordRepository.save(newWord);
    }
  }

  /**
   * Get all words
   * @returns Promise<Word[]>
   */
  async findAll(): Promise<Word[]> {
    return await this.wordRepository.find();
  }

  /**
   * Find a word by ID
   * @param id Word ID
   * @returns Promise<Word>
   */
  async findOne(id: string): Promise<Word> {
    const word = await this.wordRepository.findOne({ where: { id } });
    if (!word) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }
    return word;
  }
}
