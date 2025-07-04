import { Test, TestingModule } from '@nestjs/testing';
import { HangmanService } from './hangman.service';

describe('HangmanService', () => {
  let service: HangmanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HangmanService],
    }).compile();

    service = module.get<HangmanService>(HangmanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
