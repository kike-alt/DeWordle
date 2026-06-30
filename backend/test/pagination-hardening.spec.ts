import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { IndexerController } from '../src/indexer/indexer.controller';

describe('SECURITY-212: API Pagination & Input Size Hardening', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [IndexerController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should accept a compliant pagination request (limit <= 100)', async () => {
    return request(app.getHttpServer())
      .get('/indexer/records?limit=50')
      .expect(200)
      .expect((res) => {
        expect(res.body.meta.requestedLimit).toBe(50);
      });
  });

  it('should reject a request that exceeds the max page limit', async () => {
    return request(app.getHttpServer())
      .get('/indexer/records?limit=101')
      .expect(400); // Bad Request
  });

  it('should block query streams that exceed structural filter lengths', async () => {
    const hugeString = 'a'.repeat(257);
    return request(app.getHttpServer())
      .get(`/indexer/records?filterTerm=${hugeString}`)
      .expect(400);
  });
});