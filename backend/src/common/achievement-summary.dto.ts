import { ApiProperty } from '@nestjs/swagger';

export type AchievementState = 'unlocked' | 'pending' | 'unavailable';

export class AchievementEntryDto {
  @ApiProperty({
    description: 'Unique achievement identifier',
    example: 'first_win',
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable achievement name',
    example: 'First Win',
  })
  name: string;

  @ApiProperty({
    enum: ['unlocked', 'pending', 'unavailable'] as AchievementState[],
    example: 'unlocked',
  })
  state: AchievementState;

  @ApiProperty({
    description: 'ISO timestamp when unlocked, if applicable',
    required: false,
    example: '2026-07-25T10:30:00.000Z',
  })
  unlockedAt?: string;
}

export class AchievementSummaryDto {
  @ApiProperty({
    type: [AchievementEntryDto],
    example: [
      { id: 'first_win', name: 'First Win', state: 'unlocked', unlockedAt: '2026-07-25T10:30:00.000Z' },
      { id: 'streak_3', name: '3-Day Streak', state: 'pending' },
    ],
  })
  achievements: AchievementEntryDto[];

  @ApiProperty({
    description: 'Total number of achievements',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'Number of unlocked achievements',
    example: 2,
  })
  unlocked: number;
}
