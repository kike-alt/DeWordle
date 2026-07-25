import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('auth_sessions')
export class AuthSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  walletAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastAccessedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
