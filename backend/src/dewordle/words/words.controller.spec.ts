import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import * as request from 'supertest';
import { WordsModule } from './words.module';
import { WordsService } from './words.service';

describe('WordsController (Integration Tests)', () => {
  let app: INestApplication;
  let wordsService: WordsService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WordsModule],
    })
      .overrideProvider(WordsService)
      .useValue({
        test: jest.fn().mockReturnValue('OK'),
        getRandomWord: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    wordsService = moduleFixture.get<WordsService>(WordsService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('/words/test (GET) should return "OK"', () => {
    return request(app.getHttpServer())
      .get('/words/test')
      .expect(200)
      .expect('OK');
  });

  describe('/words/random (GET)', () => {
    it('should return a random 5-letter word', async () => {
      const mockWord = { word: 'crane' };
      jest.spyOn(wordsService, 'getRandomWord').mockResolvedValue(mockWord);

      await request(app.getHttpServer())
        .get('/words/random')
        .expect(200)
        .expect(mockWord);
    });

    it('should return 404 if no 5-letter words are available', async () => {
      jest
        .spyOn(wordsService, 'getRandomWord')
        .mockRejectedValue(
          new NotFoundException('No 5-letter words available in the database.'),
        );

      await request(app.getHttpServer())
        .get('/words/random')
        .expect(404)
        .expect({
          statusCode: 404,
          message: 'No 5-letter words available in the database.',
          error: 'Not Found',
        });
    });

    it('should return 404 for unexpected errors from service', async () => {
      jest
        .spyOn(wordsService, 'getRandomWord')
        .mockRejectedValue(new Error('Something unexpected happened.'));

      await request(app.getHttpServer())
        .get('/words/random')
        .expect(404)
        .expect({
          statusCode: 404,
          message:
            'Could not retrieve a random word at this time due to an internal issue.',
          error: 'Not Found',
        });
    });
  });
});
