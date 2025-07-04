import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Patch,
  ParseIntPipe,
  NotFoundException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { ScoreService } from '../providers/score.service';
import { LeaderboardService } from '../providers/leaderboard.service';
import { StatisticsService } from '../providers/statistics.service';
import { CreateScoreDto, LeaderboardQueryDto, StatisticsQueryDto } from '../dto';
import { Score } from '../entities/score.entity';
import { LeaderboardResponse } from '../interfaces/leaderboardResponse.interface';
import { TimeFrame } from '../enums/timeFrame.enum';
import { PlayerStatistics } from '../interfaces/statistics.interface';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from 'src/admin/guards/admin-jwt-auth.guard';

@ApiTags('scores')
@Controller('scores')
export class ScoreController {
  constructor(
    private readonly scoreService: ScoreService,
    private readonly leaderboardService: LeaderboardService,
    private readonly statisticsService: StatisticsService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new score' })
  @ApiResponse({ status: 201, description: 'Score submitted successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid score submission.' })
  async submitScore(@Body() createScoreDto: CreateScoreDto): Promise<Score> {
    return this.scoreService.create(createScoreDto);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: 200, description: 'Return leaderboard.' })
  async getLeaderboard(@Query() query: LeaderboardQueryDto): Promise<LeaderboardResponse> {
    const { category, timeframe, page = 1, limit = 10 } = query;
    return this.leaderboardService.getLeaderboard(
      category, 
      timeframe as TimeFrame, 
      page, 
      limit
    );
  }

  @Get('user/:userId/top')
  @ApiOperation({ summary: 'Get top scores for a specific user' })
  @ApiResponse({ status: 200, description: 'Return user top scores.' })
  async getUserTopScores(
    @Param('userId') userId: string,
    @Query('limit') limit = 10
  ): Promise<Score[]> {
    return this.leaderboardService.getUserTopScores(userId, limit);
  }

  @Get('statistics/player')
  @ApiOperation({ summary: 'Get player statistics' })
  @ApiResponse({ status: 200, description: 'Return player statistics.' })
  async getPlayerStatistics(@Query() query: StatisticsQueryDto): Promise<PlayerStatistics> {
    const { userId, category } = query;
    return this.statisticsService.getPlayerStatistics(userId, category);
  }

  @Get('statistics/global')
  @ApiOperation({ summary: 'Get global game statistics' })
  @ApiResponse({ status: 200, description: 'Return global statistics.' })
  async getGlobalStatistics(@Query('category') category?: string): Promise<any> {
    return this.statisticsService.getGlobalStatistics(category);
  }

  @Patch(':id/flag')
  @UseGuards(JwtAuthGuard, AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Flag a suspicious score (admin only)' })
  @ApiResponse({ status: 200, description: 'Score flagged successfully.' })
  @ApiResponse({ status: 404, description: 'Score not found.' })
  async flagScore(@Param('id', ParseIntPipe) id: number): Promise<Score> {
    try {
      return await this.scoreService.flagSuspiciousScore(id);
    } catch (error) {
      throw new NotFoundException(`Score with ID ${id} not found`);
    }
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, AdminJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a flagged score (admin only)' })
  @ApiResponse({ status: 200, description: 'Score verified successfully.' })
  @ApiResponse({ status: 404, description: 'Score not found.' })
  async verifyScore(@Param('id', ParseIntPipe) id: number): Promise<Score> {
    try {
      return await this.scoreService.verifyScore(id);
    } catch (error) {
      throw new NotFoundException(`Score with ID ${id} not found`);
    }
  }
}