import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { UpdateStatusResultDto } from './dto/status-result.dto';
import { Response as Res } from 'express';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ResultService {
  constructor(
    @InjectRepository(Result)
    private readonly resultRepository: Repository<Result>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createResult(userId: string): Promise<Result> {
    try {
      const userIdNumber = parseInt(userId, 10);
      if (isNaN(userIdNumber)) {
        throw new BadRequestException(`Invalid userId: ${userId}`);
      }

      const user = await this.userRepository.findOne({
        where: { id: userIdNumber },
      });
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const existingResult = await this.resultRepository.findOne({
        where: { user: { id: userIdNumber } },
      });

      if (existingResult) {
        throw new Error('Result already exists for this user.');
      }

      const newResult = this.resultRepository.create({
        user,
        attempts: 0,
        timesPlayed: 0,
        currentStreak: 0,
        maxStreak: 0,
        winPercentage: 0.0,
        wins: 0,
      });

      return await this.resultRepository.save(newResult);
    } catch (error) {
      throw new Error(`Error creating result: ${error.message}`);
    }
  }

  async findAll(res: Res): Promise<void> {
    try {
      const results = await this.resultRepository.find({
        relations: ['user'],
      });
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async findOne(id: number, res: Res): Promise<void> {
    try {
      const result = await this.resultRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!result) {
        res.status(404).json({ message: `Result not found for ID: ${id}` });
        return;
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateResult(
    userId: string,
    updateResultDto: UpdateResultDto,
  ): Promise<Result> {
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber)) {
      throw new BadRequestException(`Invalid userId: ${userId}`);
    }

    const result = await this.resultRepository.findOne({
      where: { user: { id: userIdNumber } },
    });
    if (!result) {
      throw new NotFoundException(`Result entry for user ${userId} not found`);
    }

    // Always increment the number of games played
    result.timesPlayed++;

    if (updateResultDto.won) {
      result.currentStreak++;
      // Increment wins to calculate win percentage later.
      result.wins = (result.wins || 0) + 1;
      // Update maxStreak if the current streak exceeds it
      if (result.currentStreak > result.maxStreak) {
        result.maxStreak = result.currentStreak;
      }
    } else {
      // Reset current streak on loss
      result.currentStreak = 0;
    }

    // Recalculate win percentage
    result.winPercentage = (result.wins / result.timesPlayed) * 100;

    return await this.resultRepository.save(result);
  }

  async updateResults(
    userId: string,
    updateResultDto: UpdateStatusResultDto,
    res: Res,
  ): Promise<void> {
    try {
      const userIdNumber = parseInt(userId, 10);
      if (isNaN(userIdNumber)) {
        res.status(400).json({ message: `Invalid userId: ${userId}` });
        return;
      }

      const result = await this.resultRepository.findOne({
        where: { user: { id: userIdNumber } },
      });

      if (!result) {
        res
          .status(404)
          .json({ message: `Result not found for userId: ${userId}` });
        return;
      }

      Object.assign(result, updateResultDto);
      const updatedResult = await this.resultRepository.save(result);
      res.status(200).json(updatedResult);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.resultRepository.findOne({ where: { id } });
    if (!result) {
      throw new NotFoundException(`Result with id ${id} not found`);
    }

    await this.resultRepository.delete(id);
    return { message: `Result with id ${id} has been deleted` };
  }

  async removeResults(userId: string, res: Res): Promise<void> {
    try {
      const userIdNumber = parseInt(userId, 10);
      if (isNaN(userIdNumber)) {
        res.status(400).json({ message: `Invalid userId: ${userId}` });
        return;
      }

      const result = await this.resultRepository.findOne({
        where: { user: { id: userIdNumber } },
      });

      if (!result) {
        res
          .status(404)
          .json({ message: `Result not found for userId: ${userId}` });
        return;
      }

      await this.resultRepository.remove(result);
      res.status(200).json({ message: 'Result removed successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
