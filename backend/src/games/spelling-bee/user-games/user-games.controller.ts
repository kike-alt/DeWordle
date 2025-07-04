import { Controller, Get } from '@nestjs/common';

import { UserGamesService } from './user-games.service';

@Controller('spelling-bee/user-games')
export class UserGamesController {
  constructor(private readonly usergamesService: UserGamesService) {}

  @Get()
  findAll() {
    return this.usergamesService.findAll();
  }
}
