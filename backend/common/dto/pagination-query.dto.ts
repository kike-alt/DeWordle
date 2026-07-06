import { IsOptional, IsInt, Min, Max, IsString, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100) // Acceptance Criteria: Enforce hard safe page-size limit
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor?: number;

  @IsOptional()
  @IsString()
  @Length(0, 256) // Defends against overflow queries in text fields
  filterTerm?: string;
}