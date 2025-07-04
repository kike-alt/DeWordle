import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { TestEntity } from './entities/test.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GamesModule } from './games/games.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { SpellingBeeModule } from './games/spelling-bee/spelling-bee.module';
import { LetteredBoxModule } from './games/lettered-box/lettered-box.module';
import { PuzzleModule } from './puzzle/puzzle.module';
import { StrandsModule } from './games/strands/strands.module';
import { UserGameStatsModule } from './user-game-stats/user-game-stats.module';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { WordsModule } from './dewordle/words/words.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    EventEmitterModule.forRoot(),
    GameSessionsModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
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
    }),

    TypeOrmModule.forFeature([TestEntity]),
    AuthModule,
    UserModule,
    GamesModule,
    DictionaryModule,
    SpellingBeeModule,
    LetteredBoxModule,
    PuzzleModule,
    StrandsModule,
    UserGameStatsModule,
    WordsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
