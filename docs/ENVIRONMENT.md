# Environment Variables Reference

This document is auto-generated from the central environment definitions. To update any environment variable, edit `scripts/env-definitions.js` and run:
```bash
node scripts/sync-env-docs.js --generate-reference
```

## Backend

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `NODE_ENV` | `development` | Application environment (development/production/test) |
| `PORT` | `3000` | Port the backend server will listen on |
| `DB_HOST` | `localhost` | PostgreSQL database host |
| `DB_PORT` | `5432` | PostgreSQL database port |
| `DB_USERNAME` | `dewordledb_owner` | PostgreSQL database username |
| `DB_PASSWORD` | `password` | PostgreSQL database password |
| `DB_NAME` | `dewordledb` | PostgreSQL database name |
| `DB_SSL` | `false` | Enable SSL for database connections (use true in production) |
| `JWT_SECRET` | `replace-with-strong-secret` | Secret key for JWT token signing |
| `FRONTEND_URL` | `http://localhost:3000` | URL of the frontend application for CORS |
| `SMTP_HOST` | `smtp.ethereal.email` | SMTP server host for sending emails |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | - | SMTP authentication username |
| `SMTP_PASS` | - | SMTP authentication password |
| `SMTP_FROM` | `no-reply@dewordle.com` | From address for outgoing emails |
| `DAILY_WORD_TIMEZONE` | `UTC` | Timezone for the daily word schedule |
| `DAILY_WORD_SCHEDULE` | `0 0 * * *` | Cron schedule for rotating the daily word |
| `MW_API_KEY` | - | Merriam-Webster dictionary API key |
| `OXFORD_APP_ID` | - | Oxford Dictionary application ID |
| `OXFORD_APP_KEY` | - | Oxford Dictionary application key |
| `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint URL |
| `SOROBAN_NETWORK` | `testnet` | Stellar network to use (testnet/mainnet) |
| `SOROBAN_CORE_GAME_CONTRACT_ID` | - | Deployed core game contract ID on Soroban |
| `INDEXER_MAX_PAYLOAD_BYTES` | `8192` | Maximum payload size for indexer events |

## Frontend

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://dewordle.onrender.com/api/v1` | Backend API URL for frontend to connect to |
| `NEXT_PUBLIC_FEATURE_REWARDS` | `false` | Enable the rewards feature (set to 'true' to enable) |
| `NEXT_PUBLIC_FEATURE_ACHIEVEMENTS` | `false` | Enable the achievements feature (set to 'true' to enable) |

## Local Development Profiles

You can bootstrap your development environment with different profiles depending on what you're working on. Run the bootstrap script with one of the following profiles:

| Profile | Command | What it includes | Required Environment Variables |
|---------|---------|------------------|--------------------------------|
| frontend-only | `npm run bootstrap:frontend` | Only the frontend application | `NEXT_PUBLIC_API_URL` |
| indexer-only | `npm run bootstrap:indexer` | Backend and indexer services | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `SOROBAN_RPC_URL` |
| soroban-only | `npm run bootstrap:soroban` | Soroban smart contracts | `SOROBAN_RPC_URL`, `SOROBAN_NETWORK`, `SOROBAN_CORE_GAME_CONTRACT_ID` |
| full-stack | `npm run bootstrap:fullstack` | Everything (frontend, backend, Soroban) | All environment variables |

### Profile Usage

1. **frontend-only**: Good for working on UI features without needing to run a full backend. Only requires Node.js and npm.
2. **indexer-only**: For backend and indexer development, requires PostgreSQL.
3. **soroban-only**: For smart contract development, requires Rust and Cargo.
4. **full-stack**: Complete development environment with all services running.

The bootstrap script will automatically copy the appropriate `.env.example` file to your local environment file if it doesn't exist, and guide you through the next steps to get started.

## Updating Environment Variables

When adding new environment variables to the project:
1. Add them to the appropriate service array in `scripts/env-definitions.js`
2. Update any validation logic (e.g., backend's `src/config/env.validation.ts`)
3. Regenerate example files: `node scripts/generate-env-examples.js --fix`
4. If the new variable is required for any development profile, update `scripts/contributor-bootstrap.js` and this documentation
5. Refresh this reference doc: `node scripts/sync-env-docs.js --generate-reference`