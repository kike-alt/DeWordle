import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength, Matches, IsUrl } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Username for the user',
    example: 'gamer123',
    maxLength: 50,
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'username must contain only alphanumeric characters, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'URL to user avatar image',
    example: 'https://example.com/avatar.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['http', 'https'] }, {
    message: 'avatarUrl must be a valid HTTP or HTTPS URL',
  })
  @MaxLength(500)
  avatarUrl?: string;
}
