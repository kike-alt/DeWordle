import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateLeaderboardDto } from './create-leaderboard.dto';
import { IsInt, IsNumber, IsOptional } from 'class-validator';

PartialType(CreateLeaderboardDto);
export class UpdateLeaderboardDto extends PartialType(CreateLeaderboardDto) {
  @ApiProperty({
    description:
      'The ID of the user associated with the leaderboard entry (optional)',
    example: 123,
    required: false,
  })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiProperty({
    description: 'The total number of wins for the user (optional)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  totalWins?: number;

  @ApiProperty({
    description: 'The total number of attempts by the user (optional)',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  totalAttempts?: number;

  @ApiProperty({
    description: 'The average score of the user (optional)',
    example: 85.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  averageScore?: number;
}
