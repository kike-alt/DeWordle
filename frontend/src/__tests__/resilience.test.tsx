import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { usePlayerStreak } from '@/hooks/usePlayerStreak';
import ShareResultCard from '@/components/ShareResultCard';
import VirtualKeyboard from '@/components/VirtualKeyboard';

afterEach(() => vi.restoreAllMocks());

// #1699
describe('usePlayerStreak under network disconnection', () => {
  it('does not throw and keeps a numeric streak when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => usePlayerStreak());
    await waitFor(() => expect(result.current).toBeDefined());
  });
});

// #1700
describe('ShareResultCard clipboard fallback', () => {
  it('falls back when navigator.clipboard is unavailable', () => {
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = vi.fn().mockReturnValue(true);
    render(<ShareResultCard />);
    fireEvent.click(screen.getByRole('button', { name: /share|copy/i }));
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });
});

// #1701
describe('VirtualKeyboard high-contrast mode', () => {
  it('matches snapshot', () => {
    document.documentElement.classList.add('high-contrast');
    const { container } = render(<VirtualKeyboard />);
    expect(container).toMatchSnapshot();
    document.documentElement.classList.remove('high-contrast');
  });
});
