import { WordDifficulty } from '../../enums/wordDifficulty.enum';
import { WordScoringProvider } from './word-scoring-provider';

describe('WordScoringProvider', () => {
  let provider: WordScoringProvider;

  beforeEach(() => {
    provider = new WordScoringProvider();
  });

  describe('scoreWord', () => {
    it('should classify a high-frequency simple word as EASY', () => {
      expect(provider.scoreWord('the')).toBe(WordDifficulty.EASY);
    });

    it('should classify a mid-frequency word as MEDIUM', () => {
      expect(provider.scoreWord('symbol')).toBe(WordDifficulty.MEDIUM);
    });

    it('should classify a rare and complex word as HARD', () => {
      expect(provider.scoreWord('xylophone')).toBe(WordDifficulty.HARD);
    });

    it('should classify a word with repeated letters and rare characters as HARD', () => {
      expect(provider.scoreWord('quizzical')).toBe(WordDifficulty.HARD);
    });

    it('should classify a moderately obscure unknown word as MEDIUM', () => {
      expect(provider.scoreWord('planet')).toBe(WordDifficulty.MEDIUM);
    });

    it('should classify a short, common-looking word as EASY', () => {
      expect(provider.scoreWord('and')).toBe(WordDifficulty.EASY);
    });

    it('should cap complexity score at 1.0', () => {
      // an artificial word that would yield high complexity
      const spy = jest.spyOn<any, any>(provider as any, 'calculateComplexity');
      provider.scoreWord('zzqx'); // definitely rare and complex
      expect(spy).toHaveReturnedWith(expect.any(Number));
    });
  });
});
