import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsObject, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

class HintDto {
  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsOptional()
  clue: string
}

export class CreateWordDto {
  @IsString()
  @IsNotEmpty()
  word: string

  @IsString()
  @IsNotEmpty()
  category: string

  @IsString()
  @IsOptional()
  subcategory?: string

  @IsInt()
  @Min(1)
  @Max(3)
  @IsOptional()
  difficulty?: number

  @IsObject()
  @ValidateNested()
  @IsOptional()
  @Type(() => HintDto)
  hints?: {
    description: string
    clue: string
  }
}
