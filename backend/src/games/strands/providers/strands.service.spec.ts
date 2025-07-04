import { Test, TestingModule } from '@nestjs/testing';
import { StrandsService } from './strands.service';

describe('StrandsService', () => {
  let service: StrandsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrandsService],
    }).compile();

    service = module.get<StrandsService>(StrandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
