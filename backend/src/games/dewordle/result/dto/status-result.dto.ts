import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

export class CreateStatusResultDto {
  @ApiProperty({
    description: 'The ID of the user',
    example: 'user-123',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'The number of times the user has played',
    example: 10,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timesPlayed: number = 0;

  @ApiProperty({
    description: 'The current streak of wins',
    example: 3,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStreak: number = 0;

  @ApiProperty({
    description: 'The maximum streak of wins',
    example: 5,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStreak: number = 0;

  @ApiProperty({
    description: 'The win percentage of the user (0.0 to 100.0)',
    example: 75.5,
    required: false,
    default: 0.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(100.0)
  winPercentage: number = 0.0;
}

export class UpdateStatusResultDto extends PartialType(CreateStatusResultDto) {}
