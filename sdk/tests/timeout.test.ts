import { describe, it, expect, vi, afterEach } from 'vitest';

// Simulates a network timeout against a mocked RPC call and verifies the
// caller surfaces a timeout error instead of hanging.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('RPC timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

describe('transaction builder network timeout', () => {
  afterEach(() => vi.useRealTimers());

  it('rejects when the RPC never responds', async () => {
    vi.useFakeTimers();
    const hang = new Promise<never>(() => {});
    const result = withTimeout(hang, 5000);
    const assertion = expect(result).rejects.toThrow('RPC timeout');
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('resolves when the RPC answers before the timeout', async () => {
    const ok = Promise.resolve({ status: 'SUCCESS' });
    await expect(withTimeout(ok, 5000)).resolves.toEqual({ status: 'SUCCESS' });
  });
});
