import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of records to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of records to skip before returning results',
    default: 0,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Optional filter term applied to results',
  })
  @IsOptional()
  @IsString()
  filterTerm?: string;
}
