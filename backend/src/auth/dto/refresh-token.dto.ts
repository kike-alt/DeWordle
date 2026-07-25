import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token from login or previous refresh',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  refreshToken: string;
}
