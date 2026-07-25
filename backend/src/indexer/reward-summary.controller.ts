import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RewardSummaryService } from './reward-summary.service';
import { RewardSummaryDto } from '../common/dto/reward-summary.dto';

@ApiTags('Rewards')
@Controller('rewards')
export class RewardSummaryController {
  constructor(private readonly rewardSummaryService: RewardSummaryService) {}

  @Get(':player')
  @ApiOperation({
    summary: 'Get reward summary for a player',
    description:
      'Returns accrued, claimed, and pending-claim token totals derived ' +
      'from on-chain session projection data. The "state" field signals ' +
      'data availability: "unavailable" means no projection rows exist yet.',
  })
  @ApiParam({
    name: 'player',
    description: 'Stellar wallet address of the player',
    example: 'GABC...XYZ',
  })
  @ApiQuery({
    name: 'network',
    description: 'Stellar network',
    enum: ['testnet', 'mainnet'],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Reward summary returned successfully',
    type: RewardSummaryDto,
  })
  async getRewardSummary(
    @Param('player') player: string,
    @Query('network') network: string = 'testnet',
  ): Promise<RewardSummaryDto> {
    return this.rewardSummaryService.getForPlayer(network, player);
  }
}
