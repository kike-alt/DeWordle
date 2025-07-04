import { Injectable } from '@nestjs/common';

// import { CreatePuzzleDto } from './dto/create-puzzle.dto';
// import { UpdatePuzzleDto } from './dto/update-puzzle.dto';
import { UserGame } from './entities/user-game.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Puzzle } from '../puzzles/entities/puzzle.entity';

@Injectable()
export class UserGamesService {
  constructor(
    @InjectRepository(UserGame)
    private userGamesRepository: Repository<UserGame>,
  ) {}

  findAll() {
    return this.userGamesRepository.find({ order: { updatedDate: 'DESC' } });
  }
}
