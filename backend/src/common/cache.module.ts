import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheLoggerService } from './cache-logger.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60_000,
    }),
  ],
  providers: [CacheLoggerService],
  exports: [CacheModule, CacheLoggerService],
})
export class AppCacheModule {}
