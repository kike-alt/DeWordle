import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm"
import { User } from "../../../../users/entities/user.entity"
import { Puzzle } from "../../../../puzzle/entities/puzzle.entity"

@Entity("strands_sessions")
@Index(["userId", "puzzleId"], { unique: true }) // Ensure one session per user per puzzle
@Index(["userId"]) // For efficient user queries
@Index(["puzzleId"]) // For efficient puzzle queries
@Index(["isCompleted"]) // For filtering completed sessions
export class Session {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: "user_id", nullable: false })
  @Index()
  userId: number

  @Column({ name: "puzzle_id", nullable: false })
  @Index()
  puzzleId: number

  @Column("simple-array", { name: "found_words", default: "" })
  foundWords: string[]

  @Column("simple-array", { name: "non_theme_words", default: "" })
  nonThemeWords: string[]

  @Column({ name: "earned_hints", type: "int", default: 0, nullable: false })
  earnedHints: number

  @Column({ name: "active_hint", type: "varchar", length: 255, nullable: true })
  activeHint: string | null

  @Column({ name: "is_completed", type: "boolean", default: false, nullable: false })
  @Index()
  isCompleted: boolean

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date

  // Relations
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: "user_id" })
  user: User

  @ManyToOne(() => Puzzle, { eager: false })
  @JoinColumn({ name: "puzzle_id" })
  puzzle: Puzzle

  // Computed properties
  get totalWordsFound(): number {
    return this.foundWords.length + this.nonThemeWords.length
  }

  get themeWordsCount(): number {
    return this.foundWords.length
  }

  get nonThemeWordsCount(): number {
    return this.nonThemeWords.length
  }

  get hasActiveHint(): boolean {
    return this.activeHint !== null
  }

  get completionPercentage(): number {
    // This would need to be calculated based on the total expected words in the puzzle
    // For now, returning a placeholder calculation
    return this.isCompleted ? 100 : Math.min((this.foundWords.length / 8) * 100, 99)
  }
}
