import { IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateResultDto {
  @ApiProperty({
    description: 'The UUID of the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Whether the user won the game',
    example: true,
    required: true,
  })
  @IsBoolean()
  won: boolean;
}
