import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsDate,
} from 'class-validator';
export class CreateResultDto {
  @ApiProperty({
    description: 'The unique identifier of the result',
    example: 1,
  })
  @IsInt()
  readonly id: number;

  @ApiProperty({
    description: 'The ID of the user associated with the result',
    example: 123,
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  readonly userId: number;

  @ApiProperty({
    description: 'The number of attempts made',
    example: 3,
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  readonly attempts: number;

  @ApiProperty({
    description: 'The date when the game was played (optional)',
    example: '2023-10-01T12:34:56.789Z',
    required: false,
  })
  @IsDate()
  @IsOptional()
  readonly gameDate: Date;
}
