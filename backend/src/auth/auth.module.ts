import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from './strategies/jwt-strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthSession } from './entities/auth-session.entity';
import { EmailService } from './email.service';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordReset, RefreshToken, AuthSession]),
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }

        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailService, RefreshTokenService],
  exports: [AuthService],
})
export class AuthModule {}
