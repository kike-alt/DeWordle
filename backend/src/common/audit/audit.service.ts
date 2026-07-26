import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_TOKEN_REFRESH'
  | 'GAME_GUESS_SUBMITTED'
  | 'GAME_SESSION_CREATED'
  | 'GAME_SESSION_COMPLETED'
  | 'WALLET_CONNECTED'
  | 'WALLET_TRANSACTION'
  | 'ADMIN_CONFIG_CHANGED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SECURITY_SUSPICIOUS_ACTIVITY';

export interface AuditContext {
  userId?: string;
  walletAddress?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * SEC-109: Comprehensive audit logging service.
 * Records security-relevant events to the audit_logs table.
 * All writes are fire-and-forget to avoid blocking the request path.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  log(action: AuditAction, context: AuditContext = {}): void {
    const entry = this.auditRepo.create({
      action,
      userId: context.userId,
      walletAddress: context.walletAddress,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: context.metadata ?? {},
      occurredAt: new Date(),
    });

    // Fire-and-forget — errors are logged but never re-thrown
    this.auditRepo.save(entry).catch((err: Error) => {
      this.logger.error(`Failed to write audit log for ${action}: ${err.message}`);
    });
  }

  async findByUser(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { userId },
      order: { occurredAt: 'DESC' },
      take: limit,
    });
  }

  async findSuspicious(sinceMinutes = 60): Promise<AuditLog[]> {
    const since = new Date(Date.now() - sinceMinutes * 60_000);
    return this.auditRepo
      .createQueryBuilder('audit')
      .where('audit.action IN (:...actions)', {
        actions: [
          'AUTH_LOGIN_FAILED',
          'RATE_LIMIT_EXCEEDED',
          'SECURITY_SUSPICIOUS_ACTIVITY',
        ],
      })
      .andWhere('audit.occurredAt >= :since', { since })
      .orderBy('audit.occurredAt', 'DESC')
      .getMany();
  }
}