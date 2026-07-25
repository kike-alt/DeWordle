# CI Setup

## Shared Node.js Composite Action

The repository uses a composite GitHub Action at `.github/actions/setup-node/action.yml` to provide a consistent Node.js setup across all CI workflows.

### Inputs

| Input | Description | Default |
|---|---|---|
| `node-version` | Explicit Node version (e.g. `"22"`). Leave blank to read from `.tool-versions`. | `""` |
| `check-latest` | Whether to check for newer patch versions of the resolved Node version. | `"true"` |
| `verify` | When `"true"`, runs `npm ci` in the root after Node is installed. | `"false"` |
| `workspaces` | Comma-separated workspace directories to install (e.g. `"backend,frontend"`). | `""` |

### Usage Examples

**Basic setup (reads version from `.tool-versions`):**

```yaml
- uses: ./.github/actions/setup-node
```

**With workspace installs:**

```yaml
- uses: ./.github/actions/setup-node
  with:
    workspaces: "backend,frontend"
```

**With verify (clean install at root):**

```yaml
- uses: ./.github/actions/setup-node
  with:
    verify: "true"
```

### Caching

The action automatically caches `~/.npm` and `node_modules` using the `actions/cache@v4` action. The cache key is derived from all `package-lock.json` files in the repository.

### Workflows Using This Action

- `maintained-backend.yml` - Backend CI with workspace install for `backend/`
- `maintained-frontend.yml` - Frontend CI with workspace install for `frontend/`
- `event-compat-check.yml` - Event schema compatibility checks
