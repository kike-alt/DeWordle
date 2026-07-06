# Command-Snippet Verification Harness

**QA-216** — This document describes the approach used to verify that command
snippets documented for contributors remain accurate and runnable.

## What is verified

The harness at `backend/src/indexer/docs-snippets.spec.ts` reads
`backend/package.json` at test time and asserts that the following script
groups exist and have non-empty values.

### Contributor onboarding commands

| Command       | Purpose                                    |
|---------------|--------------------------------------------|
| `build`       | Compile the NestJS application             |
| `start`       | Run the compiled application               |
| `start:dev`   | Start with hot-reload for development      |
| `test`        | Run the full Jest test suite               |
| `lint`        | Run ESLint across all source files         |

### CI commands (referenced in workflows)

| Command       | Purpose                                    |
|---------------|--------------------------------------------|
| `test:ci`    | Jest with `--runInBand` scoped to indexer |
| `typecheck`  | TypeScript type-check without emit         |
| `lint:ci`    | ESLint scoped to indexer (no spec files)   |

### Database commands

| Command                    | Purpose                              |
|----------------------------|--------------------------------------|
| `db:setup`               | Run migrations then seed words       |
| `typeorm:migration:run`  | Apply pending TypeORM migrations     |
| `seed:words`             | Seed the words table                 |

## Running the verification

```bash
# From the backend/ directory:
npm run test:ci
```

The `docs-snippets.spec.ts` file is picked up automatically when Jest scans
`src/indexer`.

## Adding new snippets

1. Add the new command to `backend/package.json` under `scripts`.
2. Document it in the table above.
3. Add an assertion in `docs-snippets.spec.ts` under the appropriate group.

## Reporting broken snippets

If a snippet assertion fails, the Jest output identifies the exact script
name that is missing or malformed. Fix it in `package.json` and update this
document before merging.
