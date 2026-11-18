# Matchmaking API and database disaster recovery

## Matchmaking API (#1709)
> Endpoint paths below follow the REST conventions used by the backend; confirm exact routes against the matchmaking controller / OpenAPI spec when reviewing.

| Method | Path | Description |
|---|---|---|
| POST | `/matchmaking/queue` | Join the queue. Body: `{ "playerId": string, "mode": string }`. Returns `202` with `{ ticketId }`. |
| DELETE | `/matchmaking/queue/:ticketId` | Leave the queue. Returns `204`. |
| GET | `/matchmaking/queue/:ticketId` | Ticket status: `waiting`, `matched`, `expired`. When matched, includes `sessionId`. |
| GET | `/matchmaking/matches/:sessionId` | Match details (players, puzzle day, state). |

Errors: `400` invalid body, `401` unauthenticated, `404` unknown ticket or match, `409` already queued, `429` rate limited.

## Runbook: database disaster recovery from automated backup (#1710)
**When to use:** primary PostgreSQL is lost, corrupted, or must be rolled back.

1. **Declare** the incident, pause writes (maintenance mode / stop the API and indexer workers).
2. **Locate** the latest good backup in the backup directory or bucket; verify its checksum and timestamp.
3. **Provision** a clean PostgreSQL instance of the same major version.
4. **Restore**: `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <dump>` (or `psql "$DATABASE_URL" < dump.sql` for plain dumps).
5. **Verify**: row counts for `users`, `sessions`; run a read query through the API; check migrations are at the expected version.
6. **Re-point** `DATABASE_URL` and restart the API, then BullMQ workers and the indexer.
7. **Reconcile**: the indexer replays ledger events from the last restored ledger to close the data gap.
8. **Post-incident**: record data loss window (RPO), time to recover (RTO), and follow-ups.

Test this runbook against a staging restore at least quarterly.
