import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"

import { UsersModule } from "./users/users.module"
import { AuthModule } from "./auth/auth.module"
import { AdminModule } from "./admin/admin.module"
import { SubAdminModule } from "./sub-admin/sub-admin.module"
import { GamesModule } from "./games/games.module"
import { PuzzleModule } from "./puzzle/puzzle.module"
import { DictionaryModule } from "./dictionary/dictionary.module"
import { GuestFeaturesModule } from "./guest-features/guest-features.module"
import { MailModule } from "./mail/mail.module"
import { GuestUserModule } from "./guest/guest.module"
import { HealthModule } from "./health/health.module"

import envConfiguration from "../config/envConfiguration"
import { validate } from "../config/env.validation" // ✅ Correct function to use

// Entities
import { User } from "./users/entities/user.entity"
import { Result } from "./games/dewordle/result/entities/result.entity"
import { Leaderboard } from "./games/dewordle/leaderboard/entities/leaderboard.entity"
import { Admin } from "./admin/entities/admin.entity"
import { SubAdmin } from "./sub-admin/entities/sub-admin-entity"
import { Token } from "./auth/entities/token.entity"
import { Word } from "./games/dewordle/words/entities/word.entity"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfiguration],
      validate, // ✅ Use class-validator-based schema validation
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get("NODE_ENV") === "production"
        const sslEnabled = configService.get("DB_SSL") === "true"

        console.log("🔧 Database Configuration:")
        console.log(`- Host: ${configService.get("DB_HOST")}`)
        console.log(`- Port: ${configService.get("DB_PORT")}`)
        console.log(`- Database: ${configService.get("DB_NAME")}`)
        console.log(`- SSL Enabled: ${sslEnabled}`)
        console.log(`- Environment: ${configService.get("NODE_ENV")}`)

        return {
          type: "postgres",
          host: configService.get("DB_HOST"),
          port: Number(configService.get("DB_PORT")) || 5432,
          username: configService.get("DB_USERNAME"),
          password: configService.get("DB_PASSWORD"),
          database: configService.get("DB_NAME"),
          entities: [User, Result, Leaderboard, Admin, SubAdmin, Token, Word],
          migrations: ["dist/migrations/*.js"],
          synchronize: !isProduction,
          logging: !isProduction,
          ssl: sslEnabled
            ? {
                rejectUnauthorized: false,
              }
            : false,
          extra: sslEnabled
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : {},
        }
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    AdminModule,
    SubAdminModule,
    GamesModule,
    PuzzleModule,
    DictionaryModule,
    GuestUserModule,
    GuestFeaturesModule,
    MailModule,
    HealthModule,
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
