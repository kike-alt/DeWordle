/**
 * Central source of truth for all environment variables across the monorepo.
 * This file is used by generate-env-examples.js to keep all .env.example files
 * in sync across backend, frontend, and any other services.
 *
 * When adding new environment variables:
 * 1. Add them to the appropriate service's array below
 * 2. Include the variable name, default/example value, and description
 * 3. Run `node scripts/generate-env-examples.js` to update all .env.example files
 * 4. Update any validation logic (e.g., backend/src/config/env.validation.ts)
 */

const ENV_DEFINITIONS = {
  backend: [
    // Server configuration
    { key: "NODE_ENV", example: "development", description: "Application environment (development/production/test)" },
    { key: "PORT", example: "3000", description: "Port the backend server will listen on" },
    
    // Database configuration
    { key: "DB_HOST", example: "localhost", description: "PostgreSQL database host" },
    { key: "DB_PORT", example: "5432", description: "PostgreSQL database port" },
    { key: "DB_USERNAME", example: "dewordledb_owner", description: "PostgreSQL database username" },
    { key: "DB_PASSWORD", example: "password", description: "PostgreSQL database password" },
    { key: "DB_NAME", example: "dewordledb", description: "PostgreSQL database name" },
    { key: "DB_SSL", example: "false", description: "Enable SSL for database connections (use true in production)" },
    
    // Auth configuration
    { key: "JWT_SECRET", example: "replace-with-strong-secret", description: "Secret key for JWT token signing" },
    { key: "FRONTEND_URL", example: "http://localhost:3000", description: "URL of the frontend application for CORS" },
    
    // Email configuration (SMTP)
    { key: "SMTP_HOST", example: "smtp.ethereal.email", description: "SMTP server host for sending emails" },
    { key: "SMTP_PORT", example: "587", description: "SMTP server port" },
    { key: "SMTP_USER", example: "", description: "SMTP authentication username" },
    { key: "SMTP_PASS", example: "", description: "SMTP authentication password" },
    { key: "SMTP_FROM", example: "no-reply@dewordle.com", description: "From address for outgoing emails" },
    
    // Scheduling configuration
    { key: "DAILY_WORD_TIMEZONE", example: "UTC", description: "Timezone for the daily word schedule" },
    { key: "DAILY_WORD_SCHEDULE", example: "0 0 * * *", description: "Cron schedule for rotating the daily word" },
    
    // Third-party API keys
    { key: "MW_API_KEY", example: "", description: "Merriam-Webster dictionary API key" },
    { key: "OXFORD_APP_ID", example: "", description: "Oxford Dictionary application ID" },
    { key: "OXFORD_APP_KEY", example: "", description: "Oxford Dictionary application key" },
    
    // Soroban/Stellar configuration
    { key: "SOROBAN_RPC_URL", example: "https://soroban-testnet.stellar.org", description: "Soroban RPC endpoint URL" },
    { key: "SOROBAN_NETWORK", example: "testnet", description: "Stellar network to use (testnet/mainnet)" },
    { key: "SOROBAN_CORE_GAME_CONTRACT_ID", example: "", description: "Deployed core game contract ID on Soroban" },
    
    // Indexer configuration
    { key: "INDEXER_MAX_PAYLOAD_BYTES", example: "8192", description: "Maximum payload size for indexer events" },
  ],
  
  frontend: [
    // API configuration
    { key: "NEXT_PUBLIC_API_URL", example: "https://dewordle.onrender.com/api/v1", description: "Backend API URL for frontend to connect to" },
    
    // Feature flags
    { key: "NEXT_PUBLIC_FEATURE_REWARDS", example: "false", description: "Enable the rewards feature (set to 'true' to enable)" },
    { key: "NEXT_PUBLIC_FEATURE_ACHIEVEMENTS", example: "false", description: "Enable the achievements feature (set to 'true' to enable)" },
  ]
};

module.exports = { ENV_DEFINITIONS };