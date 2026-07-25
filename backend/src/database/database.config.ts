import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * PERF-102: Database connection pool configuration.
 * Tuned for Wordle game traffic patterns — read-heavy, short-lived queries.
 */
export function getDatabaseConfig(): TypeOrmModuleOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,

    // Connection pool tuning
    extra: {
      // Max connections per NestJS worker process (default: 10)
      max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
      // Min idle connections to keep warm
      min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
      // Idle connections released after 30 s
      idleTimeoutMillis: 30_000,
      // Kill queries that run longer than 10 s
      statement_timeout: 10_000,
      // Connection attempt timeout
      connectionTimeoutMillis: 5_000,
    },

    // Auto-load all entity files
    autoLoadEntities: true,
    synchronize: !isProduction,
    logging: isProduction ? ['error'] : ['query', 'error', 'warn'],
    logger: 'advanced-console',

    // Migrations in production
    migrations: isProduction ? ['dist/migrations/*.js'] : [],
    migrationsRun: isProduction,
  };
}