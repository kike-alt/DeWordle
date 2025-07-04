import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserGame } from '../../user-games/entities/user-game.entity';

@Entity({ name: 'spelling_bee_puzzle' })
export class Puzzle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  letters: string;

  @Column()
  centerLetter: string;

  @Column()
  date: Date;

  @OneToMany(() => UserGame, (userGame) => userGame.puzzle)
  userGames: UserGame[];
}
