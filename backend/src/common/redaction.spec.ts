import { redactWalletAddress, redactWalletAddresses, sanitizeErrorMessage, sanitizeLogPayload } from './redaction';

describe('redaction', () => {
  describe('redactWalletAddress', () => {
    it('redacts a full Stellar address', () => {
      const addr = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
      const result = redactWalletAddress(addr);
      expect(result).toBe('GAAG****AAHF');
    });

    it('returns **** for short strings', () => {
      expect(redactWalletAddress('abc')).toBe('****');
    });

    it('returns **** for empty string', () => {
      expect(redactWalletAddress('')).toBe('****');
    });
  });

  describe('redactWalletAddresses', () => {
    it('redacts wallet addresses in a log message', () => {
      const msg = 'Player GAAAA12345678901234567890 played today';
      const result = redactWalletAddresses(msg);
      expect(result).toContain('****');
      expect(result).not.toContain('GAAAA12345678901234567890');
    });

    it('preserves non-wallet text', () => {
      const msg = 'No wallet here';
      expect(redactWalletAddresses(msg)).toBe('No wallet here');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('sanitizes Error objects', () => {
      const err = new Error('Failed for GAAAA12345678901234567890');
      const result = sanitizeErrorMessage(err);
      expect(result).not.toContain('GAAAA12345678901234567890');
    });

    it('sanitizes plain strings', () => {
      const result = sanitizeErrorMessage('user@example.com failed');
      expect(result).not.toContain('user@example.com');
    });
  });

  describe('sanitizeLogPayload', () => {
    it('redacts string values', () => {
      const payload = { player: 'GAAAA12345678901234567890', msg: 'test' };
      const result = sanitizeLogPayload(payload);
      expect(result.player).not.toContain('GAAAA12345678901234567890');
    });

    it('redacts error fields', () => {
      const payload = { error: 'GAAAA12345678901234567890 failed' };
      const result = sanitizeLogPayload(payload);
      expect(result.error).not.toContain('GAAAA12345678901234567890');
    });

    it('preserves non-sensitive fields', () => {
      const payload = { count: 42, topic: 'test' };
      const result = sanitizeLogPayload(payload);
      expect(result.count).toBe(42);
      expect(result.topic).toBe('test');
    });
  });
});
