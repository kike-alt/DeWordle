import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailEntity, AuditAction } from './entities/audit-trail.entity';

@ApiTags('Audit Trail')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditTrailService) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Query audit trail logs',
    description:
      'Returns paginated audit logs with optional filtering by action, actor, and network.',
  })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'actor', required: false })
  @ApiQuery({ name: 'network', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiOkResponse({
    description: 'Paginated audit trail logs.',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
      },
    },
  })
  async getAuditLogs(
    @Query('action') action?: AuditAction,
    @Query('actor') actor?: string,
    @Query('network') network?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditService.query({
      action,
      actor,
      network,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('logs/:id')
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Returns a single audit trail entry by its ID.',
  })
  @ApiOkResponse({
    description: 'Audit trail entry.',
    type: AuditTrailEntity,
  })
  async getAuditLogById(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findById(id);
  }
}
