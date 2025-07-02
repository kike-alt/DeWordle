import { IsInt, IsOptional, IsJSON, IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
  @IsInt()
  gameId: number;

  @IsInt()
  score: number;

  @IsInt()
  durationSeconds: number;

  @IsOptional()
  metadata?: Record<string, any>;
}