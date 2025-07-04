import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class LetteredBoxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('jsonb')
  board: {
    top: string[];
    right: string[];
    bottom: string[];
    left: string[];
  };

  @Column('text', { array: true })
  submittedWords: string[];

  @Column()
  wordCount: number;

  @Column()
  isValid: boolean;

  @CreateDateColumn()
  playedAt: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number;
}
