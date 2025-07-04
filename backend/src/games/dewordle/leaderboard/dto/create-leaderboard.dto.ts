import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Result } from 'src/games/dewordle/result/entities/result.entity';
export class CreateLeaderboardDto {
  @ApiProperty({
    description: 'The unique identifier of the leaderboard entry (optional)',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  readonly id?: number;

  @ApiProperty({
    description: 'The ID of the user associated with the leaderboard entry',
    example: 123,
    required: true,
  })
  @IsInt()
  readonly userId: number;

  @ApiProperty({
    description: 'The total number of wins for the user',
    example: 10,
    required: true,
  })
  @IsInt()
  readonly totalWins: number;

  @ApiProperty({
    description: 'The total number of attempts by the user',
    example: 20,
    required: true,
  })
  @IsInt()
  readonly totalAttempts: number;

  @ApiProperty({
    description: 'The average score of the user',
    example: 85.5,
    required: true,
  })
  @IsNumber()
  readonly averageScore: number;

  @IsInt()
@IsNotEmpty()
gameId: number;


  // @ApiProperty({
  //   description: 'An array of results associated with the user',
  //   type: [Result],
  //   example: [
  //     {
  //       id: 1,
  //       score: 90,
  //       date: '2023-10-01',
  //     },
  //     {
  //       id: 2,
  //       score: 80,
  //       date: '2023-10-02',
  //     },
  //   ],
  //   required: true,
  // })
  // @IsArray()
  // readonly results: Result[];
}
