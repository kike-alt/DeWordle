# CI Troubleshooting Runbook

> Wave 5 · Track: DEVOPS/DOCS · Phase: 3B · ID: W5-3B-DOCS-003

This runbook maps CI failure categories to actionable remediation steps for contributors and maintainers.

---

## Failure Taxonomy

### Category 1 — Dependency / Install Failures

**Symptoms**
- `npm ci` exits non-zero
- `cargo fetch` or `cargo check` fails with registry errors
- Lockfile mismatch errors

**Action Steps**
1. Confirm lockfile is committed and up-to-date:
   ```bash
   npm ci --prefix frontend
   npm ci --prefix backend
   ```
2. If lockfile is stale, regenerate locally and commit:
   ```bash
   npm install --prefix frontend && npm install --prefix backend
   git add frontend/package-lock.json backend/package-lock.json
   ```
3. For Rust/Cargo issues:
   ```bash
   cd soroban && cargo fetch
   ```
4. Check for `.npmrc` or registry overrides that may not be available in CI.

**Local Reproduction**
```bash
npm run install:all
```

---

### Category 2 — Build / Compile Failures

**Symptoms**
- TypeScript type errors in CI but not locally
- `cargo build` fails on `wasm32-unknown-unknown` target
- Next.js or NestJS build exits non-zero

**Action Steps**
1. Run the exact build command from the failing workflow step locally.
2. For frontend:
   ```bash
   npm run verify:frontend
   ```
3. For backend:
   ```bash
   npm run verify:backend
   ```
4. For Soroban:
   ```bash
   cd soroban
   cargo fmt --check
   cargo clippy --workspace -- -D warnings
   cargo check --workspace
   cargo build --workspace --target wasm32-unknown-unknown --release
   ```
5. Ensure your local Rust toolchain matches `rust-toolchain.toml` (if present).

**Local Reproduction**
```bash
cd soroban && cargo check --workspace
```

---

### Category 3 — Test Failures

**Symptoms**
- Unit or integration tests fail in CI but pass locally
- Snapshot mismatches
- Flaky async tests

**Action Steps**
1. Run tests locally with the same environment variables as CI:
   ```bash
   npm test --prefix frontend
   npm test --prefix backend
   ```
2. For Soroban contract tests:
   ```bash
   cd soroban && cargo test --workspace
   ```
3. If tests are flaky (intermittent), open a maintenance issue tagged `flaky-test` and link it in your PR.
4. Do not re-run CI to mask flaky failures — track them explicitly.

---

### Category 4 — Lint / Format Failures

**Symptoms**
- ESLint or Prettier errors
- `cargo fmt --check` fails
- `cargo clippy` warnings treated as errors

**Action Steps**
1. Auto-fix JS/TS formatting:
   ```bash
   npx prettier --write "frontend/src/**/*.{ts,tsx}" "backend/src/**/*.ts"
   npx eslint --fix "frontend/src/**/*.{ts,tsx}" "backend/src/**/*.ts"
   ```
2. Auto-fix Rust formatting:
   ```bash
   cd soroban && cargo fmt
   ```
3. Address all Clippy warnings — do not use `#[allow(...)]` without a comment explaining why.

---

### Category 5 — Watchman / File-Watch Failures

**Symptoms**
- `watchman` errors in Jest output
- `ENOSPC: System limit for number of file watchers reached`
- Tests hang waiting for file events

**Action Steps**
1. This is a CI environment resource limit, not a code bug.
2. Disable watchman in Jest config or pass `--watchAll=false`:
   ```bash
   npx jest --watchAll=false
   ```
3. Increase inotify limit if running a self-hosted runner:
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```
4. If the issue persists on GitHub-hosted runners, open a DEVOPS maintenance issue.

---

### Category 6 — Network / Registry Failures

**Symptoms**
- `npm ERR! network` or `ETIMEDOUT` during install
- Cargo registry fetch timeouts
- Soroban CLI download failures

**Action Steps**
1. These are transient infrastructure failures — re-run the CI job once.
2. If failures persist across multiple runs, check GitHub Status (https://githubstatus.com) and crates.io status.
3. Pin dependency versions to avoid pulling from unstable registries.
4. For Soroban CLI in CI, prefer installing from a pinned release URL rather than `cargo install`.

---

### Category 7 — Workflow / Configuration Failures

**Symptoms**
- `Error: .github/workflows/*.yml` parse errors
- Missing required secrets or environment variables
- Unexpected `if:` condition skips

**Action Steps**
1. Validate workflow YAML locally:
   ```bash
   npx action-validator .github/workflows/*.yml
   ```
2. Check that all required secrets (`STELLAR_SECRET_KEY`, etc.) are configured in repo Settings → Secrets.
3. Review `if:` conditions — ensure branch filters match your branch naming convention.
4. Cross-reference with [WAVE5_EXECUTION_PLAN](./WAVE5_EXECUTION_PLAN.md) CI/CD expectations.

---

## Escalation Path

| Situation | Action |
|---|---|
| Failure not covered by this runbook | Open a DEVOPS issue with full CI log attached |
| Flaky test confirmed | Open maintenance issue tagged `flaky-test`, link in PR |
| CI blocked for >24h | Ping maintainer in issue thread |
| Security-sensitive failure | Follow [SECURITY_FOUNDATION](../SECURITY_FOUNDATION.md) path |

---

## Related Docs
- [Development Guide](../DEVELOPMENT.md)
- [Debug Recipe Catalog](../DEBUG_RECIPE_CATALOG.md) - Cross-cutting debug recipes for wallet, RPC, database, and additional CI issues
- [Soroban Local Dev](../SOROBAN_LOCAL_DEV.md)
- [Wave 5 Execution Plan](./WAVE5_EXECUTION_PLAN.md)
- [Security Foundation](../SECURITY_FOUNDATION.md)