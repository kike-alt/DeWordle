import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CacheLoggerService {
  private readonly logger = new Logger('Cache');

  logHit(key: string) {
    this.logger.debug(`Cache HIT: ${key}`);
  }

  logMiss(key: string) {
    this.logger.debug(`Cache MISS: ${key}`);
  }

  logInvalidation(key: string) {
    this.logger.debug(`Cache INVALIDATED: ${key}`);
  }
}
