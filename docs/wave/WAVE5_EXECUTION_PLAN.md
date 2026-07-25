# Wave 5 Execution Plan

## Purpose
Wave 5 is the operational execution layer for scaling DeWordle into a serious Soroban-native open-source project.

This document orchestrates contributor operations and governance while delegating technical implementation detail to existing repository docs.

## Source-of-Truth References
- [Soroban Foundation Architecture](../SOROBAN_FOUNDATION_ARCHITECTURE.md)
- [Stellar Migration Plan](../STELLAR_MIGRATION.md)
- [Soroban SDK Guide](../SOROBAN_SDK_GUIDE.md)
- [Frontend Wallet Foundation](../FRONTEND_WALLET_FOUNDATION.md)
- [Backend Indexer Foundation](../BACKEND_INDEXER_FOUNDATION.md)
- [Soroban GitHub Strategy](../SOROBAN_GITHUB_STRATEGY.md)
- [Wave Migration Issue Candidates](../WAVE_MIGRATION_ISSUE_CANDIDATES.md)
- [ADR 0001](../adr/0001-soroban-foundation-boundaries.md)

## Wave 5 Goals
1. Execute structured migration work without architectural drift.
2. Scale contributor throughput while preserving code quality.
3. Establish predictable issue-to-merge cycles across tracks.
4. Prepare for testnet-readiness gates with measurable progress.

## Migration Objectives for Wave 5
- Expand Soroban core migration through scoped, dependency-aware issue tracks.
- Extend SDK and wallet integration with stable interfaces.
- Progress indexer and read-model infrastructure toward reliable observability.
- Enforce CI and review standards suitable for high-volume OSS contribution.

## Contributor Scaling Strategy
- Use parallel track model with explicit ownership boundaries.
- Keep most issues independently completable in 2-3 days.
- Maintain a healthy pyramid of beginner/intermediate/advanced tasks.
- Require issue templates with acceptance criteria before assignment.
- Maintain weekly rebalance of issue queues to avoid reviewer bottlenecks.

## Repository Readiness Goals
- Deterministic install/build behavior across FE/BE/Soroban.
- Stable CI feedback loops with clear failure causes.
- Reusable coding patterns documented and enforced via review.
- Operational docs aligned with current branch and milestone state.

## Maintainer Workflow Expectations
- Triage issues at least 2x/week following maintainer triage routines.
- Validate scope and dependencies before labeling `wave:ready` and moving to the **Ready** lane.
- Enforce track-based routing as defined in the repository project board conventions.
- Enforce single-track PR scope unless explicitly marked cross-track.
- Keep milestone burndown visible and updated weekly.
- Publish weekly Wave status note: completed, blocked, reprioritized.

## Contributor Review Expectations
- Contributors must link issue and checklist in PR body.
- PRs must include validation notes (commands executed, outcomes).
- Architectural changes require doc/ADR updates when applicable.
- Cross-module changes require explicit dependency note in PR.

## Anti-Abuse and Review Integrity
- No issue self-assignment without maintainer acknowledgment.
- No "drive-by" PRs lacking issue context and acceptance mapping.
- Reject low-signal bulk PRs that bypass track conventions.
- Apply temporary cooldown for repeated low-quality submissions.
- Prefer transparent feedback with required-fix checklists.

## CI/CD Expectations
- `npm ci`-based deterministic JavaScript workflows.
- Soroban CI checks for fmt/lint/check/test/build.
- All required checks must pass before merge.
- Flaky checks must be tracked as explicit maintenance issues.

## Governance Expectations
- `main` remains canonical integration branch.
- Protected branch rules apply to all Wave merges.
- Milestone scope changes require maintainer approval.
- Security-sensitive changes follow security review path.

## Wave 5 Success Metrics
- Throughput: merged PRs/week by track.
- Quality: first-pass review acceptance rate.
- Stability: CI pass rate and median rerun count.
- Cycle time: issue open-to-merge median.
- Retention: repeat contributors after first merge.
- Migration progress: completion percentage by phase/milestone.

## Roadmap Alignment
Wave 5 execution must map to the Soroban migration roadmap and phase gates in [WAVE5_PHASES](./WAVE5_PHASES.md). Any issue that does not map to a current phase should be deferred or re-scoped.
