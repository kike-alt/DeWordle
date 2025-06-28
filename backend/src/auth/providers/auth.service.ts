import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  UseFilters,
  ConflictException,
} from '@nestjs/common';
import { SignInDto } from '../dto/create-auth.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { SignInProvider } from './sign-in.provider';
import { RefreshTokenProvider } from './refresh-token.provider';
import { UsersService } from 'src/users/users.service';
import { AuthExceptionFilter } from 'src/common/filters';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';
import { Token } from 'src/auth/entities/token.entity';
import { TokenType } from 'src/auth/enums/token-type.enum';
import { EmailService } from 'src/mail/providers/email.service';
import { MailService } from 'src/mail/providers/mail.service';
import { SignupDto } from '../dto/sign-up.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
@UseFilters(AuthExceptionFilter) // ✅ Apply AuthExceptionFilter
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly signInProvider: SignInProvider,
    private readonly refreshTokenProvider: RefreshTokenProvider,

    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(Token)
    private tokensRepository: Repository<Token>,
    private configService: ConfigService,
    private mailService: MailService,
    private readonly emailService: EmailService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, walletAddress } = signupDto;

    // Check if email already exists using your existing method
    const existingUserByEmail = await this.usersService.findByEmail(email);
    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if wallet address already exists
    const existingUserByWallet =
      await this.usersService.findByWalletAddress(walletAddress);
    if (existingUserByWallet) {
      throw new ConflictException('Wallet address already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user using your service method
    const user = await this.usersService.createUserForAuth({
      email,
      password: hashedPassword,
      walletAddress,
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email using your existing method
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    };
  }

  public async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      return await this.refreshTokenProvider.refreshToken(refreshTokenDto);
    } catch (error) {
      throw new Error('Refresh token failed'); // The filter will handle this
    }
  }

  async verifyEmail(token: string) {
    // Find token
    const verificationToken = await this.tokensRepository.findOne({
      where: { token, type: TokenType.VERIFICATION },
      relations: ['user'],
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user verification status
    const user = verificationToken.user;
    user.isVerified = true;
    await this.usersRepository.save(user);

    // Remove token
    await this.tokensRepository.remove(verificationToken);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Delete existing verification tokens
    await this.tokensRepository.delete({
      user: { id: user.id },
      type: TokenType.VERIFICATION,
    });

    // Generate new token
    const verificationToken = await this.createToken(
      user.id,
      TokenType.VERIFICATION,
    );

    // Send verification email
    await this.mailService.sendVerificationEmail(
      user.email,
      // verificationToken.token,
    );

    return { message: 'Verification email sent successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete existing reset tokens
    await this.tokensRepository.delete({
      user: { id: user.id },
      type: TokenType.PASSWORD_RESET,
    });

    // Generate new token
    const resetToken = await this.createToken(
      user.id,
      TokenType.PASSWORD_RESET,
    );

    // Send password reset email
    await this.mailService.sendPasswordResetEmail(user.email, resetToken.token);

    return { message: 'Password reset email sent successfully' };
  }

  async resetPassword(token: string, newPassword: string) {
    // Find token
    const resetToken = await this.tokensRepository.findOne({
      where: { token, type: TokenType.PASSWORD_RESET },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Update user password
    const user = resetToken.user;
    user.password = await this.hashPassword(newPassword);
    await this.usersRepository.save(user);

    // Remove token
    await this.tokensRepository.remove(resetToken);

    return { message: 'Password updated successfully' };
  }

  private validatePassword(password: string) {
    // Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
      );
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private async createToken(userId: number, type: TokenType): Promise<Token> {
    const tokenString = randomBytes(32).toString('hex');

    const token = this.tokensRepository.create({
      user: { id: userId },
      token: tokenString,
      type,
      expiresAt: new Date(
        Date.now() + (type === TokenType.PASSWORD_RESET ? 3600000 : 86400000), // 1 hour for password reset, 24 hours for verification
      ),
    });

    return this.tokensRepository.save(token);
  }
}
