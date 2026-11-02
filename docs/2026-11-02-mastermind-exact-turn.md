# Fanzeno Phase 25 — exact Mastermind turn handoff

**Release marker:** `2026-11-02-q25-mastermind-exact-turn`

## Fixed
An authenticated host or active player previously called the Mastermind advance action with only a room ID. The server read whatever seat and round happened to be current at that later moment. A delayed request or repeat from an earlier 3-minute slot could therefore advance the following player's turn.

- The authenticated `advance` action now requires `expectedSeat`, `expectedRound` and `expectedStartedAt` corresponding to the *room state the client observed*.
- The server rereads the current room turn and fails closed on missing/malformed state; mismatched snapshots return `advanced: false` rather than advancing the new seat.
- The conditional room update compares exact seat, round, start and expiry. Even two requests that both read the same turn can only update it once.
- The Mastermind UI sends these fields, includes the turn start in its single-flight key, refreshes room/player queries after success or a harmless already-advanced response, and offers a clear read-only status message for a stale request.
- `fetchRoom` now returns the authoritative `turn_started_at` for all online modes. No new table or RPC is required.
- Added regression tests for stale-seat/stale-round/stale-start, invalid values and the client/server update contract.

## Required live acceptance (Fanzeno project only)
1. Open a two-player online Mastermind room in separate signed-in browsers, with one host. Record `active_seat`, `round_no`, `turn_started_at` and `turn_ends_at`.
2. At the deadline, let both browsers attempt to advance simultaneously. There must be exactly **one** transition to the next occupied seat.
3. Replay the first browser's original request after that transition. Expect `advanced:false`; it must not skip the new player, alter scores or move the expiry.
4. Have the host manually end a live turn; immediately repeat the old action. Only the first can advance. An active participant who is not host must not advance another player's turn.
5. Test a disconnected active player: the host should still advance the expired turn and the returning player's client must refresh its room state.
6. Check both round-wrap and final-room completion, and repeat with a vacant seat zero after a participant leaves.
7. Verify 320px mobile, keyboard input, offline/reconnect, and missing or invalid room turn state.

## Release and backend boundaries
- No SQL migration or production DB mutation is included. Connected Supabase access currently exposes DISHBEE, **not** the Fanzeno project `hcncbiufgcodempoapbf`; do not run Fanzeno SQL on DISHBEE.
- GitHub source tests do not replace two-account Supabase integration tests. The proposed atomic answer settlement remains disabled pending review and staging verification on Fanzeno.
- Publishing the GitHub merge to the linked Lovable site is separate. Confirm this exact release on all public routes with the existing GitHub live probe using `enforce_publication=true`; a successful default reachability probe is **not** a publication confirmation.
- Rollback should use a regular GitHub revert PR; do not force-push to the Lovable-synced default branch.
