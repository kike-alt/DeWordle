import { ApiProperty } from '@nestjs/swagger';

export class IndexerHealthcheckDto {
  @ApiProperty({
    description: 'Overall liveness status of the indexer worker.',
    example: 'alive',
  })
  status: 'alive' | 'stale' | 'down';

  @ApiProperty({
    description: 'Current depth of the in-memory event queue.',
    example: 12,
  })
  queueDepth: number;

  @ApiProperty({
    description: 'Maximum configured queue buffer size.',
    example: 500,
  })
  queueMaxSize: number;

  @ApiProperty({
    description: 'Seconds elapsed since the last successful poll tick.',
    example: 8,
  })
  secondsSinceLastTick: number;

  @ApiProperty({
    description: 'ISO 8601 timestamp of the most recent poll tick.',
    example: '2026-07-27T10:00:00.000Z',
  })
  lastTickAt: string | null;

  @ApiProperty({
    description: 'Cumulative ingested events since process start.',
    example: 1200,
  })
  ingestedTotal: number;

  @ApiProperty({
    description: 'Cumulative projection errors since process start.',
    example: 0,
  })
  projectionErrors: number;
}
