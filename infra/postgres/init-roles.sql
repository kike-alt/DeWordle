-- ============================================================================
-- SECURITY-210: Database Least-Privilege Role Hardening Script
-- ============================================================================

-- 1. Revoke public default creation privileges on the schema layout entirely
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- ROLE 1: Migration Specialist (DDL execution only)
-- Used exclusively during CI/CD migration deployment pipelines
-- ----------------------------------------------------------------------------
CREATE ROLE app_migration_user WITH LOGIN PASSWORD 'SecureMigrationPass2026!';

GRANT CONNECT ON DATABASE app_prod_db TO app_migration_user;
GRANT CREATE, USAGE ON SCHEMA public TO app_migration_user;

-- ----------------------------------------------------------------------------
-- ROLE 2: Runtime Application Identity (DML execution only)
-- Used by the Nest.js backend cluster for regular operation
-- ----------------------------------------------------------------------------
CREATE ROLE app_runtime_user WITH LOGIN PASSWORD 'SecureRuntimePass2026!';

GRANT CONNECT ON DATABASE app_prod_db TO app_runtime_user;
GRANT USAGE ON SCHEMA public TO app_runtime_user;

-- Set default transactional permissions for structural elements built by the migration runner
ALTER DEFAULT PRIVILEGES FOR ROLE app_migration_user IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime_user;

ALTER DEFAULT PRIVILEGES FOR ROLE app_migration_user IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO app_runtime_user;