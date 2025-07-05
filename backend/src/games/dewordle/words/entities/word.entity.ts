import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('word')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'int' })
  difficulty: number;
}
