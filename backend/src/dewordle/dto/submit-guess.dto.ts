import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitGuessDto {
  @ApiProperty({
    description: 'The 5-letter word guess',
    example: 'AUDIO',
    minLength: 5,
    maxLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 5, { message: 'Guess must be exactly 5 letters long' })
  guess: string;
}
