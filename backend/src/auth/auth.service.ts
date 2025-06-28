import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';
import { SignupDto } from './dto/sign-up.dto';
import { LoginDto } from './dto/login.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{
    access_token: string;
    user: {
      id: number;
      email: string;
      walletAddress: string;
    };
  }> {
    const { email, password, walletAddress } = signupDto;

    // Check if email already exists
    const existingByEmail = await this.userService.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if wallet address already exists
    const existingByWallet =
      await this.userService.findByWalletAddress(walletAddress);
    if (existingByWallet) {
      throw new ConflictException('Wallet address already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await this.userService.create({
      email,
      password: hashedPassword,
      walletAddress,
    });

    const token = this.generateToken(newUser.id, newUser.email);

    return {
      access_token: token,
      user: {
        id: newUser.id,
        email: newUser.email,
        walletAddress: newUser.walletAddress,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    user: {
      id: number;
      email: string;
      walletAddress: string;
    };
  }> {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
    };
  }

  async getProfile(userId: number): Promise<{
    id: number;
    email: string;
    walletAddress: string;
    createdAt: Date;
  }> {
    const user = await this.userService.findById(userId);
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

  private generateToken(userId: number, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
