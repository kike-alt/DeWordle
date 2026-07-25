import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthSession } from './entities/auth-session.entity';

const MAX_SESSIONS_PER_WALLET = 3;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(AuthSession)
    private readonly authSessionRepo: Repository<AuthSession>,
  ) {}

  async generateRefreshToken(
    walletAddress: string,
    userId: number,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const refreshToken = this.refreshTokenRepo.create({
      tokenHash,
      walletAddress,
      expiresAt,
      userAgent,
      ipAddress,
      user: { id: userId } as any,
    });

    await this.refreshTokenRepo.save(refreshToken);

    await this.enforceConcurrentSessionLimit(walletAddress);

    return { token: rawToken, expiresAt };
  }

  async validateRefreshToken(token: string): Promise<RefreshToken> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const refreshToken = await this.refreshTokenRepo.findOne({
      where: {
        tokenHash,
        expiresAt: MoreThan(new Date()),
        revokedAt: null,
      },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return refreshToken;
  }

  async rotateRefreshToken(
    oldToken: string,
    walletAddress: string,
    userId: number,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const tokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');

    const existingToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!existingToken || existingToken.revokedAt) {
      throw new UnauthorizedException('Token already revoked or invalid');
    }

    existingToken.revokedAt = new Date();
    await this.refreshTokenRepo.save(existingToken);

    return this.generateRefreshToken(walletAddress, userId, userAgent, ipAddress);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await this.refreshTokenRepo.update(
      { tokenHash },
      { revokedAt: new Date() },
    );
  }

  async revokeAllRefreshTokens(walletAddress: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { walletAddress, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async getActiveSessions(walletAddress: string): Promise<AuthSession[]> {
    return this.authSessionRepo.find({
      where: { walletAddress, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createSession(
    walletAddress: string,
    userId: number,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthSession> {
    const session = this.authSessionRepo.create({
      walletAddress,
      userAgent,
      ipAddress,
      user: { id: userId } as any,
    });
    return this.authSessionRepo.save(session);
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.authSessionRepo.update(sessionId, { isActive: false });
  }

  private async enforceConcurrentSessionLimit(
    walletAddress: string,
  ): Promise<void> {
    const activeSessions = await this.authSessionRepo.find({
      where: { walletAddress, isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (activeSessions.length >= MAX_SESSIONS_PER_WALLET) {
      const sessionsToRevoke = activeSessions.slice(
        0,
        activeSessions.length - MAX_SESSIONS_PER_WALLET + 1,
      );

      for (const session of sessionsToRevoke) {
        session.isActive = false;
        await this.authSessionRepo.save(session);
      }
    }
  }
}
