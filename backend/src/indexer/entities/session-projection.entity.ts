import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('session_projections')
@Index(['network', 'sessionId'], { unique: true })
@Index(['player'])
@Index(['dayId'])
@Index(['status'])
@Index(['network', 'player'])
@Index(['network', 'status'])
export class SessionProjectionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  network: string;

  @Column()
  sessionId: string;

  @Column()
  player: string;

  @Column()
  dayId: number;

  @Column()
  status: string;

  @Column({ default: 0 })
  attemptsUsed: number;

  @Column({ default: false })
  finalized: boolean;

  /**
   * Schema version of this projection row. Compared against
   * CURRENT_PROJECTION_VERSION at read time to detect stale rows that need
   * a migration pass before being served to consumers.
   */
  @Column({ default: 1 })
  schemaVersion: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
