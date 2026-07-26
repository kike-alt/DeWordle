import { WordStatus } from '../dewordle/enums/wordStatus.enum';
import { WordDifficulty } from '../dewordle/enums/wordDifficulty.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  @Index()
  word: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isEnriched: boolean;

  @Column({ nullable: true })
  definition?: string;

  @Column({ nullable: true })
  example?: string;

  @Column({ nullable: true })
  partOfSpeech?: string;

  @Column({ nullable: true })
  phonetics?: string;

  @Column({ default: false })
  isDaily: boolean;

  @Column({ type: 'date', nullable: true })
  dailyDate?: Date;

  @Column({
    type: 'enum',
    enum: WordDifficulty,
    nullable: true,
  })
  difficulty: WordDifficulty;

  @Column({
    type: 'enum',
    enum: WordStatus,
    default: WordStatus.PENDING,
  })
  status: WordStatus;

  @Column({ type: 'float', nullable: true })
  qualityScore?: number;

  @Column('text', { array: true, nullable: true })
  sources?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
