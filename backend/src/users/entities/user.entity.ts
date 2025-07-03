import { Leaderboard } from 'src/games/dewordle/leaderboard/entities/leaderboard.entity';
import { Result } from 'src/games/dewordle/result/entities/result.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Token } from '../../auth/entities/token.entity';

export class UserStats {
  @Column('int', { default: 0 })
  totalPuzzlesCompleted: number;

  @Column('int', { default: 0 })
  totalHintsUsed: number;

  @Column('int', { default: 0 })
  totalSpangramsFound: number;

  @Column('int', { default: 0 })
  currentStreak: number;

  @Column('int', { default: 0 })
  longestStreak: number;

  @Column('date', { nullable: true })
  lastPlayedDate: Date | null;
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { unique: true, nullable: false })
  userName: string;

  @Column('varchar', { unique: true, nullable: false })
  email: string;

  @Column('varchar', { nullable: false })
  password: string;

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => Token, (token) => token.user)
  tokens: Token[];

  @OneToMany(() => Result, (result) => result.user, {
    cascade: true,
  })
  result: Result[];

  @OneToMany(() => Leaderboard, (leaderboard) => leaderboard.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  leaderboard: Leaderboard[];

  // @OneToMany(() => Leaderboard, (leaderboard) => leaderboard.user, {
  //   cascade: true,
  //   onDelete: 'CASCADE',
  // })
  // leaderboards: Leaderboard[];

  // @OneToMany(() => Result, (result) => result.user, {
  //   cascade: true,
  //   onDelete: 'CASCADE',
  // })
  // results: Result[];

  @Column('varchar', { length: 225, nullable: true })
  googleId?: string;

  @Column({ nullable: true })
  lastActivityAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column(() => UserStats)
  userStats: UserStats;
}
