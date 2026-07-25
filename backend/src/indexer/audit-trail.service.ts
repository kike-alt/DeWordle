import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditTrailEntity, AuditAction } from './entities/audit-trail.entity';

export interface AuditLogInput {
  action: AuditAction;
  actor?: string;
  details?: Record<string, unknown>;
  targetResource?: string;
  network?: string;
}

export interface AuditQueryInput {
  action?: AuditAction;
  actor?: string;
  network?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(
    @InjectRepository(AuditTrailEntity)
    private readonly auditRepo: Repository<AuditTrailEntity>,
  ) {}

  async log(input: AuditLogInput): Promise<AuditTrailEntity> {
    const entry = this.auditRepo.create({
      action: input.action,
      actor: input.actor ?? 'system',
      details: input.details ?? {},
      targetResource: input.targetResource,
      network: input.network,
    });

    const saved = await this.auditRepo.save(entry);

    this.logger.log({
      msg: 'audit.action_logged',
      id: saved.id,
      action: saved.action,
      actor: saved.actor,
      targetResource: saved.targetResource,
    });

    return saved;
  }

  async query(input: AuditQueryInput): Promise<{
    data: AuditTrailEntity[];
    total: number;
  }> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);

    const qb = this.auditRepo.createQueryBuilder('audit');

    if (input.action) {
      qb.andWhere('audit.action = :action', { action: input.action });
    }
    if (input.actor) {
      qb.andWhere('audit.actor = :actor', { actor: input.actor });
    }
    if (input.network) {
      qb.andWhere('audit.network = :network', { network: input.network });
    }

    const [data, total] = await qb
      .orderBy('audit.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: number): Promise<AuditTrailEntity | null> {
    return this.auditRepo.findOne({ where: { id } });
  }
}
