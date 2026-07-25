import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlayerStreakDto {
  @ApiProperty({
    description: 'Current consecutive day streak',
    example: 5,
  })
  currentStreak: number;

  @ApiProperty({
    description: 'Longest consecutive day streak ever achieved',
    example: 12,
  })
  longestStreak: number;

  @ApiProperty({
    description: 'ISO date of last played session',
    required: false,
    example: '2026-07-25T07:00:00.000Z',
  })
  lastPlayedAt?: string;
}

export class PlayerSummaryDto {
  @ApiProperty({
    description: 'Player wallet address',
    example: 'GAXPJ42...S5Q2L',
  })
  address: string;

  @ApiProperty({
    description: 'Total sessions played',
    example: 42,
  })
  totalSessions: number;

  @ApiProperty({
    description: 'Total wins',
    example: 30,
  })
  totalWins: number;

  @ApiProperty({
    description: 'Win rate as a decimal (0-1)',
    example: 0.714,
  })
  winRate: number;

  @ApiProperty({ type: PlayerStreakDto })
  streak: PlayerStreakDto;

  @ApiPropertyOptional({
    description: 'Data source freshness indicator',
    example: 'projection',
  })
  source?: 'projection' | 'legacy';
}
