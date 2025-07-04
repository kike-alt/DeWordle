import { IsArray, ArrayMinSize, IsString, ArrayMaxSize } from 'class-validator';

export class CreateLetteredBoxDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  top: string[];

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  right: string[];

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  bottom: string[];

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  left: string[];
}
