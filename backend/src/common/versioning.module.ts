import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DeprecationInterceptor } from './deprecation.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: DeprecationInterceptor,
    },
  ],
})
export class VersioningModule {}
