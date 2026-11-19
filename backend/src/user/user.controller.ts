import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Res,
  ParseIntPipe,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-guard.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { toPublicUserDto, toUserDto } from '../common/dto/response-mappers';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return toUserDto(await this.userService.create(createUserDto));
  }

  @Get()
  async findAll() {
    // Public listing: no emails or wallet addresses.
    return (await this.userService.findAll()).map(toPublicUserDto);
  }

  @Get(':address/avatar')
  async getAvatar(
    @Param('address') address: string,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const user = await this.userService.findByWalletAddress(address);
    if (user?.avatarUrl && this.userService.isSafeAvatarUrl(user.avatarUrl)) {
      res.redirect(user.avatarUrl);
      return;
    }
    res.type('image/svg+xml').send(this.userService.getAvatarSvg(address));
  }

  /**
   * GET /users/:id — returns the user or 404. Merged from the duplicate
   * findOne + getUserById handlers that previously both mapped to @Get(':id').
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return toPublicUserDto(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current user profile',
    description: "Update the authenticated user's profile information",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile updated successfully',
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
  async updateProfile(
    @Request() req: ExpressRequest & { user: { id: number } },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return toUserDto(
      await this.userService.updateProfile(req.user.id, updateProfileDto),
    );
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updated = await this.userService.update(id, updateUserDto);
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return toUserDto(updated);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
