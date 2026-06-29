/**
 * sessions-page.spec.tsx — QA-202 (#799)
 *
 * Demonstrates the read-model mock library in a route-level component test.
 * The sessions page fetches from the backend REST API; here we stub `fetch`
 * via mockReadModel so no network request is made.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  mockReadModel,
  resetReadModelMocks,
  getReadModelFetchMock,
  makeSessionEntry,
  makeSessionHistoryResponse,
} from './read-model-mock';

// ---------------------------------------------------------------------------
// Mock Next.js navigation (not used in tests but imported by the page)
// ---------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}));

// ---------------------------------------------------------------------------
// Mock the wallet hook so the page renders without a real provider
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useStellarWallet', () => ({
  useStellarWallet: () => ({
    connected: false,
    address: undefined,
    readOnly: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    status: { id: '', state: 'idle' },
  }),
}));

// Lazy import after mocks are registered
async function importPage() {
  const mod = await import('@/app/sessions/page');
  return mod.default;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionsPage — read-model mock library (QA-202)', () => {
  beforeEach(() => {
    mockReadModel({
      sessions: makeSessionHistoryResponse({
        sessions: [
          makeSessionEntry({ dayId: 7, status: 'Finalized', attemptsUsed: 3 }),
          makeSessionEntry({
            sessionId: 'session-test-002',
            dayId: 8,
            status: 'Lost',
            attemptsUsed: 6,
          }),
        ],
        total: 2,
      }),
    });
  });

  afterEach(() => {
    resetReadModelMocks();
    vi.resetModules();
  });

  it('renders the page heading', async () => {
    const Page = await importPage();
    render(<Page />);
    expect(screen.getByRole('heading', { name: /session history/i })).toBeDefined();
  });

  it('fetches sessions from the API on mount', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      const calls = getReadModelFetchMock().mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const firstUrl = String(calls[0]?.[0] ?? '');
      expect(firstUrl).toContain('/sessions');
    });
  });

  it('renders session rows returned by the API', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Day #7')).toBeDefined();
      expect(screen.getByText('Day #8')).toBeDefined();
    });
  });

  it('shows read-only banner and connect-wallet prompt when wallet is disconnected', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/connect wallet/i)).toBeDefined();
    });
  });

  it('renders empty state when the API returns no sessions', async () => {
    resetReadModelMocks();
    mockReadModel({
      sessions: makeSessionHistoryResponse({ sessions: [], total: 0 }),
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeDefined();
    });
  });

  it('shows error state when the API returns a non-ok response', async () => {
    resetReadModelMocks();
    // Override fetch to reject so the page's error handler is triggered
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Failed to fetch sessions')),
    );
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeDefined();
    });
  });

  it('passes correct pagination params (skip=0, take=20) on initial load', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      const calls = getReadModelFetchMock().mock.calls;
      const firstUrl = String(calls[0]?.[0] ?? '');
      expect(firstUrl).toContain('skip=0');
      expect(firstUrl).toContain('take=20');
    });
  });
});
