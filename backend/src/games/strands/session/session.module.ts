import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { User } from "../../../users/entities/user.entity"
import { Puzzle } from "../../../puzzle/entities/puzzle.entity"
import { Session } from "./entities/session.entity"
import { SessionController } from "./session.controller"
import { SessionService } from "./session.service"

@Module({
  imports: [TypeOrmModule.forFeature([Session, User, Puzzle])],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
