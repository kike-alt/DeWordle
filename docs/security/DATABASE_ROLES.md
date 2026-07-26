# Database Access Policy: Least-Privilege Architecture

To secure production footprints against accidental data dropouts or severe query execution vulnerabilities, our backend deployment uses separated credential chains.

## Matrix Definition Layer

| Operational Role | Applied Lifecycle | Boundary Capabilities (Scope) |
| :--- | :--- | :--- |
| `app_migration_user` | Schema Migration Steps (`npm run migration:run`) | Full DDL access (`CREATE`, `ALTER`, `DROP`) to alter tables, indexes, and triggers. |
| `app_runtime_user` | Application Runtime Engine (Nest.js Core) | Strict DML boundaries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Completely blocked from modifying structural schemas. |

## 🛠️ Verification Routine Check

To ensure your local migration patterns or container configurations conform to security boundaries, execute a targeted permissions audit:

```bash
# 1. Connect to your instance shell using the application runtime identity
psql -U app_runtime_user -d app_prod_db

# 2. Assert that manual DDL creation throws an explicit access violation
# This check must fail to pass the security compliance audit!
CREATE TABLE security_audit_test (id SERIAL PRIMARY KEY);
# EXPECTED OUTPUT: ERROR: permission denied for schema public