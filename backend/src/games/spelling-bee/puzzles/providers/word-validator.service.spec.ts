import { Test, TestingModule } from '@nestjs/testing';
import { WordValidatorService } from './word-validator-service.service';
import { DictionaryService } from 'src/dictionary/dictionary.service';

const mockDictionaryService = {
  getValidWords: jest.fn(),
  isPangram: jest.fn(),
};

describe('WordValidatorService', () => {
  let service: WordValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordValidatorService,
        {
          provide: DictionaryService,
          useValue: mockDictionaryService,
        },
      ],
    }).compile();

    service = module.get<WordValidatorService>(WordValidatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const puzzle = {
    allowedLetters: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    centerLetter: 'e',
    submittedWords: ['cafe'],
  };

  it('should return invalid if word is too short', () => {
    const result = service.validateWord('cat', puzzle);
    expect(result).toEqual({
      valid: false,
      score: 0,
      reason: 'Word too short',
    });
  });

  it('should return invalid if word not in valid words', () => {
    mockDictionaryService.getValidWords.mockReturnValue(['face', 'bead']);
    const result = service.validateWord('zebra', puzzle);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Not in dictionary or invalid letters');
  });

  it('should return invalid if word does not include center letter', () => {
    mockDictionaryService.getValidWords.mockReturnValue(['face']);
    const invalidPuzzle = { ...puzzle, centerLetter: 'z' };
    const result = service.validateWord('face', invalidPuzzle);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Missing center letter');
  });

  it('should return invalid if word already submitted', () => {
    mockDictionaryService.getValidWords.mockReturnValue(['cafe']);
    const result = service.validateWord('cafe', puzzle);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Already submitted');
  });

  it('should return valid with 4-letter word = 1 point', () => {
    mockDictionaryService.getValidWords.mockReturnValue(['face']);
    mockDictionaryService.isPangram.mockReturnValue(false);
    const result = service.validateWord('face', puzzle);
    expect(result).toEqual({
      valid: true,
      score: 1,
    });
  });

  it('should return valid with 5+ letter word = 1 point per letter', () => {
    mockDictionaryService.getValidWords.mockReturnValue(['beads']);
    mockDictionaryService.isPangram.mockReturnValue(false);
    const result = service.validateWord('beads', puzzle);
    expect(result).toEqual({
      valid: true,
      score: 5,
    });
  });

  it('should return valid with pangram bonus', () => {
    mockDictionaryService.getValidWords.mockReturnValue(['deface']);
    mockDictionaryService.isPangram.mockReturnValue(true);
    const result = service.validateWord('deface', puzzle);
    expect(result).toEqual({
      valid: true,
      score: 6 + 7, // 6 letters + 7 bonus
    });
  });
});