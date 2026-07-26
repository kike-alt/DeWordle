import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('rejected_words')
export class RejectedWord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  word: string;

  @Column('text', { array: true })
  reasons: string[];

  @Column({ nullable: true })
  suggestedReplacement?: string;

  @CreateDateColumn()
  rejectedAt: Date;
}
