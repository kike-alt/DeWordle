import { PartialType } from '@nestjs/swagger';
import { CreateLetteredBoxDto } from './create-lettered-box.dto';

export class UpdateLetteredBoxDto extends PartialType(CreateLetteredBoxDto) {}
