import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string;

  @Column()
  wordId: string;

  @Column()
  adminId: string;

  @Column('jsonb')
  details: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
