import { Test, TestingModule } from '@nestjs/testing';
import { LetteredBoxController } from './lettered-box.controller';
import { LetteredBoxService } from './lettered-box.service';

describe('LetteredBoxController', () => {
  let controller: LetteredBoxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LetteredBoxController],
      providers: [LetteredBoxService],
    }).compile();

    controller = module.get<LetteredBoxController>(LetteredBoxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
