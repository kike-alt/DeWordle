import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StrandsService } from '../providers/strands.service';
import { CreateStrandDto } from '../dto/create-strand.dto';
import { UpdateStrandDto } from '../dto/update-strand.dto';

@Controller('strands')
export class StrandsController {
  constructor(private readonly strandsService: StrandsService) {}

  @Post()
  create(@Body() createStrandDto: CreateStrandDto) {
    return this.strandsService.create(createStrandDto);
  }

  @Get()
  findAll() {
    return this.strandsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.strandsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStrandDto: UpdateStrandDto) {
    return this.strandsService.update(+id, updateStrandDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.strandsService.remove(+id);
  }
}
