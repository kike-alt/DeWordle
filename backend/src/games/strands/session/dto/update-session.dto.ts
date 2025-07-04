import { PartialType } from "@nestjs/mapped-types"
import { IsOptional, IsArray, IsString, IsNumber, IsBoolean, Min } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"
import { CreateSessionDto } from "./create-session.dto"

export class UpdateSessionDto extends PartialType(CreateSessionDto) {
  @ApiPropertyOptional({
    description: "Array of theme words found by the user",
    example: ["STRAND", "THREAD", "FIBER"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foundWords?: string[]

  @ApiPropertyOptional({
    description: "Array of non-theme words found by the user",
    example: ["WORD", "GAME", "PLAY"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nonThemeWords?: string[]

  @ApiPropertyOptional({
    description: "Number of hints earned by the user",
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  earnedHints?: number

  @ApiPropertyOptional({
    description: "Currently active hint word",
    example: "THREAD",
  })
  @IsOptional()
  @IsString()
  activeHint?: string | null

  @ApiPropertyOptional({
    description: "Whether the session is completed",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean
}
