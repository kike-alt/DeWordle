import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

const SHUTDOWN_GRACE_MS = 10_000;

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private activeJobs = 0;

  trackJobStart(): void {
    this.activeJobs += 1;
  }

  trackJobEnd(): void {
    this.activeJobs = Math.max(0, this.activeJobs - 1);
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Received ${signal}, waiting for ${this.activeJobs} active job(s)`);
    const deadline = Date.now() + SHUTDOWN_GRACE_MS;

    while (this.activeJobs > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    this.logger.log('Shutdown grace period complete');
  }
}
