# Migration Visibility Dashboard Spec

> Wave 5 · Track: DOCS/AI/AUTOMATION · Phase: 3B · ID: W5-3B-DOCS-006
> Dependency: W5-3B-AUTO-002

This document specifies the data model, reporting format, and ownership workflow for the Wave 5 migration visibility dashboard.

---

## Purpose

The dashboard provides a single-pane view of migration progress across all Wave 5 phases and tracks. It enables maintainers to identify blockers, track burndown, and communicate status to contributors without manual aggregation.

---

## Required Data Fields

### Issue / PR Data

| Field | Source | Description |
|---|---|---|
| `issue_number` | GitHub Issues API | Unique issue identifier |
| `title` | GitHub Issues API | Issue title |
| `track` | Label `track:*` | Owning track (FE, BE, SC, etc.) |
| `phase` | Label `phase:*` | Wave 5 phase (1–7) |
| `milestone` | GitHub Milestone | Milestone (M1–M7) |
| `size` | Label `size:*` | S / M / L / XL |
| `difficulty` | Label `difficulty:*` | beginner / intermediate / advanced |
| `priority` | Label `priority:*` | P0 / P1 / P2 |
| `status` | Issue state + labels | open / in-progress / blocked / merged / closed |
| `assignee` | GitHub Issues API | Assigned contributor (if any) |
| `blocker_refs` | Issue body `depends-on:` | Blocking issue numbers |
| `opened_at` | GitHub Issues API | Issue creation timestamp |
| `closed_at` | GitHub Issues API | Issue close timestamp (null if open) |
| `pr_number` | Linked PR | Associated pull request (if any) |
| `pr_merged_at` | GitHub PRs API | PR merge timestamp (null if unmerged) |

### Derived / Computed Fields

| Field | Computation | Description |
|---|---|---|
| `cycle_time_days` | `pr_merged_at - opened_at` | Issue open-to-merge duration |
| `is_blocked` | `status == blocked` | Boolean blocker flag |
| `is_overdue` | `now - opened_at > phase_sla` | SLA breach flag |
| `phase_completion_pct` | `closed / total` per phase | Phase burndown percentage |
| `track_completion_pct` | `closed / total` per track | Track burndown percentage |

---

## Refresh Cadence

| Data Type | Refresh Frequency |
|---|---|
| Issue status / labels | Every 6 hours (automated) |
| PR merge status | Every 6 hours (automated) |
| Phase burndown | Daily rollup |
| Weekly status note | Manual, published by maintainer each Monday |

---

## Dashboard Widgets → Milestone Mapping

| Widget | Milestone(s) | Description |
|---|---|---|
| **Phase Burndown Chart** | M1–M7 | Issues closed vs total per phase, updated daily |
| **Track Health Grid** | M1–M7 | Per-track open/blocked/merged counts |
| **Blocker Heatmap** | M3–M6 | Issues with active blockers, grouped by track |
| **Cycle Time Distribution** | M3–M6 | Histogram of issue open-to-merge durations |
| **SLA Breach List** | M3–M6 | Issues exceeding SLA targets, sorted by age |
| **Contributor Throughput** | M5–M6 | Merged PRs per contributor per week |
| **Testnet Readiness Gate** | M6 | Checklist of required items for testnet readiness |
| **Weekly Velocity Trend** | M3–M7 | Merged issues/week rolling 4-week average |

---

## Reporting Format

### Weekly Status Note (Markdown, published in `docs/wave/`)

```markdown
# Wave 5 Weekly Status — YYYY-MM-DD

## Summary
- Merged this week: N issues
- Blocked: N issues
- Reprioritized: N issues

## Phase Burndown
| Phase | Total | Closed | Blocked | % Done |
|---|---|---|---|---|
| Phase 3B | N | N | N | N% |

## Track Health
| Track | Open | Blocked | Merged (week) |
|---|---|---|---|
| DOCS | N | N | N |
| DEVOPS | N | N | N |
| ... | | | |

## Blockers Requiring Action
- #NNN — [title] — blocked by #NNN

## Notes
- ...
```

### Machine-Readable Export (JSON)

```json
{
  "generated_at": "ISO8601 timestamp",
  "phase_summary": [
    {
      "phase": "3b",
      "milestone": "M5",
      "total": 0,
      "closed": 0,
      "blocked": 0,
      "completion_pct": 0.0
    }
  ],
  "track_summary": [
    {
      "track": "DOCS",
      "open": 0,
      "blocked": 0,
      "merged_this_week": 0
    }
  ],
  "blockers": [
    {
      "issue_number": 0,
      "title": "",
      "blocked_by": []
    }
  ]
}
```

Export path: `docs/wave/dashboard-export.json` (auto-generated, not hand-edited).

---

## Ownership and Update Workflow

| Role | Responsibility |
|---|---|
| **Automation maintainer** | Owns the data pipeline that populates the dashboard from GitHub API |
| **DOCS maintainer** | Publishes the weekly status note in `docs/wave/` |
| **Lead maintainer** | Reviews and approves the weekly note before publishing |
| **All maintainers** | Keep issue labels (`track:*`, `phase:*`, `size:*`, `priority:*`) accurate — these are the data source |

### Update Workflow

```
GitHub Issues/PRs (labels, state)
        │
        ▼ (every 6h, automated — W5-3B-AUTO-002)
  dashboard-export.json
        │
        ▼ (daily rollup)
  Phase burndown + track health widgets
        │
        ▼ (weekly, manual)
  docs/wave/WAVE5_WEEKLY_STATUS_YYYY-MM-DD.md
```

**Label hygiene is the critical dependency.** Dashboard accuracy degrades if `track:*`, `phase:*`, or `size:*` labels are missing or incorrect on issues.

---

## Implementation Notes

- The automated data pipeline is specified in W5-3B-AUTO-002 (dependency). This spec defines the data contract that pipeline must satisfy.
- Maintainers can generate milestone-specific health summaries with:
  ```bash
  ./scripts/gen-milestone-health-report.sh M5
  ./scripts/gen-milestone-health-report.sh M6 kike-alt/DeWordle wave:5
  ```
- The generator writes both Markdown and JSON outputs under `docs/wave/`:
  - `MILESTONE_HEALTH_<milestone>.md`
  - `MILESTONE_HEALTH_<milestone>.json`
- Until automation is available, maintainers can still generate a manual snapshot using the GitHub Issues API:
  ```bash
  gh issue list --label "Stellar Wave" --state all --json number,title,labels,state,assignees,milestone --limit 200 > docs/wave/dashboard-export.json
  ```
- Dashboard widgets can be rendered as GitHub-flavored Markdown tables in the weekly status note, or as a separate web view in a future phase.

---

## Related Docs
- [Wave 5 Phases](./WAVE5_PHASES.md)
- [Wave 5 Issue Tracks](./WAVE5_ISSUE_TRACKS.md)
- [Wave 5 Execution Plan](./WAVE5_EXECUTION_PLAN.md)
- [Wave 5 Phase 2 Progress](./WAVE5_PHASE2_PROGRESS.md)
