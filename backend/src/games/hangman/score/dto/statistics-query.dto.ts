import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StatisticsQueryDto {
  @ApiProperty({ required: false, description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false, description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;
}