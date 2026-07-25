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

  hit(key: string, ttl: number): void {
    this.logger.debug(`CACHE HIT: ${key} (TTL: ${ttl}ms)`);
  }

  miss(key: string): void {
    this.logger.debug(`CACHE MISS: ${key}`);
  }

  set(key: string, ttl: number): void {
    this.logger.debug(`CACHE SET: ${key} (TTL: ${ttl}ms)`);
  }

  del(key: string): void {
    this.logger.debug(`CACHE DEL: ${key}`);
  }

  invalidation(endpoint: string, keys: string[]): void {
    this.logger.log(`CACHE INVALIDATION: ${endpoint} → ${keys.join(', ')}`);
  }
}
