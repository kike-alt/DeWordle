import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsNumber, IsObject, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGameDto {
  @ApiProperty({ description: 'The type of game', example: 'hangman' })
  @IsString()
  @IsNotEmpty()
  gameType: string;

  @ApiPropertyOptional({ description: 'User ID playing the game' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Word for word-based games', example: 'apple' })
  @IsString()
  @IsOptional()
  word?: string;

  @ApiPropertyOptional({ description: 'Category of the game', example: 'fruits' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Initial additional state for the game' })
  @IsObject()
  @IsOptional()
  additionalState?: Record<string, any>;
}

export class UpdateGameStateDto {
  @ApiPropertyOptional({ description: 'Updated array of guessed letters', example: ['a', 'e', 'i'] })
  @IsArray()
  @IsOptional()
  guessedLetters?: string[];

  @ApiPropertyOptional({ description: 'Number of wrong guesses', example: 3 })
  @IsNumber()
  @IsOptional()
  wrongGuesses?: number;

  @ApiPropertyOptional({ description: 'Game status', enum: ['IN_PROGRESS', 'WON', 'LOST', 'PAUSED'] })
  @IsEnum(['IN_PROGRESS', 'WON', 'LOST', 'PAUSED'])
  @IsOptional()
  status?: 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED';

  @ApiPropertyOptional({ description: 'Current score', example: 100 })
  @IsNumber()
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({ description: 'Time spent in seconds', example: 120 })
  @IsNumber()
  @IsOptional()
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Additional game-specific state' })
  @IsObject()
  @IsOptional()
  additionalState?: Record<string, any>;
}

export class GameStateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  gameType: string;

  @ApiProperty()
  word: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  guessedLetters: string[];

  @ApiProperty()
  wrongGuesses: number;

  @ApiProperty()
  status: 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED';

  @ApiProperty()
  score: number;

  @ApiProperty()
  timeSpent: number;

  @ApiProperty()
  additionalState: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class LoadGameDto {
  @ApiProperty({ description: 'User ID to load games for' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: 'Game type to filter by', example: 'hangman' })
  @IsString()
  @IsOptional()
  gameType?: string;

  @ApiPropertyOptional({ description: 'Filter by game status', enum: ['IN_PROGRESS', 'WON', 'LOST', 'PAUSED'] })
  @IsEnum(['IN_PROGRESS', 'WON', 'LOST', 'PAUSED'])
  @IsOptional()
  status?: 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED';
}