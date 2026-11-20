import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { WordCacheModule } from './dewordle/words/word-cache.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsModule } from './dewordle/metrics/metrics.module';
import { MetricsController } from './dewordle/metrics/metrics.controller';
import { IndexerModule } from './indexer/indexer.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { DictionaryModule } from './word/dictionary.module';
import { ReadApiController } from './common/read-api.controller';
import { DeprecationController } from './common/deprecation.controller';
import { WalletRateLimitGuard } from './common/rate-limit.guard';
import { AppCacheModule } from './common/cache.module';
import { CacheMetricsService } from './common/cache-metrics.service';
import { CacheLoggerService } from './common/cache-logger.service';
import { VersioningModule } from './common/versioning.module';
import { JobModule } from './common/job.module';
import { DigestModule } from './digest/digest.module';
import { AdminModule } from './admin/admin.module';
import { PoolPressureService } from './database/pool-pressure.service';
import { DatabaseMaintenanceService } from './database/database-maintenance.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
      load: [databaseConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl:
              Number.parseInt(configService.get('RATE_LIMIT_TTL') ?? '60', 10) *
              1000,
            limit: Number.parseInt(
              configService.get('RATE_LIMIT_AUTH') ?? '5',
              10,
            ),
          },
          {
            ttl:
              Number.parseInt(configService.get('RATE_LIMIT_TTL') ?? '60', 10) *
              1000,
            limit: Number.parseInt(
              configService.get('RATE_LIMIT_GAME_SESSIONS') ?? '30',
              10,
            ),
          },
          {
            ttl:
              Number.parseInt(configService.get('RATE_LIMIT_TTL') ?? '60', 10) *
              1000,
            limit: Number.parseInt(
              configService.get('RATE_LIMIT_READ_API') ?? '100',
              10,
            ),
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    GameSessionsModule,
    DigestModule,
    // Issue #1221: TypeORM options now come from the dedicated
    // database config factory (src/config/database.config.ts).
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
        // DB-POOL-1210: connection pool exhaustion resilience.
        extra: {
          max: Number.parseInt(
            configService.get('DB_POOL_MAX') ?? '20',
            10,
          ),
          min: Number.parseInt(
            configService.get('DB_POOL_MIN') ?? '2',
            10,
          ),
          connectionTimeoutMillis: Number.parseInt(
            configService.get('DB_POOL_CONNECTION_TIMEOUT_MS') ?? '10000',
            10,
          ),
          idleTimeoutMillis: Number.parseInt(
            configService.get('DB_POOL_IDLE_TIMEOUT_MS') ?? '30000',
            10,
          ),
          statement_timeout: Number.parseInt(
            configService.get('DB_POOL_STATEMENT_TIMEOUT_MS') ?? '10000',
            10,
          ),
          query_timeout: Number.parseInt(
            configService.get('DB_POOL_QUERY_TIMEOUT_MS') ?? '10000',
            10,
          ),
          maxUses: Number.parseInt(
            configService.get('DB_POOL_MAX_USES') ?? '7500',
            10,
          ),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([TestEntity, SessionProjectionEntity]),
    AuthModule,
    UserModule,
    GamesModule,
    WordSuggestionsModule,
    WordsModule,
    WordCacheModule,
    MetricsModule,
    IndexerModule,
    DictionaryModule,
    AppCacheModule,
    VersioningModule,
    JobModule,
    AdminModule,
    MatchmakingModule,
    HealthModule,
  ],
  controllers: [
    AppController,
    MetricsController,
    ReadApiController,
    DeprecationController,
  ],
  providers: [
    AppService,
    CacheLoggerService,
    CacheMetricsService,
    PoolPressureService,
    DatabaseMaintenanceService,
    {
      provide: 'APP_GUARD',
      useClass: WalletRateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
