import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity()
export class Score {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @Index()
  userId: string;

  @Column({ nullable: true })
  username: string;

  @Column()
  @Index()
  score: number;
  
  @Column()
  @Index()
  word: string;
  
  @Column()
  @Index()
  category: string;
  
  @Column()
  wordLength: number;
  
  @Column()
  wrongGuesses: number;
  
  @Column()
  timeSpent: number;

  @Column({ nullable: true })
  gameId: string;

  @Column({ default: false })
  isFlagged: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}