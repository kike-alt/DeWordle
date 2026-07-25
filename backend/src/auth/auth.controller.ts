import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/sign-up.dto';
import { JwtAuthGuard } from './guards/jwt-guard.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send a password reset email to the user.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Forgot password request',
    examples: {
      example1: {
        summary: 'Valid email',
        value: { email: 'user@example.com' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'If that email exists, a reset link has been sent.',
    schema: {
      example: { message: 'If that email exists, a reset link has been sent.' },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email'],
        error: 'Bad Request',
      },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using a valid token.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Reset password request',
    examples: {
      example1: {
        summary: 'Valid reset',
        value: { token: 'reset-token', password: 'newStrongPassword123' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password has been reset successfully.',
    schema: { example: { message: 'Password has been reset successfully.' } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'token must be a string',
          'password must be longer than or equal to 8 characters',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired reset token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid or expired reset token',
        error: 'Unauthorized',
      },
    },
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password has been reset successfully.' };
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description: 'Register a new user with email, password, and wallet address',
  })
  @ApiBody({
    type: SignupDto,
    description: 'User registration data',
    examples: {
      example1: {
        summary: 'Valid signup data',
        value: {
          email: 'user@example.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email or wallet address already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email already exists',
        error: 'Conflict',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'email must be an email',
          'password must be longer than or equal to 6 characters',
        ],
        error: 'Bad Request',
      },
    },
  })
  async signup(
    @Body() signupDto: SignupDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') ipAddress?: string,
  ) {
    return this.authService.signup(signupDto, userAgent, ipAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      example1: {
        summary: 'Valid login credentials',
        value: {
          email: 'user@example.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
          walletAddress: '0x742d35Cc6634C0532925a3b8D8Cc6f9b2F3d217',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be an email', 'password should not be empty'],
        error: 'Bad Request',
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') ipAddress?: string,
  ) {
    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: "Retrieve the authenticated user's profile information",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        walletAddress: '0x742d35Cc6634C0532925a3b8D8Cc6f9b2F3d217',
        createdAt: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  async getProfile(@Request() req: ExpressRequest & { user: { id: number } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange a valid refresh token for a new access token and refresh token.',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token request',
    examples: {
      example1: {
        summary: 'Valid refresh token',
        value: { refreshToken: 'a1b2c3d4e5f6...' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'a1b2c3d4e5f6...',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('x-forwarded-for') ipAddress?: string,
  ) {
    return this.authService.refreshTokens(
      dto.refreshToken,
      userAgent,
      ipAddress,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout and invalidate refresh token',
    description: 'Revokes the provided refresh token to end the session.',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token to revoke',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
    schema: { example: { message: 'Logged out successfully' } },
  })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List active sessions',
    description: 'Returns all active sessions for the authenticated wallet.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active sessions retrieved',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getSessions(@Request() req: ExpressRequest & { user: { id: number; email: string } }) {
    return this.authService.getSessions(req.user.email);
  }
}
