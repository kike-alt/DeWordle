import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrySnapshotEntity } from '../entities/registry-snapshot.entity';
import { AuditTrailService } from '../audit-trail.service';
import { AuditAction } from '../entities/audit-trail.entity';

export interface RegistrySnapshotInput {
  network: string;
  contractId: string;
  registry: Record<string, unknown>;
  capturedAtLedger?: number;
}

@Injectable()
export class RegistrySnapshotService {
  private readonly logger = new Logger(RegistrySnapshotService.name);

  constructor(
    @InjectRepository(RegistrySnapshotEntity)
    private readonly snapshotRepo: Repository<RegistrySnapshotEntity>,
    private readonly auditService: AuditTrailService,
  ) {}

  async save(input: RegistrySnapshotInput): Promise<RegistrySnapshotEntity> {
    const existing = await this.snapshotRepo.findOne({
      where: { network: input.network, contractId: input.contractId },
    });

    const snapshot = this.snapshotRepo.create({
      id: existing?.id,
      network: input.network,
      contractId: input.contractId,
      registry: input.registry,
      capturedAtLedger:
        input.capturedAtLedger ?? existing?.capturedAtLedger ?? 0,
    });

    const saved = await this.snapshotRepo.save(snapshot);

    await this.auditService.log({
      action: AuditAction.REGISTRY_CHANGE,
      actor: 'indexer',
      network: input.network,
      targetResource: input.contractId,
      details: {
        capturedAtLedger: saved.capturedAtLedger,
        registryKeys: Object.keys(input.registry),
      },
    });

    this.logger.log({
      msg: 'indexer.registry_snapshot.saved',
      network: input.network,
      contractId: input.contractId,
      capturedAtLedger: saved.capturedAtLedger,
    });

    return saved;
  }

  async getLatest(
    network: string,
    contractId: string,
  ): Promise<RegistrySnapshotEntity | null> {
    return this.snapshotRepo.findOne({
      where: { network, contractId },
      order: { updatedAt: 'DESC' },
    });
  }

  async listByNetwork(network: string): Promise<RegistrySnapshotEntity[]> {
    return this.snapshotRepo.find({
      where: { network },
      order: { updatedAt: 'DESC' },
    });
  }
}
