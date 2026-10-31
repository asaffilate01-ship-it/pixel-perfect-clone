# Fanzeno online-room release acceptance — 31 October 2026

## What is built in source
- PR #33: single-flight matchmaking with cancellation of stale queue requests; existing Pro entitlement check on server for premium room hosting; mandatory sport selection; ready-state invalidation on settings changes; non-zero first occupied seat; lobby recovery/error paths.
- This release gate: version marker `2026-10-31-online-rooms-reliability` and public smoke test deriving that marker from the checked-out app, requiring it on **every** checked public route.
- Unit tests for matchmaking ordering and room-seat validation; quality workflow includes source TypeScript, verified content audit and production build.

## Deployment boundary
GitHub sync to Lovable is not publication. The public probe can report accessible pages with an **old** marker while still passing unless it is explicitly run with `enforce_publication=true`. A passing probe is not an authenticated player acceptance test.

1. Ensure `main` has passed the Fanzeno quality gate.
2. Check Fanzeno's *own* Supabase project ref is `hcncbiufgcodempoapbf` and confirm phase 14–15 migration history and content quality before any migration action.
3. Confirm Lovable project `4e35e2ad-84ba-420e-a0d7-2ccf45c7afbd` synchronizes the latest commit; publish it deliberately.
4. Re-run the [public publication probe](https://github.com/asaffilate01-ship-it/pixel-perfect-clone/actions/workflows/fanzeno-live-smoke.yml) using workflow_dispatch and `enforce_publication=true`.
5. Verify the probe artifact reports `current_release_published: true`, the new marker on **all** routes and `reachable: true`.

## Signed-in acceptance in two independent browsers/accounts
- One guest can read the room invitation but cannot create or join a reserved seat without sign-in.
- Non-Pro cannot host Quiz Ludo/Mastermind by forging a client request; Pro may host; any signed-in invited guest may join where existing rules permit.
- Both players choose a sport; a player without a sport cannot mark ready; after changing a ready player's sport/avatar, ready resets.
- Host starts only when at least two seated players are ready and have sport IDs; if seat 0 is empty, the lowest occupied seat starts.
- Two accounts create/join the same room, see each other's ready state, submit a verified answer and observe the next turn without refreshing.
- In two browsers, verify reconnect after losing websocket/network, including fallback polling; do not award a second score on replay or double submission.
- Random matchmaking polls one request at a time; click Cancel during an in-flight request and verify no late redirect; after queue deletion failure retry cancellation before starting another search.
- Confirm accurate statuses and error feedback when a room is deleted, unavailable or leaving fails.
- Validate 320/375/768px mobile layout, 200% zoom, keyboard focus and screen-reader announcements in real browsers.

## Known unverified / follow-up
- Connected Supabase account was confirmed on 31 October 2026 to expose **DISHBEE only**. Never run these checks or migrations against DISHBEE.
- Live Fanzeno content totals, database/RLS configuration and two-device room tests are not proven by a GitHub-only build.
- Room scoring still comprises multiple sequential server-side writes. Before calling it fully transaction-safe, design and test an atomic database operation with Fanzeno project access, and add rollback/idempotency tests.
- The `£4.99` Pro checkout remains unavailable. Do not enable payments without authorised payment + webhook verification.

## Rollback
Revert the merge through a new GitHub revert PR if necessary; do not force-push Lovable-synced history. Diagnose and correct database state through a reviewed migration and backup procedure, never by directing queries at a different project.
