import { ApiProperty } from '@nestjs/swagger';
import { WordDifficulty } from 'src/dewordle/enums/wordDifficulty.enum';

export class WordResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  word: string;

  @ApiProperty({ enum: WordDifficulty })
  difficulty: WordDifficulty;
}
