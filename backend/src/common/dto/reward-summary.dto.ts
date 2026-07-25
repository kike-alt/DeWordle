import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Represents the state of a player's on-chain reward balance.
 * 'unavailable' signals that projection data is not yet indexed for this player.
 */
export type RewardFieldState = 'available' | 'pending' | 'unavailable';

export class RewardSummaryDto {
  @ApiProperty({
    description:
      'Total reward tokens accrued by the player across all sessions',
    example: 1500,
  })
  accrued: number;

  @ApiProperty({
    description: 'Total reward tokens already claimed by the player',
    example: 500,
  })
  claimed: number;

  @ApiProperty({
    description:
      'Tokens accrued but not yet claimed (accrued − claimed). ' +
      'May lag on-chain state by one indexer poll cycle.',
    example: 1000,
  })
  pendingClaim: number;

  @ApiProperty({
    description:
      'Number of finalized sessions that contributed to accrued rewards',
    example: 12,
  })
  sessionCount: number;

  @ApiProperty({
    description:
      'Data availability state. "unavailable" means no projection data has ' +
      'been indexed for this player yet.',
    enum: ['available', 'pending', 'unavailable'],
    example: 'available',
  })
  state: RewardFieldState;

  @ApiPropertyOptional({
    description:
      'ISO timestamp of the most recently indexed session for this player',
    example: '2026-06-26T07:00:00.000Z',
  })
  lastUpdatedAt?: string;
}
