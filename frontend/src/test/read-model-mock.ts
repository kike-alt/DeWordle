/**
 * read-model-mock.ts — QA-202 (#799)
 *
 * Reusable mocking helpers for backend read-model responses consumed by
 * frontend hooks and route components.
 *
 * USAGE
 * -----
 * In any Vitest test file:
 *
 *   import { mockReadModel, resetReadModelMocks } from '@/test/read-model-mock';
 *   import { afterEach, beforeEach } from 'vitest';
 *
 *   beforeEach(() => {
 *     mockReadModel({
 *       sessions: { sessions: [...], total: 1, skip: 0, take: 20 },
 *       dayConfig: { dayId: 1, maxAttempts: 6, closesAt: 9999999999 },
 *     });
 *   });
 *
 *   afterEach(() => resetReadModelMocks());
 *
 * The helper stubs:
 *   - `global.fetch` — used by route pages that call the backend REST API
 *   - `@dewordle/soroban-sdk` — used by hooks that read contract state
 *
 * Both stubs are reset automatically when you call `resetReadModelMocks()`.
 */

import { vi, type Mock } from 'vitest';
import type { DayConfig, Session } from '@dewordle/soroban-sdk';

// ---------------------------------------------------------------------------
// Backend REST response shapes (mirrors backend DTOs)
// ---------------------------------------------------------------------------

export interface SessionEntry {
  sessionId: string;
  player: string;
  dayId: number;
  status: 'InProgress' | 'Finalized' | 'Lost';
  attemptsUsed: number;
  finalized: boolean;
  updatedAt: string;
}

export interface SessionHistoryResponse {
  sessions: SessionEntry[];
  total: number;
  skip: number;
  take: number;
}

export interface ReadModelFixtures {
  /** Response returned for GET /api/v1/sessions */
  sessions?: Partial<SessionHistoryResponse>;
  /** DayConfig resolved by useDayConfig / CoreGameClient.getDayConfig */
  dayConfig?: Partial<DayConfig> | null;
  /** Session resolved by useSession / CoreGameClient.getSession */
  session?: Partial<Session> | null;
  /**
   * Map of URL substrings → custom response bodies.
   * Takes priority over the top-level `sessions` key when the fetch URL
   * matches.
   */
  fetchOverrides?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Default fixture factories
// ---------------------------------------------------------------------------

export function makeSessionEntry(overrides: Partial<SessionEntry> = {}): SessionEntry {
  return {
    sessionId: 'session-test-001',
    player: 'GD5Y6Z7Q8W9X0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3',
    dayId: 1,
    status: 'Finalized',
    attemptsUsed: 4,
    finalized: true,
    updatedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  };
}

export function makeSessionHistoryResponse(
  overrides: Partial<SessionHistoryResponse> = {},
): SessionHistoryResponse {
  return {
    sessions: [makeSessionEntry()],
    total: 1,
    skip: 0,
    take: 20,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// fetch stub
// ---------------------------------------------------------------------------

/**
 * Creates a minimal `fetch` stub that returns JSON responses.
 * Matches URL substrings to fixture data in order:
 *   1. `fetchOverrides` keys (substring match)
 *   2. `/sessions` → fixtures.sessions
 *   3. Fallback: 404
 */
function buildFetchStub(fixtures: ReadModelFixtures): Mock {
  return vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;

    // 1. Custom overrides take priority
    if (fixtures.fetchOverrides) {
      for (const [key, body] of Object.entries(fixtures.fetchOverrides)) {
        if (urlStr.includes(key)) {
          return Promise.resolve(
            new Response(JSON.stringify(body), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
      }
    }

    // 2. Sessions endpoint
    if (urlStr.includes('/sessions')) {
      const body = makeSessionHistoryResponse(fixtures.sessions ?? {});
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    // 3. Fallback
    return Promise.resolve(new Response('Not Found', { status: 404 }));
  });
}

// ---------------------------------------------------------------------------
// Soroban SDK stub
// ---------------------------------------------------------------------------

/**
 * Stubs `@dewordle/soroban-sdk` so hooks that use `CoreGameClient` and
 * `loadContractRegistry` receive controlled fixture data without hitting RPC.
 */
function stubSorobanSdk(fixtures: ReadModelFixtures): void {
  vi.mock('@dewordle/soroban-sdk', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@dewordle/soroban-sdk')>();
    return {
      ...actual,
      loadContractRegistry: vi.fn().mockResolvedValue({
        network: 'testnet',
        contracts: {
          core_game: 'CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5',
          admin_registry: 'CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5',
          rewards: 'CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5',
          achievements: 'CCJZ5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5P5Z5',
        },
      }),
      CoreGameClient: {
        fromRegistry: vi.fn().mockReturnValue({
          getDayConfig: vi.fn().mockResolvedValue(fixtures.dayConfig ?? null),
          getSession: vi.fn().mockResolvedValue(fixtures.session ?? null),
        }),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Active fetch mock, kept so callers can assert against it. */
let _fetchMock: Mock | null = null;

/**
 * Install fetch + Soroban SDK mocks for the given fixtures.
 * Call in `beforeEach`. Pair with `resetReadModelMocks` in `afterEach`.
 */
export function mockReadModel(fixtures: ReadModelFixtures = {}): void {
  _fetchMock = buildFetchStub(fixtures);
  vi.stubGlobal('fetch', _fetchMock);
  stubSorobanSdk(fixtures);
}

/**
 * Returns the active fetch mock so tests can assert call counts and arguments.
 *
 * Example:
 *   expect(getReadModelFetchMock()).toHaveBeenCalledWith(
 *     expect.stringContaining('/sessions'),
 *   );
 */
export function getReadModelFetchMock(): Mock {
  if (!_fetchMock) throw new Error('Call mockReadModel() before getReadModelFetchMock()');
  return _fetchMock;
}

/**
 * Reset all read-model mocks. Call in `afterEach`.
 */
export function resetReadModelMocks(): void {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  _fetchMock = null;
}
