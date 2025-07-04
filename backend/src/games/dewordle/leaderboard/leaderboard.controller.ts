import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  DefaultValuePipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { CreateLeaderboardDto } from './dto/create-leaderboard.dto';
import { UpdateLeaderboardDto } from './dto/update-leaderboard.dto';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { RolesGuard } from 'security/guards/rolesGuard/roles.guard';
import { RoleDecorator } from 'security/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/users-roles.enum';

@ApiTags('Leaderboard') // Group all endpoints under the 'Leaderboard' tag
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new leaderboard entry' })
  @ApiResponse({
    status: 201,
    description: 'Leaderboard entry created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiBody({ type: CreateLeaderboardDto })
  @UseGuards(RolesGuard)
  @RoleDecorator(UserRole.Admin)
  async createleadboard(@Body() createLeaderboardDto: CreateLeaderboardDto) {
    return await this.leaderboardService.createLeaderboard(
      createLeaderboardDto,
    );
  }

  @Get('/leaderboard/:id')
  async findOneLeaderboardBy(id: number) {
    return this.leaderboardService.getOneLeaderboardBy(id);
  }
  @Delete('/leaderboard/:id')
  async deleteLeaderboard(@Query('id', ParseIntPipe) id: number) {
    return this.leaderboardService.deleteLeaderboard(id);
  }

  @Get('/leaderboard')
  async findAllLeaderboard(
    @Param() createLeaderboardDto: CreateLeaderboardDto,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.leaderboardService.getAllLeaderboard(
      createLeaderboardDto,
      limit,
      page,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all leaderboard entries' })
  @ApiResponse({
    status: 200,
    description: 'List of all leaderboard entries',
  })
  @UseGuards(RolesGuard)
  @RoleDecorator(UserRole.Admin, UserRole.SubAdmin, UserRole.User)
  findAll() {
    return this.leaderboardService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a leaderboard entry by ID' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard entry details',
  })
  @ApiResponse({
    status: 404,
    description: 'Leaderboard entry not found',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the leaderboard entry',
    example: 1,
  })
  @UseGuards(RolesGuard)
  @RoleDecorator(UserRole.Admin, UserRole.SubAdmin)
  findOne(@Param('id') id: string) {
    return this.leaderboardService.findOne(+id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a leaderboard entry by ID' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard entry updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Leaderboard entry not found',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the leaderboard entry',
    example: 1,
  })
  @ApiBody({ type: UpdateLeaderboardDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLeaderboardDto,
  ) {
    return this.leaderboardService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a leaderboard entry by ID' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard entry deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Leaderboard entry not found',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the leaderboard entry',
    example: 1,
  })
  @UseGuards(RolesGuard)
  @RoleDecorator(UserRole.Admin)
  remove(@Param('id') id: string) {
    return this.leaderboardService.remove(+id);
  }

  @Get('/game/:gameId/user/:userId/score')
@UseGuards(RolesGuard)
@RoleDecorator(UserRole.Admin, UserRole.SubAdmin, UserRole.User)
async getUserScoreAndRank(
  @Param('gameId', ParseIntPipe) gameId: number,
  @Param('userId', ParseIntPipe) userId: number,
) {
  return this.leaderboardService.getUserScoreAndRank(gameId, userId);
}

@Get('/game/:gameId/top')
@UseGuards(RolesGuard)
@RoleDecorator(UserRole.Admin, UserRole.SubAdmin, UserRole.User)
async getTopLeaderboardForGame(
  @Param('gameId', ParseIntPipe) gameId: number,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
) {
  return this.leaderboardService.getTopLeaderboardForGame(gameId, limit);
}

}
