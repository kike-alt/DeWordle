#!/usr/bin/env ts-node
/**
 * DX-109: Development workflow automation CLI.
 * Provides shortcuts for common dev tasks.
 *
 * Usage:
 *   npx ts-node scripts/dev-cli.ts <command>
 *
 * Commands:
 *   setup       — Full first-time setup (install, env, db)
 *   reset-db    — Drop and recreate the local database
 *   seed        — Seed the database with dev fixtures
 *   logs        — Tail docker compose logs
 *   test        — Run all tests with coverage
 *   lint-fix    — Run ESLint fix across the monorepo
 *   clean       — Remove node_modules and build artifacts
 */
import { execSync, ExecSyncOptions } from 'child_process';
import { existsSync, copyFileSync } from 'fs';

const opts: ExecSyncOptions = { stdio: 'inherit', encoding: 'utf8' };
const [, , command, ...args] = process.argv;

const commands: Record<string, () => void> = {
  setup() {
    console.log('📦 Installing dependencies...');
    exec('npm install');
    if (!existsSync('.env.local')) {
      console.log('📋 Copying .env.example → .env.local');
      copyFileSync('.env.example', '.env.local');
    }
    console.log('🐳 Starting Docker services...');
    exec('docker compose up -d');
    console.log('⏳ Waiting for DB...');
    exec('sleep 5');
    console.log('🗄️ Running migrations...');
    exec('npm run migration:run --prefix backend');
    console.log('✅ Setup complete! Run: npm run start:dev --prefix backend');
  },

  'reset-db'() {
    console.log('⚠️  Dropping and recreating database...');
    exec('docker compose exec db psql -U dewordle -c "DROP DATABASE IF EXISTS dewordle;"');
    exec('docker compose exec db psql -U dewordle -c "CREATE DATABASE dewordle;"');
    exec('npm run migration:run --prefix backend');
    console.log('✅ Database reset complete');
  },

  seed() {
    console.log('🌱 Seeding database...');
    exec('npm run seed --prefix backend');
  },

  logs() {
    exec(`docker compose logs -f ${args.join(' ') || ''}`);
  },

  test() {
    console.log('🧪 Running backend tests...');
    exec('npm test --prefix backend -- --coverage');
    console.log('🧪 Running frontend tests...');
    exec('npm test --prefix frontend -- --coverage');
  },

  'lint-fix'() {
    console.log('🔧 Fixing lint issues...');
    exec('npx eslint --fix "backend/src/**/*.ts" "frontend/src/**/*.{ts,tsx}"');
    exec('npx prettier --write "**/*.{ts,tsx,json,md,yml}"');
  },

  clean() {
    console.log('🧹 Cleaning build artifacts...');
    exec('rm -rf backend/dist backend/node_modules');
    exec('rm -rf frontend/.next frontend/node_modules');
    exec('rm -rf onchain/target');
    console.log('✅ Cleaned');
  },
};

function exec(cmd: string): void {
  execSync(cmd, opts);
}

if (!command || !commands[command]) {
  console.error(`Usage: dev-cli.ts <command>`);
  console.error('Commands:', Object.keys(commands).join(', '));
  process.exit(1);
}

commands[command]();