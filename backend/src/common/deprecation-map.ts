export interface EndpointEntry {
  path: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  status: 'active' | 'transitional' | 'deprecated';
  module: string;
  migration: string;
}

export const DEPRECATION_MAP: EndpointEntry[] = [
  {
    path: '/games',
    method: 'GET',
    status: 'active',
    module: 'games',
    migration: 'Replaced by Soroban CoreGameClient.getDayConfig in Wave 6',
  },
  {
    path: '/games/:id',
    method: 'PATCH',
    status: 'deprecated',
    module: 'games',
    migration: 'Admin game config moves to Soroban admin_registry contract',
  },
  {
    path: '/games/:id',
    method: 'DELETE',
    status: 'deprecated',
    module: 'games',
    migration: 'Admin game lifecycle moves to Soroban contract',
  },
  {
    path: '/words/random',
    method: 'GET',
    status: 'transitional',
    module: 'words',
    migration: 'Will be replaced by Soroban daily puzzle word selection',
  },
  {
    path: '/words/daily',
    method: 'GET',
    status: 'transitional',
    module: 'words',
    migration: 'Will be served from Soroban indexer projection in Wave 6',
  },
  {
    path: '/words/daily/trigger',
    method: 'POST',
    status: 'deprecated',
    module: 'words',
    migration: 'Manual cron trigger — removed once Soroban schedule is live',
  },
  {
    path: '/leaderboard/global',
    method: 'GET',
    status: 'active',
    module: 'leaderboard',
    migration: 'Will be replaced by Soroban projection-backed leaderboard',
  },
  {
    path: '/leaderboard/:gameSlug',
    method: 'GET',
    status: 'transitional',
    module: 'leaderboard',
    migration: 'Per-game leaderboard — map to Soroban day config',
  },
  {
    path: '/api/v1/achievements/:address',
    method: 'GET',
    status: 'active',
    module: 'common',
    migration: 'Projection-backed, canonical read API',
  },
  {
    path: '/api/v1/players/:address/summary',
    method: 'GET',
    status: 'active',
    module: 'common',
    migration: 'Projection-backed, canonical read API',
  },
  {
    path: '/api/v1/sessions',
    method: 'GET',
    status: 'active',
    module: 'common',
    migration: 'Projection-backed, canonical read API',
  },
  {
    path: '/auth/register',
    method: 'POST',
    status: 'deprecated',
    module: 'auth',
    migration: 'Authentication moves to Soroban wallet-based auth',
  },
  {
    path: '/auth/login',
    method: 'POST',
    status: 'deprecated',
    module: 'auth',
    migration: 'Authentication moves to Soroban wallet-based auth',
  },
];

export function getDeprecationMap(): EndpointEntry[] {
  return DEPRECATION_MAP;
}

export function getEndpointsByStatus(
  status: EndpointEntry['status'],
): EndpointEntry[] {
  return DEPRECATION_MAP.filter((e) => e.status === status);
}

export function getActiveEndpoints(): EndpointEntry[] {
  return getEndpointsByStatus('active');
}

export function getTransitionalEndpoints(): EndpointEntry[] {
  return getEndpointsByStatus('transitional');
}

export function getDeprecatedEndpoints(): EndpointEntry[] {
  return getEndpointsByStatus('deprecated');
}
