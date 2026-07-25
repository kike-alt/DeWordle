import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IndexerCursorSnapshotDto {
  @ApiProperty({
    description: 'Most recently checkpointed ledger for this stream.',
    example: 248120,
  })
  lastLedger: number;

  @ApiProperty({
    description: 'Last processed transaction hash stored in the cursor.',
    example: '7f0c8a32b6f4d10d2a9ecb90df7c8f4af1cfc9890c17cdb7d07af01d9b83f1c2',
  })
  lastTxHash: string;

  @ApiProperty({
    description: 'Last processed contract event index within the transaction.',
    example: 2,
  })
  lastEventIndex: number;

  @ApiPropertyOptional({
    description: 'Timestamp of the latest cursor checkpoint update.',
    example: '2026-05-29T12:34:56.000Z',
  })
  updatedAt?: Date;
}

export class IndexerLagResponseDto {
  @ApiProperty({
    description: 'Network currently being indexed.',
    example: 'testnet',
  })
  network: string;

  @ApiProperty({
    description: 'Logical stream key for the cursor snapshot.',
    example: 'core_game_events',
  })
  streamKey: string;

  @ApiProperty({
    description: 'Checkpointed cursor snapshot for the indexed stream.',
    type: IndexerCursorSnapshotDto,
  })
  cursor: IndexerCursorSnapshotDto;

  @ApiProperty({
    description:
      'Convenience field mirroring cursor.lastTxHash for dashboards.',
    example: '7f0c8a32b6f4d10d2a9ecb90df7c8f4af1cfc9890c17cdb7d07af01d9b83f1c2',
  })
  lastProcessedTxHash: string;

  @ApiPropertyOptional({
    description:
      'Latest ledger sequence reported by Soroban RPC for the configured network.',
    example: 248145,
    nullable: true,
  })
  networkLatestLedger: number | null;

  @ApiPropertyOptional({
    description:
      'Derived ledger lag between the network latest ledger and the cursor ledger. Null when the RPC snapshot is unavailable.',
    example: 25,
    nullable: true,
  })
  lagLedgers: number | null;

  @ApiProperty({
    description: 'Number of replayed events skipped by the indexer.',
    example: 3,
  })
  replaySkips: number;

  @ApiProperty({
    description: 'Total events successfully ingested by the current process.',
    example: 1200,
  })
  ingestedTotal: number;

  @ApiProperty({
    description: 'Total projection errors observed by the current process.',
    example: 1,
  })
  projectionErrors: number;

  @ApiProperty({
    description: 'Total poll cycles executed by the current process.',
    example: 44,
  })
  pollCycles: number;
}
