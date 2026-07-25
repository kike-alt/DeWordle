import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('indexer_cursors')
@Index(['network', 'streamKey'], { unique: true })
@Index(['lastLedger'])
@Index(['updatedAt'])
export class IndexerCursorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  network: string;

  @Column()
  streamKey: string;

  @Column({ default: 0 })
  lastLedger: number;

  @Column({ default: '' })
  lastTxHash: string;

  @Column({ default: 0 })
  lastEventIndex: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
