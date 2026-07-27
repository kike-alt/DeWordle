# Issue Handoff Checklist

This document explains how to use the standardized issue handoff checklist when transferring partially completed work between contributors.

## Purpose

Reduce stalled contributor threads by providing a structured handoff process that captures all necessary context.

## When to Use

- Contributor is leaving the project or going on leave
- Contributor is stuck and needs help
- Issue scope changed and original contributor cannot continue
- Maintainer reassigns issue to a different contributor

## Handoff Process

1. **Open a Handoff Issue** using the `Issue Handoff Checklist` template.
2. **Fill in all required fields** — do not leave sections empty.
3. **Link the original issue** in the "Original Issue" field.
4. **Close the original issue** with a comment linking to the handoff issue.
5. **Assign the new contributor** to the handoff issue.

## Checklist Fields

| Field | Required | Description |
|---|---|---|
| Original Issue | Yes | Link to the original issue being handed off |
| Current Status | Yes | What has been completed so far |
| Remaining Work | Yes | What still needs to be done |
| Blockers | No | Any blockers or dependencies preventing completion |
| Files Changed | Yes | List all files modified or created so far |
| Validation Evidence | No | Commands run and outcomes |
| Context Notes | No | Additional context, decisions, or gotchas |

## Handoff Quality Standards

- Be specific about what is done vs. what remains.
- Include exact file paths and line numbers where relevant.
- List all commands that have been run and their outcomes.
- Note any architectural decisions made during the work.
- Flag any potential issues the next contributor should watch for.

## Related Documentation

- [Wave 5 Issue Tracks](./WAVE5_ISSUE_TRACKS.md)
- [Contributing Guide](../../CONTRIBUTING.md)
- [Wave Glossary](./WAVE_GLOSSARY.md)
