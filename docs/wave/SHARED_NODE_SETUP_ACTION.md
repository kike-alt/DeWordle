# Shared Node Setup Composite Action

> **Wave 5 · Track: DEVOPS · Phase: 3 · ID: DEVOPS-216**

## Purpose

Multiple CI workflows in this repository require the same three-step Node setup:

1. Install Node via `actions/setup-node@v4`, reading the pinned version from `.tool-versions`.
2. Request the latest available patch for that version (`check-latest: true`).
3. Print `node --version` so logs are easily searchable by toolchain version.

Repeating these steps inline in every workflow creates a drift risk: when we need to upgrade the action version or add a new flag, every file needs updating individually. The composite action at `.github/actions/setup-node/action.yml` is the single source of truth for this pattern.

---

## Location

```
.github/
└── actions/
    └── setup-node/
        └── action.yml   ← composite action definition
```

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `node-version` | No | `""` | Explicit Node version string (e.g. `"22"`). When blank, the version is read from `.tool-versions`. |
| `check-latest` | No | `"true"` | Pass `"false"` to pin to an exact version without checking for newer patches. Useful for matrix jobs. |

---

## How to use it

### Standard setup (reads `.tool-versions`, checks for latest patch)

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Set up Node
    uses: ./.github/actions/setup-node
```

### Pinned explicit version (matrix jobs, audit jobs)

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Set up Node ${{ matrix.node }}
    uses: ./.github/actions/setup-node
    with:
      node-version: ${{ matrix.node }}
      check-latest: "false"
```

---

## When NOT to use this action

Use inline `actions/setup-node@v4` directly when:

- **The job intentionally tests an unsupported Node version** — e.g. `toolchain-matrix.yml` cycles through known-good and known-bad versions. The composite action's `check-latest` default could interfere with that intent.
- **Audit/security jobs require a fully pinned toolchain** — e.g. `advisory-triage.yml` hard-codes `node-version: 20` without `check-latest` for reproducible audit results. Changing that behaviour via a shared action would silently alter the security policy.

---

## Workflows currently using this action

| Workflow | Job |
|---|---|
| `drift-check.yml` | `drift-check` |
| `link-check.yml` | `link-check` |
| `toolchain-check.yml` | `check-node` |

## Workflows intentionally NOT using this action

| Workflow | Reason |
|---|---|
| `toolchain-matrix.yml` | Matrix jobs override Node version per cell; must stay explicit |
| `advisory-triage.yml` | Audit jobs pin `node-version: 20` without `check-latest` for stable scan results |

---

## Updating the shared action

To change the Node setup behaviour across all consuming workflows:

1. Edit `.github/actions/setup-node/action.yml`.
2. Run the test fixture to confirm structural invariants still hold:
   ```bash
   node --test scripts/check-node-action.test.js
   ```
3. Open a PR — all three workflows pick up the change automatically.
