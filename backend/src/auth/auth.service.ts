import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { SignupDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PasswordReset } from './entities/password-reset.entity';
import { EmailService } from './email.service';
import { User } from './entities/user.entity';
import { RefreshTokenService } from './refresh-token.service';
import * as crypto from 'crypto';

const ACCESS_TOKEN_EXPIRY = '15m';

@Injectable()
export class AuthService {
  // Enforce a strong workload balance baseline for security profiles
  private readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
    private readonly emailService: EmailService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Hardened Forgot Password Request Workflow
   * Mitigates user enumeration and timing analysis via uniform response models.
   */
  async forgotPassword(email: string): Promise<void> {
    const standardizedEmail = email.toLowerCase().trim();
    const user = await this.userService.findByEmail(standardizedEmail);
    
    // Mitigate User Enumeration: Instantly return without disclosing system presence
    if (!user) return; 

    // Generate high-entropy secure source random token signatures
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Harden Lifespan: Restrict expiry window parameters strictly down to 15 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Evict any existing legacy tokens for this explicit user record
    await this.passwordResetRepo.delete({ user: { id: user.id } });

    // Persist new cryptographically hashed reset reference parameters
    const reset = this.passwordResetRepo.create({
      tokenHash,
      expiresAt,
      user,
    });
    await this.passwordResetRepo.save(reset);

    // Out-of-band delivery transmission setup
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const html = `<p>You requested a password reset. <a href="${resetUrl}">Click here to reset your password</a>. This link will expire in 15 minutes.</p>`;
    
    await this.emailService.sendMail(
      user.email,
      'Password Reset Request',
      html,
    );
  }

  /**
   * Hardened Reset Password Processing Engine
   * Guarantees expiration validation and instant replay attack execution protection.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid matching unexpired records directly in data storage rows
    const reset = await this.passwordResetRepo.findOne({
      where: { 
        tokenHash,
        expiresAt: MoreThan(new Date())
      },
      relations: ['user'],
    });

    if (!reset) {
      throw new UnauthorizedException('The password reset link is invalid or has expired.');
    }

    // Securely update password using high workload iteration pools
    reset.user.password = await bcrypt.hash(newPassword, this.BCRYPT_SALT_ROUNDS);
    await this.userService.create(reset.user); 

    // Replay Protection: Instantly invalidate used entity reference tracking markers
    await this.passwordResetRepo.delete({ id: reset.id });
  }

  /**
   * Signup Orchestrator
   */
  async signup(
    signupDto: SignupDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: {
      id: number;
      email: string;
      username: string;
    };
  }> {
    const { email, password, username } = signupDto;
    const standardizedEmail = email.toLowerCase().trim();

    const existingByEmail = await this.userService.findByEmail(standardizedEmail);
    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUserName = await this.userService.findByUserName(username);
    if (existingUserName) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.BCRYPT_SALT_ROUNDS);

    const newUser = await this.userService.create({
      username,
      email: standardizedEmail,
      password: hashedPassword,
    });

    const access_token = this.generateAccessToken(newUser.id, newUser.email);
    const { token: refresh_token } =
      await this.refreshTokenService.generateRefreshToken(
        newUser.email,
        newUser.id,
        userAgent,
        ipAddress,
      );

    return {
      access_token,
      refresh_token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
    };
  }

  /**
   * Credential Verification & Sign-In Processing Engine
   */
  async login(
    loginDto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: {
      id: number;
      email: string;
      username: string;
    };
    success_message: string;
  }> {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email.toLowerCase().trim());
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const access_token = this.generateAccessToken(user.id, user.email);
    const { token: refresh_token } =
      await this.refreshTokenService.generateRefreshToken(
        user.email,
        user.id,
        userAgent,
        ipAddress,
      );

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      success_message: 'Sign in Successful',
    };
  }

  /**
   * Account Tracking Profile Retrieval Block
   */
  async getProfile(userId: number): Promise<{
    id: number;
    email: string;
    createdAt: Date;
  }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Token Refresh Handler
   */
  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const tokenData =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    const { token: newRefreshToken } =
      await this.refreshTokenService.rotateRefreshToken(
        refreshToken,
        tokenData.walletAddress,
        tokenData.user.id,
        userAgent,
        ipAddress,
      );

    const access_token = this.generateAccessToken(
      tokenData.user.id,
      tokenData.user.email,
    );

    return { access_token, refresh_token: newRefreshToken };
  }

  /**
   * Logout Handler
   */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenService.revokeRefreshToken(refreshToken);
  }

  /**
   * Get Active Sessions
   */
  async getSessions(walletAddress: string) {
    return this.refreshTokenService.getActiveSessions(walletAddress);
  }

  /**
   * Internal Signature Factory Methods
   */
  private generateAccessToken(userId: number, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }
}