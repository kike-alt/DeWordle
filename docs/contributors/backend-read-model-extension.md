# Backend Read-Model Extension Guide: Adding New Projections

This guide provides a standardized pattern for backend contributors to add new projections and read endpoints to the DeWordle backend's indexer system. The pattern ensures consistency, replay safety, and maintainability across all read models.

## Overview
The backend's indexer system processes Soroban events into materialized views (projections) that power read APIs. Projections are built on a foundation of idempotent event processing, schema versioning, and replay safety.

## Prerequisites
Before adding a new projection, ensure you understand:
- The event schema from the Soroban contract that will feed your projection
- The query patterns your read endpoint needs to support
- The existing indexer foundation in [`BACKEND_INDEXER_FOUNDATION.md`](../BACKEND_INDEXER_FOUNDATION.md)

## Step 1: Define Your Projection Entity
First, create a new TypeORM entity for your projection in `backend/src/indexer/entities/`. This defines your database schema.

### Entity Requirements
- Include standard fields: `id`, `network`, `schemaVersion`, `updatedAt`
- Add database indexes for all queryable fields
- Implement unique constraints where appropriate
- Follow the existing pattern in [`session-projection.entity.ts`](../../backend/src/indexer/entities/session-projection.entity.ts)

```typescript
// Example entity structure (based on SessionProjectionEntity)
import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('your_projection_name')
@Index(['network', 'uniqueField'], { unique: true }) // Unique constraint
@Index(['queryableField1']) // Index for common queries
@Index(['network', 'queryableField2']) // Composite index
export class YourProjectionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  network: string; // Required: identifies which Soroban network this is from

  // Add your custom fields here
  @Column()
  yourField: string;

  /**
   * Schema version of this projection row. Compared against
   * CURRENT_PROJECTION_VERSION at read time to detect stale rows that need
   * a migration pass before being served to consumers.
   */
  @Column({ default: 1 })
  schemaVersion: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Concrete Example:** [`SessionProjectionEntity`](../../backend/src/indexer/entities/session-projection.entity.ts)

## Step 2: Update Projection Version (If Needed)
If you're modifying an existing projection's schema, increment the `CURRENT_PROJECTION_VERSION` in [`projection-version.ts`](../../backend/src/indexer/projections/projection-version.ts). This triggers reprocessing of stale rows.

## Step 3: Create Your Projection Service
Create a service that processes incoming events and updates your projection. Add this in `backend/src/indexer/projections/` or extend the existing `ProjectionService`.

### Projection Service Requirements
- Implement idempotent `apply()` method that can safely replay events
- Use upsert pattern to handle reprocessing
- Validate all event payload fields
- Set `schemaVersion` to `CURRENT_PROJECTION_VERSION` on save
- Log warnings for invalid events

```typescript
// Example projection service apply method
async apply(event: IngestedEventDto, context?: IndexerLogContext): Promise<boolean> {
  // Only process events relevant to this projection
  if (event.topic !== 'your_event_topic') {
    return false;
  }

  // Extract and validate required fields from event payload
  const requiredField = this.readStringField(event.payload, 'requiredField');
  if (!requiredField) {
    this.logger.warn({
      msg: 'indexer.projection.skipped',
      correlationId: context?.correlationId,
      reason: 'missing_required_field',
      txHash: event.txHash,
    });
    return false;
  }

  // Upsert: check for existing record
  const existing = await this.yourRepo.findOne({
    where: { network: event.network, uniqueField: requiredField },
  });

  // Create or update projection
  const projection = this.yourRepo.create({
    id: existing?.id,
    network: event.network,
    yourField: this.readStringField(event.payload, 'yourField'),
    schemaVersion: CURRENT_PROJECTION_VERSION,
  });

  await this.yourRepo.save(projection);
  return true;
}
```

**Concrete Example:** [`ProjectionService.apply()`](../../backend/src/indexer/projections/projection.service.ts#L31-L68)

## Step 4: Register Your Entity and Service
Add your entity to the TypeORM configuration and inject your projection service into `EventProcessorService` so it receives events.

1. Add your entity to `indexer.module.ts` imports
2. Inject your projection service into `EventProcessorService`
3. Call your projection's `apply()` method in the event processing pipeline

## Step 5: Create DTOs for Your Read Endpoint
Define Data Transfer Objects (DTOs) in `backend/src/common/` that describe the response shape for your read API. Use NestJS Swagger decorators for API documentation.

### DTO Requirements
- Use class-validator decorators for validation
- Include ApiProperty decorators for Swagger documentation
- Keep response shapes minimal and focused on client needs

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class YourSummaryDto {
  @ApiProperty({ description: 'Total count of items' })
  totalCount: number;

  @ApiProperty({ description: 'Sum of calculated values' })
  totalValue: number;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdatedAt?: string;
}
```

**Concrete Example:** [`RewardSummaryDto`](../../backend/src/common/dto/reward-summary.dto.ts)

## Step 6: Implement Your Read Service
Create a service that queries your projection and transforms the data into your DTO shape. This separates business logic from controller routing.

### Read Service Requirements
- Encapsulate all database queries
- Transform raw entity data into DTO format
- Handle edge cases (no data found, etc.)
- Include any calculation logic (scoring, aggregation, etc.)

**Concrete Example:** [`RewardSummaryService.getForPlayer()`](../../backend/src/indexer/reward-summary.service.ts#L45-L77)

## Step 7: Add Read Endpoint to ReadApiController
Add your endpoint to `backend/src/common/read-api.controller.ts` to keep all projection-backed read APIs in one place.

### Controller Requirements
- Add @ApiTags('Read API (Projection-backed)') to maintain grouping
- Include comprehensive @ApiOperation and @ApiOkResponse decorations
- Use standard route patterns: `/api/v1/resource/:parameter`
- Inject your read service or repository
- Return properly typed DTOs

```typescript
@Get('your-resource/:address')
@ApiOperation({
  summary: 'Get your resource summary for a player',
  description: 'Returns aggregated data from your projection.',
})
@ApiOkResponse({ type: YourSummaryDto })
async getYourSummary(
  @Param('address') address: string,
): Promise<YourSummaryDto> {
  return this.yourService.getForPlayer('testnet', address);
}
```

**Concrete Example:** [`ReadApiController.getPlayerSummary()`](../../backend/src/common/read-api.controller.ts#L83-L120)

## Step 8: Write Tests
Add comprehensive tests for all new components:

### Test Requirements
1. **Projection Service Tests**: Verify idempotency, event filtering, and correct state updates
2. **Read Service Tests**: Verify query logic, edge cases, and DTO transformation
3. **API Tests**: Verify endpoint accessibility, response shapes, and error handling
4. Add test fixtures for your entities

**Concrete Example:** [`projection.service.spec.ts`](../../backend/src/indexer/projections/projection.service.spec.ts)

## Step 9: Create Database Migration (If Needed)
If your projection requires a new database table or schema changes, generate a TypeORM migration:

```bash
# Generate migration
npm run migration:generate -- src/migrations/CreateYourProjectionTable

# Run migration
npm run migration:run
```

## Step 10: Update Documentation
- Add your new projection to the indexer documentation
- Update any relevant architecture documents
- Ensure your code is properly commented with JSDoc for complex logic

## Replay Safety Considerations
- All projections must be safely replayable: reprocessing the same event should not corrupt state
- Use database transactions for complex multi-row updates
- Include `schemaVersion` to handle schema evolution
- Always use upsert patterns to avoid duplicate records

## Query Performance Best Practices
- Add database indexes for all fields used in WHERE clauses
- Keep queries efficient: avoid N+1 queries, use joins where appropriate
- Limit result sets for list endpoints to prevent performance issues
- Consider pagination for large datasets

## Existing Projection Examples to Reference
1. **Session Projection**: Tracks finalized game sessions - [`session-projection.entity.ts`](../../backend/src/indexer/entities/session-projection.entity.ts)
2. **Reward Summary**: Calculates player rewards from session data - [`reward-summary.service.ts`](../../backend/src/indexer/reward-summary.service.ts)
3. **Leaderboard**: Aggregates player rankings - [`leaderboard.service.ts`](../../backend/src/leaderboard/leaderboard.service.ts)

## Troubleshooting
- If your projection isn't receiving events, check that the event topic matches and your service is registered in EventProcessorService
- If you see stale data, verify that schema versioning is working correctly
- If you have performance issues, check that you have the necessary database indexes
- Use the indexer reset script to clear and reprocess all events: `npm run reset-indexer`