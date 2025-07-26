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

  @Column({ unique: true, length: 5 })
  @Index()
  word: string;

  @Column({ nullable: true })
  definition?: string;

  @Column({ nullable: true })
  example?: string;

  @Column({ nullable: true })
  partOfSpeech?: string;

  @Column({ nullable: true })
  phonetics?: string;

  @Column({ default: false })
  @Index()
  isEnriched: boolean;

  @Column({ default: false })
  isDaily: boolean;

  @Column({ type: 'date', nullable: true })
  dailyDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
