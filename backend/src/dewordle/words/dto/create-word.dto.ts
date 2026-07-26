import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateWordDto {
  @ApiProperty({
    example: 'apple',
    description: 'The word to be created',
  })
  @IsString()
  @MinLength(1)
  word: string;
}
