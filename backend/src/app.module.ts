import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestEntity } from './entities/test.entity';
import { SessionProjectionEntity } from './indexer/entities/session-projection.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GamesModule } from './games/games.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { WordsModule } from './dewordle/words/words.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsModule } from './dewordle/metrics/metrics.module';
import { MetricsController } from './dewordle/metrics/metrics.controller';
import { IndexerModule } from './indexer/indexer.module';
import { ReadApiController } from './common/read-api.controller';
import { DeprecationController } from './common/deprecation.controller';
import { AppCacheModule } from './common/cache.module';
import { CacheLoggerService } from './common/cache-logger.service';
import { VersioningModule } from './common/versioning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    GameSessionsModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: Number.parseInt(configService.get('DB_PORT') ?? '5432', 10),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        ssl:
          configService.get('DB_SSL') === 'true'
            ? {
                rejectUnauthorized: false,
              }
            : false,
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        migrations: ['dist/migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([TestEntity, SessionProjectionEntity]),
    AuthModule,
    UserModule,
    GamesModule,
    WordsModule,
    MetricsModule,
    IndexerModule,
    AppCacheModule,
    VersioningModule,
  ],
  controllers: [AppController, MetricsController, ReadApiController, DeprecationController],
  providers: [AppService, CacheLoggerService],
})
export class AppModule {}
