import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultService } from './result.service';
import { ResultController, StatusResultController } from './result.controller';
import { Result } from './entities/result.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Result, User])],
  controllers: [ResultController, StatusResultController],
  providers: [ResultService],
  exports: [ResultService, TypeOrmModule],
})
export class ResultModule {}
