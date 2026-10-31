# Fanzeno ranked turn and presence hardening — 31 October 2026

## Source release
Release marker: `2026-10-31-q17-ranked-turn-presence`.

This is a source-code change; GitHub merge does not publish the Lovable site or deploy a database migration.

### Fixes implemented
- Ranked reservation and answer submission require a server-readable room turn window with valid `turn_started_at` / `turn_ends_at` dates and a deadline that has not passed. No request may submit after the turn's end while the next-turn event is delayed.
- A submission is constrained to an unanswered question belonging to the current active player **and issued at or after this turn's start**. Earlier unfinished questions cannot be re-used on a later visit to the same seat. Invalid/missing expiry is rejected.
- A room's current `turn_started_at` is reused for pending-question lookups; the previous redundant room read is removed.
- Spectator query caching is partitioned by room, signed-in user and turn, avoiding a former seat's cached question appearing during account/turn switches.
- The presence hook now inspects Supabase `upsert` errors and stops claiming a successful connection when the last heartbeat could not be written or presence reads fail.
- Multiple-device presence aggregation uses a stable priority (online > background > reconnecting > offline) regardless of fetch order, with stale/invalid/future timestamps considered offline.
- A blocked localStorage store falls back to a connection-scoped device ID; overlapping heartbeat writes are coalesced.
- On room/page exit, any pending upsert settles before deleting the connection row, preventing ghost-online rows caused by a slow write landing after the delete.

### Automated checks
`npm run test:logic` includes boundary tests for room expiry, stale question issue times and malformed timestamps, plus multi-device presence ordering and freshness. CI also runs question content audit, TypeScript and production build.

### Manual and live acceptance — not certified by CI
1. Start a real ranked room with 2 different accounts. Before the deadline, correct answers score once. After the 3-minute deadline, a late answer or new reservation must be rejected.
2. Revisit a seat for a later turn while a previous question is still unresolved. Submitting the earlier question must fail without changing the scoreboard.
3. Leave/return to the active room in a second browser, then switch accounts. The spectator must never see the prior account's cached question or answer.
4. Test two browser tabs for the same player: one background, one online. Closing the online tab leaves the background tab present; after all tabs close, no active status remains after the stale window.
5. Disable localStorage; presence should still work without a crash. Simulate network/RLS failures for both the heartbeat write and presence fetch; the app should display reconnecting, never false online.
6. Check the production project ID is exactly Fanzeno's `hcncbiufgcodempoapbf`. The connector in this session still only exposes DISHBEE, so **do not run SQL or publish any changes to that other tenant**.

### Unresolved release blockers
- Ranked scoring still comprises separate database writes (claim, attempt, submission, player stats, next turn). A *fully transactional* Fanzeno-only RPC and concurrency/rollback integration tests remain a priority before claiming atomic settlement. Do not solve this by client-side retries or an untested migration.
- Lovable project must be accessible to the connected account before publishing; execute `fanzeno-live-smoke.yml` with `enforce_publication=true` to confirm this exact release marker on all routes after publishing.
- Real two-browser room gameplay, RLS and production question-bank depth cannot be verified solely by GitHub CI.

## Rollback
Revert via a normal GitHub pull request, avoiding force-push because the repository is Lovable-synced. Changes here add no database migration.
