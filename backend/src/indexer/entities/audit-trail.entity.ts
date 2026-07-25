import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum AuditAction {
  REGISTRY_CHANGE = 'registry_change',
  CONFIG_UPDATE = 'config_update',
  PAUSE = 'pause',
  UNPAUSE = 'unpause',
  CURSOR_RESET = 'cursor_reset',
  PROJECTIONS_RESET = 'projections_reset',
}

@Entity('audit_trail')
@Index(['action'])
@Index(['actor'])
@Index(['createdAt'])
export class AuditTrailEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  actor: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown>;

  @Column({ nullable: true })
  targetResource: string;

  @Column({ nullable: true })
  network: string;

  @CreateDateColumn()
  createdAt: Date;
}
