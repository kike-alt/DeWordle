import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestEntity } from './entities/test.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GamesModule } from './games/games.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { WordsModule } from './dewordle/words/words.module';
import { SeedingModule } from './seeding/seeding.module';

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
        // entities: [TestEntity],
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        migrations: ['dist/migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([TestEntity]),
    AuthModule,
    UserModule,
    GamesModule,
    WordsModule,
    SeedingModule,
    // TODO: WordsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
