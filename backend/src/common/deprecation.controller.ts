import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  getDeprecationMap,
  getActiveEndpoints,
  getTransitionalEndpoints,
  getDeprecatedEndpoints,
  type EndpointEntry,
} from './deprecation-map';
import { Deprecated } from './deprecated.decorator';

@ApiTags('Deprecation Map')
@Controller('api/v1/deprecation')
export class DeprecationController {
  @Get()
  @Deprecated('v1', '2026-12-31')
  @ApiOperation({
    summary: 'Get deprecation map for all pre-Soroban REST endpoints',
    description:
      'Returns a catalog of all backend REST endpoints with their active, transitional, or deprecated status.',
  })
  @ApiOkResponse({ description: 'Full deprecation map' })
  getAll(): EndpointEntry[] {
    return getDeprecationMap();
  }

  @Get('active')
  @Deprecated('v1', '2026-12-31')
  @ApiOperation({ summary: 'Get active (stable) endpoints' })
  getActive(): EndpointEntry[] {
    return getActiveEndpoints();
  }

  @Get('transitional')
  @Deprecated('v1', '2026-12-31')
  @ApiOperation({ summary: 'Get transitional endpoints' })
  getTransitional(): EndpointEntry[] {
    return getTransitionalEndpoints();
  }

  @Get('deprecated')
  @Deprecated('v1', '2026-12-31')
  @ApiOperation({ summary: 'Get deprecated endpoints' })
  getDeprecated(): EndpointEntry[] {
    return getDeprecatedEndpoints();
  }
}
