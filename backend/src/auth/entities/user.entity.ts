import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 1,
    type: 'integer',
    format: 'int64',
    readOnly: true,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
    format: 'email',
    uniqueItems: true,
    maxLength: 255,
  })
  @Column({ unique: true })
  email: string;

  @ApiProperty({
    description: 'User password (hashed)',
    example: '$2b$10$K7L/VwzAGO0q7n.4JtOF.uF/8F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T',
    writeOnly: true,
    minLength: 6,
  })
  @Exclude({ toPlainOnly: true }) // Exclude password from serialization
  @Column()
  password: string;

  @ApiProperty({
    description: 'Ethereum wallet address (must be unique)',
    example: '0x742d35Cc6634C0532925a3b8D8Cc6f9b2F3d217',
    pattern: '^0x[a-fA-F0-9]{40}$',
    uniqueItems: true,
    maxLength: 42,
    minLength: 42,
  })
  @Column({ unique: true })
  walletAddress: string;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
    readOnly: true,
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2024-01-15T15:45:30.000Z',
    type: 'string',
    format: 'date-time',
    readOnly: true,
  })
  @UpdateDateColumn()
  updatedAt: Date;

  // Optional: Add a method to get user without password
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

// Optional: Create a separate DTO for API responses
export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 1,
    type: 'integer',
  })
  id: number;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6634C0532925a3b8D8Cc6f9b2F3d217',
    pattern: '^0x[a-fA-F0-9]{40}$',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2024-01-15T15:45:30.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;
}
