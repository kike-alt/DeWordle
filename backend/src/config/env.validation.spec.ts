import { validateEnv } from './env.validation';

const VALID_BASE: Record<string, unknown> = {
  DB_HOST: 'localhost',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'secret',
  DB_NAME: 'dewordle',
  JWT_SECRET: 'supersecret',
  FRONTEND_URL: 'http://example.com',
  SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
  SOROBAN_CORE_GAME_CONTRACT_ID: 'CAABC123',
};

describe('validateEnv', () => {
  it('passes with all required variables present', () => {
    expect(() => validateEnv(VALID_BASE)).not.toThrow();
  });

  it('applies defaults for optional variables', () => {
    const result = validateEnv(VALID_BASE);
    expect(result.PORT).toBe(3000);
    expect(result.SOROBAN_NETWORK).toBe('testnet');
    expect(result.INDEXER_MAX_PAYLOAD_BYTES).toBe(8192);
  });

  it('throws when DB_HOST is missing', () => {
    const { DB_HOST: _removed, ...rest } = VALID_BASE;
    expect(() => validateEnv(rest)).toThrow('Environment validation failed');
  });

  it('throws when JWT_SECRET is missing', () => {
    const { JWT_SECRET: _removed, ...rest } = VALID_BASE;
    expect(() => validateEnv(rest)).toThrow('Environment validation failed');
  });

  it('throws when SOROBAN_RPC_URL is missing', () => {
    const { SOROBAN_RPC_URL: _removed, ...rest } = VALID_BASE;
    expect(() => validateEnv(rest)).toThrow('Environment validation failed');
  });

  it('throws when SOROBAN_CORE_GAME_CONTRACT_ID is missing', () => {
    const { SOROBAN_CORE_GAME_CONTRACT_ID: _removed, ...rest } = VALID_BASE;
    expect(() => validateEnv(rest)).toThrow('Environment validation failed');
  });

  it('throws when SOROBAN_NETWORK is an invalid value', () => {
    expect(() =>
      validateEnv({ ...VALID_BASE, SOROBAN_NETWORK: 'devnet' }),
    ).toThrow('Environment validation failed');
  });

  it('collects all missing-field errors in one throw', () => {
    expect(() => validateEnv({})).toThrow('Environment validation failed');
  });

  describe('IsSafeRpcUrl validation', () => {
    it('allows https in development', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          NODE_ENV: 'development',
          SOROBAN_RPC_URL: 'https://testnet.local',
        }),
      ).not.toThrow();
    });

    it('allows http://localhost in development', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          NODE_ENV: 'development',
          SOROBAN_RPC_URL: 'http://localhost:8000',
        }),
      ).not.toThrow();
    });

    it('allows http://127.0.0.1 in development', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          NODE_ENV: 'development',
          SOROBAN_RPC_URL: 'http://127.0.0.1:8000',
        }),
      ).not.toThrow();
    });

    it('rejects http://example.com in development', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          NODE_ENV: 'development',
          SOROBAN_RPC_URL: 'http://example.com:8000',
        }),
      ).toThrow(
        'SOROBAN_RPC_URL must be a secure https endpoint or a local http endpoint (localhost) in development',
      );
    });

    it('rejects http://localhost in production', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          NODE_ENV: 'production',
          SOROBAN_RPC_URL: 'http://localhost:8000',
        }),
      ).toThrow('SOROBAN_RPC_URL must be a secure https endpoint');
    });

    it('rejects http://example.com in test', () => {
      expect(() =>
        validateEnv({
          ...VALID_BASE,
          NODE_ENV: 'test',
          SOROBAN_RPC_URL: 'http://example.com',
        }),
      ).toThrow('SOROBAN_RPC_URL must be a secure https endpoint');
    });
  });
});
