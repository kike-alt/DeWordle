import { Injectable } from '@nestjs/common';
import { DictionaryService } from 'src/dictionary/dictionary.service';
import { Puzzle } from 'src/games/spelling-bee/puzzles/entities/puzzle.entity';

@Injectable()
export class WordValidatorService {
  constructor(private readonly dictionaryService: DictionaryService) {}

  validateWord(
    word: string,
    puzzle: Puzzle,
  ): { valid: boolean; score: number; reason?: string } {
    word = word.toLowerCase();

    const allowedLetters = Array.from(new Set(puzzle.letters));

    const dictionaryWords = this.dictionaryService.getValidWords(
      allowedLetters,
      puzzle.centerLetter,
    );
    if (word.length < 4) {
      return { valid: false, score: 0, reason: 'Word too short' };
    }

    if (!dictionaryWords.includes(word)) {
      return { valid: false, score: 0, reason: 'Invalid word' };
    }

    if (!word.includes(puzzle.centerLetter)) {
      return { valid: false, score: 0, reason: 'Missing center letter' };
    }

    // if (puzzle.submittedWords.includes(word)) {
    //   return { valid: false, score: 0, reason: 'Already submitted' };
    // }

    let score = word.length === 4 ? 1 : word.length;
    if (this.dictionaryService.isPangram(word, allowedLetters)) {
      score += 7;
    }

    return { valid: true, score };
  }
}
