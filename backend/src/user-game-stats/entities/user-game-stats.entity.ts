import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Game } from '../../games/entities/game.entity';

@Entity()
@Unique(['user', 'game'])
export class UserGameStats {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => Game, { eager: true })
  game: Game;

  @Column({ default: 0 })
  points: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  longestStreak: number;

  @Column({ type: 'date', nullable: true })
  lastPlayedDate: string | null;

  @Column({ default: 0 })
  totalGamesPlayed: number;
}
