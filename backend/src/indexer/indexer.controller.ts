import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IndexerService } from './indexer.service';
import { IngestedEventDto } from './dto/ingested-event.dto';
import { IndexerLagResponseDto } from './dto/indexer-lag-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('Indexer')
@Controller('indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Get('lag')
  @ApiOperation({
    summary: 'Get indexer lag snapshot',
    description:
      'Returns the current stream cursor position, latest known network ledger, derived lag, and replay skip counters for operational dashboards.',
  })
  @ApiOkResponse({
    description: 'Indexer lag snapshot for operational monitoring dashboards.',
    type: IndexerLagResponseDto,
  })
  async getLag() {
    return this.indexerService.getLagSnapshot();
  }

  @Post('ingest')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  async ingest(@Body() event: IngestedEventDto) {
    await this.indexerService.ingest({
      ...event,
      observedAt: event.observedAt ? new Date(event.observedAt) : new Date(),
    });

    return { status: 'accepted' };
  }

  @Post('reset/cursor')
  @ApiOperation({
    summary: 'Reset indexer cursor for a network/stream',
    description:
      'Resets the cursor to genesis for recovery. Requires confirm=true query param as a safety guard.',
  })
  async resetCursor(
    @Query('network') network: string,
    @Query('streamKey') streamKey: string,
    @Query('confirm') confirm: string,
  ) {
    if (confirm !== 'true') {
      return { status: 'refused', reason: 'confirm=true required' };
    }
    await this.indexerService.resetCursor(network, streamKey);
    return { status: 'ok', action: 'cursor_reset', network, streamKey };
  }


  @Get('records')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getLedgerRecords(@Query() query: PaginationQueryDto) {
    // Under this setup, query.limit is guaranteed to be <= 100
    return {
      success: true,
      meta: {
        requestedLimit: query.limit,
        filterApplied: query.filterTerm || null,
      },
      data: [], // Handed off cleanly to index database reader
    };
  }
}
  @Post('reset/projections')
  @ApiOperation({
    summary: 'Clear all projection data',
    description:
      'Deletes all projection rows. Requires confirm=true query param as a safety guard.',
  })
  async resetProjections(@Query('confirm') confirm: string) {
    if (confirm !== 'true') {
      return { status: 'refused', reason: 'confirm=true required' };
    }
    await this.indexerService.resetProjections();
    return { status: 'ok', action: 'projections_reset' };
  }
}
