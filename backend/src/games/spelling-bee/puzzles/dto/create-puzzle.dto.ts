import { IsString, IsDateString, Length } from 'class-validator';

export class CreatePuzzleDto {
  @IsString()
  @Length(7, 7)
  letters: string;

  @IsString()
  @Length(1, 1)
  centerLetter: string;

  @IsDateString()
  date: string;
}
