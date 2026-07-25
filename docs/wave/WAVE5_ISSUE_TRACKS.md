# Wave 5 Issue Tracks

This document defines Wave 5 issue orchestration standards.

## Track Catalog
- `FE`: frontend UX, wallet integration surfaces, view-layer states.
- `BE`: backend indexer, projections, APIs, processing workers.
- `SC`: Soroban smart contracts and contract tests.
- `SDK`: TypeScript/Rust client abstractions and event tooling.
- `DEVOPS`: CI/CD, release workflows, environment automation.
- `QA`: automated/manual validation, regression and integration checks.
- `SECURITY`: auth boundaries, replay safety, threat mitigation tasks.
- `DX`: contributor ergonomics, scripts, local setup improvements.
- `DOCS`: operational/technical documentation updates.
- `AI/AUTOMATION`: triage tooling, workflow automation, quality helpers.

## Issue Naming Convention
Use:
`[W5][<TRACK>][<DIFFICULTY>] <concise action-oriented title>`

Examples:
- `[W5][SC][M] Add session-finalization invariant tests`
- `[W5][BE][L] Add cursor checkpoint reconciliation worker`
- `[W5][FE][S] Add wallet transaction error state component`

## Difficulty Classification
- `S` (2-6 hours): focused, low dependency.
- `M` (1-3 days): moderate scope, single track.
- `L` (3-7 days): larger scope, may touch two modules.
- `XL` (1+ week): complex, multi-step delivery with checkpoints.

## Label Strategy
Required labels:
- `wave:5`
- `track:<FE|BE|SC|SDK|DEVOPS|QA|SECURITY|DX|DOCS|AI/AUTOMATION>`
- `size:<S|M|L|XL>`
- `difficulty:<beginner|intermediate|advanced>`
- `phase:<1-7>`
- `priority:<P0|P1|P2>`

Optional labels:
- `blocked`
- `needs-design`
- `needs-reviewer`
- `cross-track`

## Point Strategy
- `S` = 1 point
- `M` = 3 points
- `L` = 5 points
- `XL` = 8 points

Points are planning signals for balance, not quality substitutes.

## Contributor Expectations
- Claim issue with approach + ETA.
- Keep changes within issue scope boundaries.
- Provide validation evidence in PR.
- Respect review feedback turnaround windows.

## Issue Quality Standards
Every issue must include:
- Objective and scope boundaries.
- Acceptance criteria checklist.
- Dependencies and blockers section.
- Validation instructions.
- Related docs references.

## Review Standards
Reviewers must validate:
- Scope adherence.
- Acceptance criteria completion.
- CI outcome and reproducibility.
- Architectural consistency with existing docs/ADRs.

## Dependency Handling
- Add `depends-on: #<issue>` metadata for blocked tasks.
- Do not merge child issues before dependency closure unless explicitly waived.
- Track cross-track dependencies in milestone status notes.

## Wave Organization Rules
- Maintain balanced queue per track and difficulty.
- Keep at least:
  - 20% beginner
  - 50% intermediate
  - 30% advanced
- Rebalance weekly based on reviewer bandwidth and blocker trends.

## Operational Mapping
- Phase mapping: see [WAVE5_PHASES](./WAVE5_PHASES.md)
- Execution governance: see [WAVE5_EXECUTION_PLAN](./WAVE5_EXECUTION_PLAN.md)
