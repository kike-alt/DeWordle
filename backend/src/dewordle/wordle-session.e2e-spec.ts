/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WordleSessionModule } from './wordle-session.module';
import { WordleSession } from './entities/wordle-session.entity';
import { Word } from '../entities/word.entity';

describe('WordleSession E2E', () => {
  let app: INestApplication;

  const mockWordleSession: WordleSession = {
    id: 1,
    user: null,
    targetWord: {
      id: 'test-word-id',
      word: 'WORLD',
    } as Word,
    guessHistory: [],
    isCompleted: false,
    isWon: false,
    attemptsRemaining: 6,
    completedAt: null,
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WordleSessionModule],
    })
      .overrideProvider(getRepositoryToken(WordleSession))
      .useValue(mockRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /wordle-sessions/:id/guess', () => {
    it('should successfully submit a guess', async () => {
      const session = { ...mockWordleSession };
      const updatedSession = {
        ...session,
        guessHistory: [
          {
            guess: 'AUDIO',
            result: [
              { letter: 'A', status: 'absent' },
              { letter: 'U', status: 'absent' },
              { letter: 'D', status: 'present' },
              { letter: 'I', status: 'absent' },
              { letter: 'O', status: 'present' },
            ],
            timestamp: expect.any(Date),
          },
        ],
        attemptsRemaining: 5,
        updatedAt: expect.any(Date),
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue(updatedSession);

      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/1/guess')
        .send({ guess: 'AUDIO' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        attemptsRemaining: 5,
        isCompleted: false,
        isWon: false,
        guessHistory: [
          {
            guess: 'AUDIO',
            result: [
              { letter: 'A', status: 'absent' },
              { letter: 'U', status: 'absent' },
              { letter: 'D', status: 'present' },
              { letter: 'I', status: 'absent' },
              { letter: 'O', status: 'present' },
            ],
          },
        ],
      });
    });

    it('should return 404 for non-existent session', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/999/guess')
        .send({ guess: 'AUDIO' })
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Wordle session not found',
      });
    });

    it('should return 400 for completed session', async () => {
      const completedSession = {
        ...mockWordleSession,
        isCompleted: true,
      };

      mockRepository.findOne.mockResolvedValue(completedSession);

      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/1/guess')
        .send({ guess: 'AUDIO' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Game session is already completed',
      });
    });

    it('should return 400 for invalid guess format', async () => {
      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/1/guess')
        .send({ guess: 'ABC' })
        .expect(400);

      expect(response.body.message).toContain(
        'Guess must be exactly 5 letters long',
      );
    });

    it('should return 400 for empty guess', async () => {
      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/1/guess')
        .send({ guess: '' })
        .expect(400);

      expect(response.body.message).toContain(
        'Guess must be exactly 5 letters long',
      );
    });

    it('should return 400 for missing guess', async () => {
      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/1/guess')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('guess');
    });

    it('should return 404 for invalid session ID format', async () => {
      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/invalid/guess')
        .send({ guess: 'AUDIO' })
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Invalid session ID',
      });
    });

    it('should handle winning guess', async () => {
      const session = { ...mockWordleSession };
      const updatedSession = {
        ...session,
        guessHistory: [
          {
            guess: 'WORLD',
            result: [
              { letter: 'W', status: 'correct' },
              { letter: 'O', status: 'correct' },
              { letter: 'R', status: 'correct' },
              { letter: 'L', status: 'correct' },
              { letter: 'D', status: 'correct' },
            ],
            timestamp: expect.any(Date),
          },
        ],
        isWon: true,
        isCompleted: true,
        attemptsRemaining: 5,
        completedAt: expect.any(Date),
      };

      mockRepository.findOne.mockResolvedValue(session);
      mockRepository.save.mockResolvedValue(updatedSession);

      const response = await request(app.getHttpServer())
        .post('/wordle-sessions/1/guess')
        .send({ guess: 'WORLD' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        isWon: true,
        isCompleted: true,
        attemptsRemaining: 5,
      });
    });
  });
});
