import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get application metrics',
    description:
      'Returns the application performance metrics in Prometheus exposition format. This includes default system metrics such as CPU usage, memory, and event loop lag collected by prom-client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully in text/plain format',
    content: {
      'text/plain': {
        example: `
            # HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
            # TYPE process_cpu_user_seconds_total counter
            process_cpu_user_seconds_total 0.04
        `,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to fetch metrics',
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
