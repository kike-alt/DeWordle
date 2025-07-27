import { GameSession } from '../../game-sessions/entities/game-session.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @OneToMany(() => GameSession, (session) => session.game)
  sessions: GameSession[];

  @Column()
  type: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
