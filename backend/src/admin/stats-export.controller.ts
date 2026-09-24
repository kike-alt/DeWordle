import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { format } from '@fast-csv/format';

interface PlayerStatRow {
  wallet_address: string;
  games_played: number;
  win_rate: number;
  streak: number;
}

@Controller('api/v1/admin/stats')
export class StatsExportController {
  @Get('export')
  export(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="player-stats.csv"');

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    for (const row of this.fetchRowsInChunks()) {
      csvStream.write(row);
    }

    csvStream.end();
  }

  private *fetchRowsInChunks(): Generator<PlayerStatRow> {
    // Placeholder generator; wire to a paginated repository query.
    return;
  }
}
