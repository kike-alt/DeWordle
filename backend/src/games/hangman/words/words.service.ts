import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Word } from "./entities/word.entity";
import { CreateWordDto } from "./dto/create-word.dto";
import { UpdateWordDto } from "./dto/update-word.dto";

@Injectable()
export class WordsService {
  constructor(
    @InjectRepository(Word)
    private readonly wordsRepository: Repository<Word>
  ) {}

  async create(createWordDto: CreateWordDto): Promise<Word> {
    const word = new Word();
    Object.assign(word, {
      ...createWordDto,
      word: createWordDto.word.toUpperCase(),
      difficulty:
        createWordDto.difficulty ??
        this.calculateWordDifficulty(createWordDto.word.toUpperCase()),
    });

    return this.wordsRepository.save(word);
  }

  async createBatch(createWordDtos: CreateWordDto[]): Promise<Word[]> {
    const words = createWordDtos.map((dto) => {
      const upperWord = dto.word.toUpperCase();
      const word = new Word();
      Object.assign(word, {
        ...dto,
        word: upperWord,
        difficulty: dto.difficulty ?? this.calculateWordDifficulty(upperWord),
      });
      return word;
    });

    return this.wordsRepository.save(words);
  }

  async findAll(): Promise<Word[]> {
    return this.wordsRepository.find();
  }

  async findOne(id: number): Promise<Word> {
    const word = await this.wordsRepository.findOne({ where: { id } });
    if (!word) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }
    return word;
  }

  async update(id: number, updateWordDto: UpdateWordDto): Promise<Word> {
    const word = await this.findOne(id);

    const updatedWord = updateWordDto.word
      ? updateWordDto.word.toUpperCase()
      : word.word;

    Object.assign(word, {
      ...updateWordDto,
      word: updatedWord,
    });

    if (updateWordDto.word && !updateWordDto.difficulty) {
      word.difficulty = this.calculateWordDifficulty(updatedWord);
    }

    return this.wordsRepository.save(word);
  }

  async remove(id: number): Promise<void> {
    const result = await this.wordsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }
  }

  async getRandomWord(category?: string): Promise<Word> {
    const queryBuilder = this.wordsRepository.createQueryBuilder("word");

    if (category) {
      queryBuilder.where("word.category = :category", { category });
    }

    queryBuilder.orderBy("RANDOM()").limit(1);

    const word = await queryBuilder.getOne();
    if (!word) {
      throw new NotFoundException("No words found");
    }

    word.usageCount += 1;
    await this.wordsRepository.save(word);

    return word;
  }

  async getRandomWordByDifficulty(
    difficulty: number,
    category?: string
  ): Promise<Word> {
    const queryBuilder = this.wordsRepository.createQueryBuilder("word")
      .where("word.difficulty = :difficulty", { difficulty });

    if (category) {
      queryBuilder.andWhere("word.category = :category", { category });
    }

    queryBuilder.orderBy("RANDOM()").limit(1);

    const word = await queryBuilder.getOne();
    if (!word) {
      throw new NotFoundException("No words found with the specified criteria");
    }

    word.usageCount += 1;
    await this.wordsRepository.save(word);

    return word;
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.wordsRepository
      .createQueryBuilder("word")
      .select("DISTINCT word.category", "category")
      .getRawMany();

    return categories.map((c) => c.category);
  }

  async getWordsByCategory(category: string): Promise<Word[]> {
    return this.wordsRepository.find({
      where: { category },
    });
  }

  async getCategoryStats(): Promise<{ category: string; count: number }[]> {
    const result = await this.wordsRepository
      .createQueryBuilder("word")
      .select("word.category", "category")
      .addSelect("COUNT(*)", "count")
      .groupBy("word.category")
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));
  }

  async exportWords(): Promise<Word[]> {
    return this.wordsRepository.find();
  }

  private calculateWordDifficulty(word: string): number {
    const lengthFactor = Math.min(word.length / 10, 1) * 0.4;
    const uncommonLetters = (word.match(/[jqxz]/gi) || []).length;
    const uncommonFactor = Math.min(uncommonLetters / 2, 1) * 0.3;
    const uniqueLetters = new Set(word.toLowerCase()).size;
    const repetitionFactor =
      word.length > 0
        ? (1 - uniqueLetters / word.length) * 0.3
        : 0;

    const rawDifficulty =
      (lengthFactor + uncommonFactor + repetitionFactor) * 3;

    return Math.max(1, Math.min(3, Math.round(rawDifficulty)));
  }
}
