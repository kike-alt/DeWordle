import { IsNotEmpty, IsString, IsBoolean, Length } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class AddWordDto {
  @ApiProperty({
    description: "The word found by the user",
    example: "STRAND",
    minLength: 3,
    maxLength: 20,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 20)
  word: string

  @ApiProperty({
    description: "Whether this word is related to the puzzle theme",
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isThemeWord: boolean
}
