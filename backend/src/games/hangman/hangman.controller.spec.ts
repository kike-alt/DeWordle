import { Test, TestingModule } from '@nestjs/testing';
import { HangmanController } from './hangman.controller';
import { HangmanService } from './hangman.service';

describe('HangmanController', () => {
  let controller: HangmanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HangmanController],
      providers: [HangmanService],
    }).compile();

    controller = module.get<HangmanController>(HangmanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
