import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Puzzle } from '../../puzzles/entities/puzzle.entity';
import { User } from 'src/users/entities/user.entity';

@Entity({ name: 'spelling_bee_user_game' })
export class UserGame {
  @PrimaryGeneratedColumn()
  id: number;

  // @Column('integer')
  // @ManyToOne(() => Puzzle, (puzzle) => puzzle.userGames)
  // @JoinColumn({ name: 'puzzle_id' })
  @ManyToOne(() => Puzzle, (puzzle) => puzzle.userGames, {
    onDelete: 'CASCADE',
  })
  puzzle: Puzzle;

  @ManyToOne(() => User)
  user: User;

  @Column({
    type: 'json',
    nullable: true,
    transformer: {
      to(value: string[]): string {
        return JSON.stringify(value);
      },
      from(value: string): string[] {
        return JSON.parse(value);
      },
    },
  })
  foundWords: string[];

  @UpdateDateColumn()
  updatedDate: Date;
}
