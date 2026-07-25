import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JobService } from './job.service';
import { JOB_QUEUES, JobQueueName } from './job.constants';

@ApiTags('jobs')
@Controller('jobs')
export class JobMonitorController {
  constructor(private readonly jobService: JobService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get job queue statistics' })
  async getStats() {
    return this.jobService.getQueueStats();
  }

  @Get('dead-letter/:queue')
  @ApiOperation({ summary: 'Get dead-letter jobs for a specific queue' })
  async getDeadLetter(@Param('queue') queue: string) {
    const validQueues = Object.values(JOB_QUEUES);
    if (!validQueues.includes(queue as JobQueueName)) {
      return { error: `Invalid queue. Valid queues: ${validQueues.join(', ')}` };
    }
    const jobs = await this.jobService.getDeadLetterJobs(
      queue as JobQueueName,
    );
    return jobs.map((job) => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }
}
