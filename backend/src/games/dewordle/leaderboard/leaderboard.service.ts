import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { CreateLeaderboardDto } from './dto/create-leaderboard.dto';
import { UpdateLeaderboardDto } from './dto/update-leaderboard.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Leaderboard } from './entities/leaderboard.entity';
import { UsersService } from 'src/users/users.service';
import { DatabaseErrorException } from '../../../common/exceptions/database-error.exception';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,

    @Inject(forwardRef(() => UsersService))
    private readonly userServices: UsersService,
  ) {}
  async createLeaderboard(
    createLeaderboardDto: CreateLeaderboardDto,
  ): Promise<Leaderboard> {
    const user = await this.userServices.findOneById(
      createLeaderboardDto.userId,
    );
    if (!user) {
      throw new Error('User not found');
    }
    const leaderboardEntry = this.leaderboardRepository.create({
      ...createLeaderboardDto,
      user,
    });
    return this.leaderboardRepository.save(leaderboardEntry);
  }

  async findAll(): Promise<Leaderboard[]> {
    try {
      const leaderboardEntries = await this.leaderboardRepository.find({
        relations: ['user'],
      });

      if (!leaderboardEntries.length) {
        throw new NotFoundException('No leaderboard entries found');
      }
      return leaderboardEntries;
    } catch (error) {
      throw new DatabaseErrorException('Failed to fetch leaderboard entries');
    }
  }

  public async getAllLeaderboard(
    createLeaderboardDto: CreateLeaderboardDto,
    limit: number,
    page: number,
  ): Promise<Leaderboard[]> {
    return await this.leaderboardRepository.find();
  }

  public async getOneLeaderboardBy(id: number): Promise<Leaderboard> {
    if (!id || typeof id !== 'number') {
      throw new BadRequestException(
        `Invalid id provided. Please provide a valid id.`,
      );
    }

    const leaderboardEntry = await this.leaderboardRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!leaderboardEntry) {
      throw new NotFoundException(`Leaderboard entry with id ${id} not found.`);
    }

    if (!leaderboardEntry.user) {
      throw new NotFoundException(
        `User associated with leaderboard entry id ${id} does not exist.`,
      );
    }
    return leaderboardEntry;
  }

  async findOne(id: number): Promise<Leaderboard> {
    try {
      const leaderboardEntry = await this.leaderboardRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!leaderboardEntry) {
        throw new NotFoundException(
          `Leaderboard entry with ID ${id} not found`,
        );
      }

      return leaderboardEntry;
    } catch (error) {
       console.log(`Service: LeaderboardService: findOne - ${error.message}`, { error });
      throw new DatabaseErrorException('Failed to fetch leaderboard entry');
    }
  }

  public async deleteLeaderboard(
    id: number,
  ): Promise<{ delete: boolean; id: number }> {
    if (!id || typeof id !== 'number') {
      throw new BadRequestException(
        `Invalid id provided. Please provide a valid id.`,
      );
    }

    // Fetch the leaderboard entry along with user
    const leaderboardEntry = await this.leaderboardRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!leaderboardEntry) {
      throw new NotFoundException(`Leaderboard entry with id ${id} not found.`);
    }

    // Check if the associated user exists
    if (!leaderboardEntry.user) {
      throw new NotFoundException(
        `User associated with leaderboard entry id ${id} does not exist.`,
      );
    }

    // delete the leaderboard entry
    const deleteResult = await this.leaderboardRepository.delete(id);
    if (deleteResult.affected === 0) {
      throw new DatabaseErrorException('Failed to delete leaderboard entry');
    }

    return { delete: true, id };
  }

  async update(
    id: number,
    updateDto: UpdateLeaderboardDto,
  ): Promise<Leaderboard> {
    const existingEntry = await this.leaderboardRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!existingEntry) {
      throw new NotFoundException(`Leaderboard entry with ID ${id} not found`);
    }

    try {
      const updateData = {
        totalWins: updateDto.totalWins,
        totalAttempts: updateDto.totalAttempts,
        averageScore: updateDto.averageScore,
        user: updateDto.userId ? { id: updateDto.userId } : undefined,
      };
      const mergedEntry = this.leaderboardRepository.merge(
        existingEntry,
        updateData,
      );
      return await this.leaderboardRepository.save(mergedEntry);
    } catch {
      throw new DatabaseErrorException('Failed to update leaderboard entry');
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const result = await this.leaderboardRepository.delete(id);

      if (!result.affected) {
        throw new NotFoundException(
          `Leaderboard entry with ID ${id} not found`,
        );
      }

      return { message: 'Leaderboard entry deleted successfully' };
    } catch (error) {
         console.log(`Service: LeaderboardService: remove - ${error.message}`, { error });
      throw new DatabaseErrorException('Failed to delete leaderboard entry');
    }
  }


  async getUserScoreAndRank(gameId: number, userId: number) {
  const leaderboard = await this.leaderboardRepository.find({
    where: { gameId },
    order: { averageScore: 'DESC' },
    relations: ['user'],
  });

  if (!leaderboard.length) {
    throw new NotFoundException(`No leaderboard entries for game ${gameId}`);
  }

  const userIndex = leaderboard.findIndex((entry) => entry.user.id === userId);
  if (userIndex === -1) {
    throw new NotFoundException(
      `User with ID ${userId} not found in leaderboard for game ${gameId}`,
    );
  }

  return {
    rank: userIndex + 1,
    totalUsers: leaderboard.length,
    score: leaderboard[userIndex].averageScore,
    totalWins: leaderboard[userIndex].totalWins,
    totalAttempts: leaderboard[userIndex].totalAttempts,
  };
}

async getTopLeaderboardForGame(gameId: number, limit: number = 10) {
  const topUsers = await this.leaderboardRepository.find({
    where: { gameId },
    order: { averageScore: 'DESC' },
    take: limit,
    relations: ['user'],
  });

  return topUsers.map((entry, index) => ({
    rank: index + 1,
    user: {
      id: entry.user.id,
      name: entry.user.userName,
      email: entry.user.email,
    },
    averageScore: entry.averageScore,
    totalWins: entry.totalWins,
    totalAttempts: entry.totalAttempts,
  }));
}

}
