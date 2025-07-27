import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Word } from '../../entities/word.entity';

export interface GuessResult {
  letter: string;
  status: 'correct' | 'present' | 'absent';
}

export interface GuessHistory {
  guess: string;
  result: GuessResult[];
  timestamp: Date;
}

@Entity('wordle_sessions')
export class WordleSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @ManyToOne(() => Word, { nullable: false })
  targetWord: Word;

  @Column('json', { default: [] })
  guessHistory: GuessHistory[];

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isWon: boolean;

  @Column({ default: 6 })
  attemptsRemaining: number;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
