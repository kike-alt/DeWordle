import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Persists a point-in-time snapshot of the Soroban contract registry for a
 * given network. Backend services that need the latest known registry state
 * read from this table instead of making live RPC calls, making them resilient
 * to transient network outages.
 *
 * One row per (network, contractId) — upserted on every successful registry
 * fetch so the table always reflects the most recently observed state.
 */
@Entity('registry_snapshots')
@Index(['network', 'contractId'], { unique: true })
export class RegistrySnapshotEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  network: string;

  @Column()
  contractId: string;

  /** Raw registry payload as returned by the Soroban SDK. */
  @Column({ type: 'jsonb' })
  registry: Record<string, unknown>;

  /** Ledger sequence number at which this snapshot was captured. */
  @Column({ default: 0 })
  capturedAtLedger: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
