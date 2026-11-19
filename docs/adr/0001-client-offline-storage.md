# ADR 0001: Client offline storage strategy (IndexedDB vs localStorage)

Status: Accepted

## Context
The frontend must persist in-progress game state, streaks and queued transactions across reloads and short offline periods.

## Options
| | localStorage | IndexedDB |
|---|---|---|
| API | Synchronous, blocks main thread | Asynchronous |
| Size | ~5 MB | Hundreds of MB |
| Data | Strings only | Structured, indexed objects |
| Workers | Not available | Available |

## Decision
- **localStorage**: small preferences only (theme, high-contrast, last-seen version).
- **IndexedDB**: game sessions, guess history, pending transaction queue, cached puzzle metadata.
- Wrap both behind a single storage module with a versioned schema and try/catch fallback to in-memory state (private mode, quota errors).

## Consequences
Async access in hooks; one migration path per schema version; tests must mock the storage module rather than the browser APIs.
