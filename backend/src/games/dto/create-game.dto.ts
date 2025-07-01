import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateGameDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
