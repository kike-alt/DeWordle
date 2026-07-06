# Reviewer Playbook — High-Volume Wave PR Handling

> Wave 5 · Track: DOCS/DX · Phase: 3B · ID: W5-3B-DOCS-005

This playbook defines reviewer lanes, SLA targets, and reusable templates to keep review throughput high without sacrificing quality.

---

## Reviewer Lane Model

Each track has a designated primary reviewer lane. Reviewers should only pick up PRs outside their lane when their own queue is empty.

| Track | Primary Reviewer Lane | Backup Lane |
|---|---|---|
| `FE` | Frontend maintainer | DX reviewer |
| `BE` | Backend maintainer | QA reviewer |
| `SC` | Soroban/contract maintainer | Security reviewer |
| `SDK` | SDK maintainer | FE reviewer |
| `DEVOPS` | DevOps maintainer | BE reviewer |
| `QA` | QA maintainer | Any |
| `SECURITY` | Security maintainer | SC reviewer |
| `DX` | DX maintainer | DOCS reviewer |
| `DOCS` | DOCS maintainer | DX reviewer |
| `AI/AUTOMATION` | Automation maintainer | DOCS reviewer |

**Lane assignment rule:** The first reviewer to claim a PR owns it to completion unless they explicitly hand off with a comment.

---

## SLA Targets

| PR Size | First Review | Follow-up Review |
|---|---|---|
| `S` (small) | 24 hours | 12 hours |
| `M` (medium) | 48 hours | 24 hours |
| `L` (large) | 72 hours | 48 hours |
| `XL` (extra-large) | 5 business days | 48 hours |

- SLA clock starts when the PR is marked `Ready for Review` (not Draft).
- If SLA is missed, the contributor may ping the reviewer in the PR thread.
- Maintainers triage unreviewed PRs at least 2×/week.

---

## Review Checklist Template

Copy this into your review comment when starting a review:

```markdown
## Review Checklist

### Scope
- [ ] PR addresses exactly the linked issue — no scope creep
- [ ] Cross-track changes are explicitly noted and justified

### Acceptance Criteria
- [ ] All acceptance criteria from the issue are met
- [ ] Validation evidence is provided (commands run, outputs shown)

### Code Quality
- [ ] No unnecessary abstractions or dead code introduced
- [ ] Follows existing project conventions (naming, structure, patterns)
- [ ] No hardcoded secrets, credentials, or environment-specific values

### CI
- [ ] All required CI checks pass
- [ ] Any new flaky behavior is tracked as a separate issue

### Docs / ADR
- [ ] Architectural changes are reflected in docs or an ADR
- [ ] No doc drift introduced (existing docs still accurate)

### Security (if applicable)
- [ ] Auth/access boundaries unchanged or explicitly reviewed
- [ ] No new attack surface introduced without security review
```

---

## Cross-Track PR Maintainer Review Checklist

For PRs that touch multiple tracks, use this specialized checklist to ensure complete and consistent review:

Copy this into your review comment for any cross-track PR:

```markdown
## Cross-Track PR Maintainer Review Checklist

### Dependency Awareness
- [ ] All inter-track dependencies are explicitly documented in the PR description
- [ ] Changes to shared interfaces (APIs, contracts, data models) are backwards-compatible
- [ ] Version constraints are updated in all affected track's configuration files
- [ ] No circular dependencies introduced between tracks
- [ ] All dependent track maintainers are tagged for review

### Validation Expectations
- [ ] End-to-end validation performed across all affected tracks
- [ ] All track-specific tests pass (unit, integration, E2E for each touched track)
- [ ] Cross-track integration tests added or updated to cover new interactions
- [ ] Fixtures updated in all affected tracks to reflect interface changes
- [ ] Local development environment still works for all touched tracks
- [ ] Deployment sequence validated if changes require coordinated rollout

### Documentation Updates
- [ ] Track-specific READMEs updated to reflect new cross-track interactions
- [ ] Architecture diagrams updated to show new dependencies or interactions
- [ ] API docs updated for any changed cross-track APIs
- [ ] Migration guide added if changes require manual steps for track contributors
- [ ] Troubleshooting section updated for new common cross-track issues
- [ ] All affected contributor command references updated to reflect changes
```

---

## Escalation Policy

### Blocked PRs
A PR is **blocked** when:
- A dependency issue is not yet merged
- A design decision is unresolved
- CI is broken due to an infrastructure issue (not the PR's fault)

**Action:** Add the `blocked` label and leave a comment citing the blocker. Do not merge. Revisit at next triage.

### Low-Quality PRs
A PR is **low-quality** when:
- Acceptance criteria are not met
- No validation evidence is provided
- Scope significantly exceeds the linked issue
- CI is failing due to the PR's own changes

**Action:**
1. Leave a required-fix checklist comment (use the template above).
2. Request changes — do not approve.
3. If the contributor is unresponsive for 5+ business days, close the PR with a comment explaining why and invite re-submission.

### Repeated Low-Quality Submissions
If a contributor submits 3+ low-quality PRs in a wave cycle:
1. Notify the contributor with specific, constructive feedback.
2. Apply a temporary cooldown: do not assign new issues until 1 PR is successfully merged.
3. Document the pattern in the weekly Wave status note (anonymized).

### Escalation to Maintainer
Escalate to the lead maintainer when:
- A reviewer and contributor are in unresolved disagreement after 2 rounds
- A PR touches security-sensitive code and the security reviewer is unavailable
- A PR has been open >2× its SLA target with no resolution path

---

## Weekly Triage Checklist

Run this at each 2×/week triage session:

1. Scan all open PRs for SLA breaches — assign or re-assign reviewers.
2. Check `blocked` PRs — resolve or re-label if blocker is cleared.
3. Close stale PRs (no activity >10 business days after last review request).
4. Rebalance reviewer load if any lane has >5 open PRs.
5. Update the Wave status note with merged/blocked/reprioritized counts.

---

## Related Docs
- [Wave 5 Issue Tracks](./WAVE5_ISSUE_TRACKS.md)
- [Wave 5 Execution Plan](./WAVE5_EXECUTION_PLAN.md)
- [GitHub Project Board Plan](../GITHUB_PROJECT_PLAN.md)
- [GitHub Strategy](../SOROBAN_GITHUB_STRATEGY.md)
- [PR Review Template](./../.github/PULL_REQUEST_TEMPLATE.md) *(if present)*