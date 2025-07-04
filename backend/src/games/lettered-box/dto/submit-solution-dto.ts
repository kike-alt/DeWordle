import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class SubmitSolutionDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  words: string[];
}
