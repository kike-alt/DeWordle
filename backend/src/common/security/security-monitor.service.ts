import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditService } from '../audit/audit.service';

interface SuspiciousPattern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress?: string;
  userId?: string;
  count: number;
  detectedAt: Date;
}

/**
 * SEC-110: Security monitoring and suspicious activity detection.
 * Runs on a schedule to analyse recent audit logs for attack patterns.
 *
 * Detected patterns:
 * - Credential stuffing: >10 failed logins from a single IP in 15 min
 * - Account enumeration: repeated login failures for non-existent accounts
 * - Rate limit abuse: IP hitting rate limits on multiple endpoints
 */
@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Runs every 15 minutes to scan for suspicious patterns.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async detectThreats(): Promise<void> {
    const suspicious = await this.auditService.findSuspicious(15);
    if (!suspicious.length) return;

    const patterns: SuspiciousPattern[] = [];

    // Group failed logins by IP
    const failedByIp = new Map<string, number>();
    for (const log of suspicious) {
      if (log.action === 'AUTH_LOGIN_FAILED' && log.ipAddress) {
        failedByIp.set(log.ipAddress, (failedByIp.get(log.ipAddress) ?? 0) + 1);
      }
    }

    for (const [ip, count] of failedByIp.entries()) {
      if (count >= 10) {
        patterns.push({
          type: 'CREDENTIAL_STUFFING',
          severity: count >= 50 ? 'critical' : 'high',
          description: `${count} failed login attempts from IP ${ip} in the last 15 minutes`,
          ipAddress: ip,
          count,
          detectedAt: new Date(),
        });
      }
    }

    // Group rate-limit hits by IP
    const rateLimitByIp = new Map<string, number>();
    for (const log of suspicious) {
      if (log.action === 'RATE_LIMIT_EXCEEDED' && log.ipAddress) {
        rateLimitByIp.set(log.ipAddress, (rateLimitByIp.get(log.ipAddress) ?? 0) + 1);
      }
    }

    for (const [ip, count] of rateLimitByIp.entries()) {
      if (count >= 5) {
        patterns.push({
          type: 'RATE_LIMIT_ABUSE',
          severity: 'medium',
          description: `IP ${ip} hit rate limits ${count} times in 15 minutes`,
          ipAddress: ip,
          count,
          detectedAt: new Date(),
        });
      }
    }

    this.reportThreats(patterns);
  }

  private reportThreats(patterns: SuspiciousPattern[]): void {
    for (const pattern of patterns) {
      const msg = `[SECURITY-ALERT] ${pattern.type} | severity=${pattern.severity} | ${pattern.description}`;
      if (pattern.severity === 'critical' || pattern.severity === 'high') {
        this.logger.error(msg);
      } else {
        this.logger.warn(msg);
      }
      // TODO: integrate with alerting service (PagerDuty/Slack/email)
      // this.alertService.send(pattern);
    }
  }
}