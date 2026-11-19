import {
  Controller,
  Get,
  Module,
  NestModule,
  RequestMethod,
  Req,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { RequestIdMiddleware } from './request-id.middleware';
import { RequestContextLogger } from '../request-context-logger';
import { RequestLoggingInterceptor } from '../interceptors/request-logging.interceptor';

@Controller()
class RequestIdTestController {
  @Get()
  getRequestId(@Req() req: Request) {
    return { requestId: req.headers['x-request-id'] };
  }
}

@Module({ controllers: [RequestIdTestController] })
class RequestIdTestModule implements NestModule {
  configure(consumer: Parameters<NestModule['configure']>[0]): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

describe('RequestIdMiddleware integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RequestIdTestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(new RequestContextLogger());
    app.useGlobalInterceptors(new RequestLoggingInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('preserves a valid client request ID in both request handling and response header', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const requestId = 'c0a80123-4567-489a-8abc-1234567890ab';
    const response = await request(app.getHttpServer())
      .get('/')
      .set('X-Request-ID', requestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(requestId);
    expect(response.body.requestId).toBe(requestId);
    const requestLogs = log.mock.calls
      .map(([line]) => String(line))
      .filter((line) => line.includes('http.request.'));
    expect(requestLogs.length).toBeGreaterThan(0);
    expect(requestLogs.every((line) => JSON.parse(line).requestId === requestId)).toBe(true);
    log.mockRestore();
  });

  it('replaces an invalid client request ID with a generated UUID', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .set('X-Request-ID', 'invalid')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });
});
