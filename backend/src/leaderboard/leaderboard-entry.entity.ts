import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Game } from '../games/entities/game.entity';

@Entity()
@Unique(['user', 'game'])
export class LeaderboardEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @ManyToOne(() => Game, { nullable: false })
  game: Game;

  @Column({ type: 'int', default: 0 })
  totalScore: number;

  @Column({ type: 'int', default: 0 })
  wins: number;

  @Column({ type: 'int', default: 0 })
  totalSessions: number;

  @UpdateDateColumn()
  lastUpdated: Date;
}
