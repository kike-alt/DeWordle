import { PartialType } from '@nestjs/swagger';
import { CreateStrandDto } from './create-strand.dto';

export class UpdateStrandDto extends PartialType(CreateStrandDto) {}
