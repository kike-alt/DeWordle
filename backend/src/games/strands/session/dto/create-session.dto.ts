import { IsNotEmpty, IsNumber, IsPositive } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class CreateSessionDto {
  @ApiProperty({
    description: "The ID of the user starting the session",
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  userId: number

  @ApiProperty({
    description: "The ID of the puzzle to play",
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  puzzleId: number
}
