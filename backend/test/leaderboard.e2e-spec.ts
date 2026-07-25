import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection } from 'typeorm';

describe('LeaderboardController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await getConnection().close();
    await app.close();
  });

  it('/leaderboard/:gameSlug (GET) returns 200', async () => {
    const gameSlug = 'wordle'; // Use a valid slug in your DB
    const res = await request(app.getHttpServer())
      .get(`/leaderboard/${gameSlug}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('/leaderboard/global (GET) returns 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/leaderboard/global')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
