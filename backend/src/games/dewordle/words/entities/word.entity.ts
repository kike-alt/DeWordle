import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 5 })
  text: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'int', default: 1 })
  difficulty: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}