import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 5 })
  word: string;

  @Column()
  definition: string;

  @Column()
  example: string;

  @Column()
  partOfSpeech: string;

  @Column({ nullable: true })
  phonetics?: string;

  @Column({ default: false })
  isDaily: boolean;

  @Column({ type: 'date', nullable: true })
  dailyDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
