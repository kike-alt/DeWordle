import { IsNotEmpty, IsString, Length } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class UseHintDto {
  @ApiProperty({
    description: "The hint word to reveal",
    example: "THREAD",
    minLength: 3,
    maxLength: 20,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 20)
  hintWord: string
}
