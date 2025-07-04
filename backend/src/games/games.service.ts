import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  create(createGameDto: CreateGameDto) {
    const game = this.gameRepo.create(createGameDto);
    return this.gameRepo.save(game);
  }

  findAll() {
    return this.gameRepo.find({ where: { is_active: true } });
  }

  async update(id: number, updateGameDto: UpdateGameDto) {
    const game = await this.gameRepo.findOneBy({ id });
    if (!game) throw new NotFoundException('Game not found');
    Object.assign(game, updateGameDto);
    return this.gameRepo.save(game);
  }

  async remove(id: number) {
    const game = await this.gameRepo.findOneBy({ id });
    if (!game) throw new NotFoundException('Game not found');
    return this.gameRepo.remove(game);
  }
}
