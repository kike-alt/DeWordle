import { PartialType } from '@nestjs/mapped-types';
import { CreatePuzzleDto } from './create-puzzle.dto';

export class UpdatePuzzleDto extends PartialType(CreatePuzzleDto) {}
