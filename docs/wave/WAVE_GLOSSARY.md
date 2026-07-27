# Wave Glossary

This glossary defines labels, milestones, dependency terms, and other Wave-specific vocabulary used across the DeWordle project.

## Labels

### Track Labels
| Label | Description |
|---|---|
| `track:FE` | Frontend UX, wallet integration surfaces, view-layer states |
| `track:BE` | Backend indexer, projections, APIs, processing workers |
| `track:SC` | Soroban smart contracts and contract tests |
| `track:SDK` | TypeScript/Rust client abstractions and event tooling |
| `track:DEVOPS` | CI/CD, release workflows, environment automation |
| `track:QA` | Automated/manual validation, regression and integration checks |
| `track:SECURITY` | Auth boundaries, replay safety, threat mitigation tasks |
| `track:DX` | Contributor ergonomics, scripts, local setup improvements |
| `track:DOCS` | Operational/technical documentation updates |
| `track:AI/AUTOMATION` | Triage tooling, workflow automation, quality helpers |

### Size Labels
| Label | Points | Description |
|---|---|---|
| `size:S` | 1 | 2-6 hours, focused, low dependency |
| `size:M` | 3 | 1-3 days, moderate scope, single track |
| `size:L` | 5 | 3-7 days, larger scope, may touch two modules |
| `size:XL` | 8 | 1+ week, complex, multi-step delivery with checkpoints |

### Difficulty Labels
| Label | Description |
|---|---|
| `difficulty:beginner` | Suitable for new contributors, minimal context required |
| `difficulty:intermediate` | Requires understanding of project architecture |
| `difficulty:advanced` | Deep expertise needed, may involve cross-module changes |

### Priority Labels
| Label | Description |
|---|---|
| `priority:P0` | Critical — must be addressed immediately |
| `priority:P1` | High — should be addressed in current phase |
| `priority:P2` | Normal — address when capacity allows |

### Phase Labels
| Label | Description |
|---|---|
| `phase:1` | Repository Audit and Stabilization |
| `phase:2` | Soroban Migration Expansion |
| `phase:3` | Wallet + SDK Integration Expansion |
| `phase:4` | Backend Observability and Reliability |
| `phase:5` | CI/CD and Release Hardening |
| `phase:6` | Quality Assurance and Test Automation |
| `phase:7` | Documentation and Contributor Experience |

### Status Labels
| Label | Description |
|---|---|
| `blocked` | Cannot proceed due to unresolved dependency |
| `needs-design` | Requires design discussion before implementation |
| `needs-reviewer` | Ready for review but no reviewer assigned |
| `cross-track` | Spans multiple tracks, requires coordination |
| `wave:ready` | Scoped, dependency-clear, ready for assignment |

## Milestones

| Milestone | Description |
|---|---|
| `W5-M1: Baseline Stabilized` | CI reliability, lockfile integrity, workflow consistency |
| `W5-M2: Soroban Contract Expansion` | Incremental contract capabilities behind passing CI |
| `W5-M3: Wallet + SDK Integration` | Reusable integration primitives with docs and examples |
| `W5-M4: Backend Observability` | Indexer health, monitoring, alerting infrastructure |
| `W5-M5: CI/CD Hardening` | Release pipeline, deployment automation, rollback readiness |
| `W5-M6: Quality Gate` | Test coverage targets, regression detection, performance budgets |
| `W5-M7: Documentation Complete` | Contributor docs, ADRs, operational runbooks finalized |

## Dependency Terms

| Term | Description |
|---|---|
| `depends-on` | Metadata linking an issue to a prerequisite issue |
| `blocked` | Issue cannot start until dependency is resolved |
| `cross-track` | Dependency spans multiple contributor tracks |
| `dependency drift` | Upstream changes breaking downstream issue assumptions |
| `dependency map` | Visual representation of issue dependencies (see `WAVE5_PHASE3_DEPENDENCY_MAP.md`) |

## Workflow Terms

| Term | Description |
|---|---|
| `wave` | A batch of coordinated issues executed in parallel tracks |
| `track` | A functional area of the codebase with dedicated contributors |
| `phase` | A sequential execution gate within a wave |
| `milestone` | A collection of related phases forming a delivery target |
| `rebalance` | Weekly adjustment of issue queues based on reviewer bandwidth |
| `drift` | Issues progressing without maintainer visibility or coordination |

## Acronyms

| Acronym | Meaning |
|---|---|
| FE | Frontend |
| BE | Backend |
| SC | Soroban Contracts |
| SDK | Software Development Kit |
| QA | Quality Assurance |
| DX | Developer Experience |
| ADR | Architecture Decision Record |
| CI | Continuous Integration |
| CD | Continuous Deployment |
| OSS | Open Source Software |
| PR | Pull Request |
| ETA | Estimated Time of Arrival |

## Related Documentation

- [Wave 5 Execution Plan](./WAVE5_EXECUTION_PLAN.md)
- [Wave 5 Issue Tracks](./WAVE5_ISSUE_TRACKS.md)
- [Wave 5 Phases](./WAVE5_PHASES.md)
- [Contributing Guide](../../CONTRIBUTING.md)
