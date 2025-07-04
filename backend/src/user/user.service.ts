import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto } from './dto/update-user.dto';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    return this.userRepository.save(this.userRepository.create(userData));
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  // Additional methods needed by the controller
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    // Strict validation: only allow username and avatarUrl
    const allowedFields = ['username', 'avatarUrl'];
    for (const key of Object.keys(updateUserDto)) {
      if (!allowedFields.includes(key)) {
        throw new BadRequestException(`Field '${key}' is immutable or not allowed to be updated.`);
      }
    }
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  // Profile management methods
  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<User> {
    try {
      const allowedFields = ['username', 'avatarUrl'];
      for (const key of Object.keys(updateProfileDto)) {
        if (!allowedFields.includes(key)) {
          throw new BadRequestException(`Field '${key}' is immutable or not allowed to be updated.`);
        }
      }

      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if ('username' in updateProfileDto) {
        if (typeof updateProfileDto.username !== 'string' || !updateProfileDto.username.trim()) {
          throw new BadRequestException('Username must be a non-empty string');
        }
        user.username = updateProfileDto.username;
      }
      if ('avatarUrl' in updateProfileDto) {
        if (typeof updateProfileDto.avatarUrl !== 'string' || !updateProfileDto.avatarUrl.trim()) {
          throw new BadRequestException('AvatarUrl must be a non-empty string');
        }
        user.avatarUrl = updateProfileDto.avatarUrl;
      }

      await this.userRepository.save(user);
      return user;
    } catch (err) {
      throw new BadRequestException('Error updating user profile: ' + (err?.message || err));
    }
  }

  async getUserById(id: number): Promise<User | null> {
    return this.findById(id);
  }
}
