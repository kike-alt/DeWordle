import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Game {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  gameType: string; // 'dewordle', 'spelling-bee', 'hangman'

  @Column({ nullable: true })
  word: string;
  
  @Column({ nullable: true })
  category: string;

  @Column('simple-array', { nullable: true })
  guessedLetters: string[];

  @Column({ nullable: true })
  wrongGuesses: number;
  
  @Column({ type: 'json', nullable: true })
  additionalState: Record<string, any>; // Game-specific state as JSON

  @Column({ default: 'IN_PROGRESS' })
  status: 'IN_PROGRESS' | 'WON' | 'LOST' | 'PAUSED';
  
  @Column({ default: 0 })
  score: number;
  
  @Column({ nullable: true })
  timeSpent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}