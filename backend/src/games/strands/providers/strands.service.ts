import { Injectable } from '@nestjs/common';
import { CreateStrandDto } from '../dto/create-strand.dto';
import { UpdateStrandDto } from '../dto/update-strand.dto';

@Injectable()
export class StrandsService {
  create(createStrandDto: CreateStrandDto) {
    return 'This action adds a new strand';
  }

  findAll() {
    return `This action returns all strands`;
  }

  findOne(id: number) {
    return `This action returns a #${id} strand`;
  }

  update(id: number, updateStrandDto: UpdateStrandDto) {
    return `This action updates a #${id} strand`;
  }

  remove(id: number) {
    return `This action removes a #${id} strand`;
  }
}
