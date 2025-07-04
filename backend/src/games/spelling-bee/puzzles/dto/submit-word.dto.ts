import { IsString, Length } from 'class-validator';

export class SubmitWordDto {
  @IsString()
  word: string;
}
