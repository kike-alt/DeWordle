import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ingested_events')
@Index(['network', 'txHash', 'eventIndex'], { unique: true })
@Index(['topic'])
@Index(['ledger'])
@Index(['createdAt'])
@Index(['network', 'topic'])
export class IngestedEventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  network: string;

  @Column()
  contractId: string;

  @Column()
  topic: string;

  @Column()
  txHash: string;

  @Column()
  ledger: number;

  @Column()
  eventIndex: number;

  @Column({ nullable: true })
  auditHash?: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
