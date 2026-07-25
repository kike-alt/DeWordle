import { Injectable } from '@nestjs/common';
import { WordDifficulty } from '../../enums/wordDifficulty.enum';

@Injectable()
export class WordScoringProvider {
  private highFrequencyWords = new Set(['the', 'be', 'to', 'of', 'and']); // top 3000
  private midFrequencyWords = new Set(['gather', 'symbol', 'typical']); // 40-10%
  private rareWords = new Set(['xylophone', 'quizzical', 'zephyr']); // bottom 10%

  scoreWord(word: string): WordDifficulty {
    const obscurityScore = this.calculateObscurity(word);
    const complexityScore = this.calculateComplexity(word);

    const finalScore = 0.7 * obscurityScore + 0.3 * complexityScore;

    if (finalScore < 0.4) return WordDifficulty.EASY;
    if (finalScore < 0.75) return WordDifficulty.MEDIUM;
    return WordDifficulty.HARD;
  }

  private calculateObscurity(word: string): number {
    const w = word.toLowerCase();
    if (this.highFrequencyWords.has(w)) return 0.1;
    if (this.midFrequencyWords.has(w)) return 0.5;
    if (this.rareWords.has(w)) return 1.0;
    return 0.6; // unknown word, moderate obscurity
  }

  private calculateComplexity(word: string): number {
    const w = word.toLowerCase();
    const hasUncommonLetters = /[qxz]/.test(w);
    const hasRepeatedLetters = /(.)\1/.test(w);
    const vowelCount = (w.match(/[aeiou]/g) || []).length;
    const consonantCount = w.length - vowelCount;

    let score = 0;
    if (hasUncommonLetters) score += 0.4;
    if (hasRepeatedLetters) score += 0.2;

    const ratio = vowelCount / (consonantCount || 1);
    if (ratio < 0.3 || ratio > 0.8) score += 0.2;

    return Math.min(score, 1.0); // cap at 1.0
  }
}
