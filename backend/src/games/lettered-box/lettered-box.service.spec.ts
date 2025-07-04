import { Test, TestingModule } from '@nestjs/testing';
import { LetteredBoxService } from './lettered-box.service';

describe('LetteredBoxService', () => {
  let service: LetteredBoxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LetteredBoxService],
    }).compile();

    service = module.get<LetteredBoxService>(LetteredBoxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
