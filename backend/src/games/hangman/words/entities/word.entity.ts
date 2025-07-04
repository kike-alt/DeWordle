import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class Word {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  word: string

  @Column()
  category: string

  @Column({ nullable: true })
  subcategory: string

  @Column({ default: 1 })
  difficulty: number

  @Column({ default: 0 })
  usageCount: number

  @Column({ type: "json", nullable: true })
  hints: {
    description: string
    clue: string
  }

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
