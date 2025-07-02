import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard.guard';
import { Request } from 'express';
import { GameSessionsService } from './game-sessions.service';
import { User } from 'src/auth/entities/user.entity';

@Controller('game-sessions')
export class GameSessionsController {
  constructor(private readonly sessionService: GameSessionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createAuth(@Body() dto: CreateSessionDto, @Req() req: Request) {
    const user = req.user as User;
    return this.sessionService.create(dto, user);
  }

  @Post('guest')
  createGuest(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto, null);
  }
}
