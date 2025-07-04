import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../entities/game.entity';
import { GamesModule } from '../games.module';
import { LetteredBoxController } from './lettered-box.controller';
import { LetteredBoxService } from './lettered-box.service';
import { LetteredBoxStateService } from './lettered-box-state.service';
import { GamesService } from '../games.service';

@Module({
  imports: [TypeOrmModule.forFeature([Game]), forwardRef(() => GamesModule)],
  controllers: [LetteredBoxController],
  providers: [LetteredBoxStateService, LetteredBoxService, GamesService],
  exports: [LetteredBoxStateService, LetteredBoxService, GamesService],
})
export class LetteredBoxModule {}
