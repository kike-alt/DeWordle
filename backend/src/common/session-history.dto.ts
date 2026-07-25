import { ApiProperty } from '@nestjs/swagger';

export class SessionHistoryEntryDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'sess_abc123def456',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Player wallet address',
    example: 'GAXPJ42...S5Q2L',
  })
  player: string;

  @ApiProperty({
    description: 'Day / round identifier',
    example: 142,
  })
  dayId: number;

  @ApiProperty({
    description: 'Session status (Finalized, InProgress, etc.)',
    example: 'Finalized',
  })
  status: string;

  @ApiProperty({
    description: 'Number of attempts used',
    example: 4,
  })
  attemptsUsed: number;

  @ApiProperty({
    description: 'Whether the session is finalized',
    example: true,
  })
  finalized: boolean;

  @ApiProperty({
    description: 'ISO timestamp of last update',
    example: '2026-07-25T10:15:00.000Z',
  })
  updatedAt: string;
}

export class SessionHistoryDto {
  @ApiProperty({
    type: [SessionHistoryEntryDto],
    example: [
      {
        sessionId: 'sess_abc123def456',
        player: 'GAXPJ42...S5Q2L',
        dayId: 142,
        status: 'Finalized',
        attemptsUsed: 4,
        finalized: true,
        updatedAt: '2026-07-25T10:15:00.000Z',
      },
    ],
  })
  sessions: SessionHistoryEntryDto[];

  @ApiProperty({
    description: 'Total matching sessions (for pagination)',
    example: 142,
  })
  total: number;

  @ApiProperty({
    description: 'Current page offset',
    example: 0,
  })
  skip: number;

  @ApiProperty({
    description: 'Page size',
    example: 20,
  })
  take: number;
}
