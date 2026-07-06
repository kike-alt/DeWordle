# TODO — DEVOPS-218: Sync maintained-surface status badges

## Step 1 — Gather current status badge behavior
- [x] Inspect current `README.md` for existing badges
- [x] Inspect CI workflows under `.github/workflows/` to identify FE/BE/Soroban validation jobs

## Step 2 — Decide badge strategy
- [x] Determine workflow/job names:
  - Workflow: `.github/workflows/maintained-surface-checks.yml`
  - Jobs:
    - `maintained-frontend` (job name: Maintained Frontend)
    - `maintained-backend` (job name: Maintained Backend)
    - `maintained-soroban` (job name: Maintained Soroban Validation)
- [x] Confirm badge URL should target `job` status within the workflow

## Step 3 — Implement workflows (if needed)
- [x] Confirm `maintained-surface-checks.yml` exists with deterministic job ids

## Step 4 — Add badges to README
- [x] Add 3 status badges under repo title (FE/BE/Soroban)
- [x] Document which workflow/job each badge represents

## Step 5 — Add/update tests, fixtures, and docs
- [ ] Update docs if needed for maintained-surface definition
- [ ] Add/adjust tests/fixtures only if badge implementation depends on health payloads (currently uses CI job result)

## Step 6 — Verification
- [ ] Run:
  - `npm run verify:frontend`
  - `npm run verify:backend`
  - `npm run soroban:check`
- [ ] Ensure `README.md` badge links resolve

