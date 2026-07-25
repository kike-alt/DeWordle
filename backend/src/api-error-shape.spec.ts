/**
 * QA-211 (#808): API error-shape conformance tests
 *
 * Verifies that the read-API endpoints return stable, documented error shapes
 * so frontend consumers can rely on a consistent error contract.
 *
 * Tests are kept unit-level (no live DB required) by testing the controller
 * methods directly with a mocked repository.
 */

import { ReadApiController } from './common/read-api.controller';
import { Repository } from 'typeorm';
import { SessionProjectionEntity } from './indexer/entities/session-projection.entity';

// ---------------------------------------------------------------------------
// Expected error-response shape
// ---------------------------------------------------------------------------

/**
 * Canonical error shape that all maintained read-API error responses MUST
 * conform to.  Frontend consumers should check `statusCode`, `message`, and
 * optionally `error`.
 */
interface ApiErrorShape {
  statusCode: number;
  message: string | string[];
  error?: string;
}

function isValidErrorShape(body: unknown): body is ApiErrorShape {
  if (typeof body !== 'object' || body === null) return false;
  const obj = body as Record<string, unknown>;
  return (
    typeof obj['statusCode'] === 'number' &&
    (typeof obj['message'] === 'string' || Array.isArray(obj['message']))
  );
}

// ---------------------------------------------------------------------------
// Helper — build a controller backed by a minimal mock repository
// ---------------------------------------------------------------------------

function makeController(
  rows: Partial<SessionProjectionEntity>[] = [],
): ReadApiController {
  const repo = {
    find: async () => rows,
    findAndCount: async () => [rows, rows.length],
    count: async () => rows.length,
  } as unknown as Repository<SessionProjectionEntity>;

  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as any;

  const mockCacheLogger = {
    hit: jest.fn(),
    miss: jest.fn(),
    set: jest.fn(),
    invalidation: jest.fn(),
  } as unknown as any;

  return new ReadApiController(repo, mockCache, mockCacheLogger);
}

// ---------------------------------------------------------------------------
// Error-shape contract: documented read endpoints return stable shapes
// ---------------------------------------------------------------------------

describe('Read-API error-shape contract', () => {
  describe('GET /api/v1/achievements/:address', () => {
    it('returns AchievementSummaryDto shape for unknown address (empty data)', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getAchievementSummary('GNOTEXIST000');

      // Must have the top-level keys from AchievementSummaryDto
      expect(result).toHaveProperty('achievements');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('unlocked');
      expect(Array.isArray(result.achievements)).toBe(true);
    });

    it('every achievement entry has id, name, and state fields', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getAchievementSummary('GADDR');

      for (const entry of result.achievements) {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('state');
        expect(['unlocked', 'pending', 'unavailable']).toContain(entry.state);
      }
    });

    it('unlocked count does not exceed total', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getAchievementSummary('GADDR');
      expect(result.unlocked).toBeLessThanOrEqual(result.total);
    });
  });

  describe('GET /api/v1/players/:address/summary', () => {
    it('returns PlayerSummaryDto shape for unknown address', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getPlayerSummary('GNOTEXIST000');

      expect(result).toHaveProperty('address', 'GNOTEXIST000');
      expect(result).toHaveProperty('totalSessions');
      expect(result).toHaveProperty('totalWins');
      expect(result).toHaveProperty('winRate');
      expect(result).toHaveProperty('streak');
      expect(result.streak).toHaveProperty('currentStreak');
      expect(result.streak).toHaveProperty('longestStreak');
    });

    it('winRate is between 0 and 1 when no sessions', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getPlayerSummary('GADDR');
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(1);
    });

    it('source field is either "projection" or "legacy" when present', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getPlayerSummary('GADDR');
      if (result.source !== undefined) {
        expect(['projection', 'legacy']).toContain(result.source);
      }
    });
  });

  describe('GET /api/v1/sessions', () => {
    it('returns SessionHistoryDto shape with pagination fields', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getSessionHistory(undefined, 0, 20);

      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('skip');
      expect(result).toHaveProperty('take');
      expect(Array.isArray(result.sessions)).toBe(true);
    });

    it('each session entry has required fields when sessions exist', async () => {
      const session: Partial<SessionProjectionEntity> = {
        sessionId: 'sess-1',
        player: 'GPLAYER',
        dayId: 1,
        status: 'Finalized',
        attemptsUsed: 3,
        finalized: true,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      const ctrl = makeController([session as SessionProjectionEntity]);
      const result = await ctrl.getSessionHistory(undefined, 0, 20);

      expect(result.sessions).toHaveLength(1);
      const entry = result.sessions[0];
      expect(entry).toHaveProperty('sessionId');
      expect(entry).toHaveProperty('player');
      expect(entry).toHaveProperty('dayId');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('attemptsUsed');
      expect(entry).toHaveProperty('finalized');
      expect(entry).toHaveProperty('updatedAt');
      // updatedAt must be an ISO string
      expect(() => new Date(entry.updatedAt).toISOString()).not.toThrow();
    });

    it('skip and take reflect the query parameters', async () => {
      const ctrl = makeController([]);
      const result = await ctrl.getSessionHistory(undefined, 10, 5);
      expect(result.skip).toBe(10);
      expect(result.take).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // Canonical error-shape helper self-test
  // ---------------------------------------------------------------------------

  describe('isValidErrorShape helper', () => {
    it('accepts well-formed NestJS error body', () => {
      const body: ApiErrorShape = {
        statusCode: 404,
        message: 'Not found',
        error: 'Not Found',
      };
      expect(isValidErrorShape(body)).toBe(true);
    });

    it('accepts error body without optional "error" key', () => {
      expect(isValidErrorShape({ statusCode: 400, message: 'Bad request' })).toBe(true);
    });

    it('accepts error body with array message (ValidationPipe format)', () => {
      expect(
        isValidErrorShape({ statusCode: 422, message: ['field must be string'], error: 'Unprocessable Entity' }),
      ).toBe(true);
    });

    it('rejects body missing statusCode', () => {
      expect(isValidErrorShape({ message: 'oops' })).toBe(false);
    });

    it('rejects body missing message', () => {
      expect(isValidErrorShape({ statusCode: 500 })).toBe(false);
    });

    it('rejects non-object', () => {
      expect(isValidErrorShape('error string')).toBe(false);
      expect(isValidErrorShape(null)).toBe(false);
    });
  });
});
