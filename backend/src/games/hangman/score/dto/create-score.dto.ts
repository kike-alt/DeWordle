import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateScoreDto {
  @ApiProperty({ description: 'User ID of the player' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Username of the player' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Score value' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  score: number;

  @ApiProperty({ description: 'The word that was played' })
  @IsNotEmpty()
  @IsString()
  word: string;

  @ApiProperty({ description: 'Category of the word' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ description: 'Length of the word' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  wordLength: number;

  @ApiProperty({ description: 'Number of wrong guesses' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  wrongGuesses: number;

  @ApiProperty({ description: 'Time spent in seconds' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  timeSpent: number;

  @ApiProperty({ description: 'Unique game identifier' })
  @IsOptional()
  @IsString()
  gameId?: string;
}
