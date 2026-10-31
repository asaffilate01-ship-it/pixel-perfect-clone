# Fanzeno verified room spectators — release acceptance (31 October 2026)

## Release identity
Source release marker: `2026-10-31-q16-verified-room-spectators`.

The commit is **not published merely because it is merged to GitHub**. After deliberately publishing via the linked Lovable project, run the existing GitHub `fanzeno-live-smoke.yml` with `enforce_publication=true` and inspect `current_release_published`.

## Code changes to verify
- The server validates ranked reservations against the active room's difficulty, the active player's sport and category. The second Mastermind round intentionally permits random sports but no category filter.
- Answer submission rejects client-submitted difficulty values that differ from the room's stored difficulty.
- The spectator endpoint requires a signed-in seat in the specific room, reads only an **unanswered** prompt issued for the current active seat and turn, and omits canonical answers, aliases, answer rules and privileged evidence.
- Spectators poll the server-backed prompt rather than inventing their own offline clue; they cannot submit, pass, challenge or advance that player’s question.
- A room with an invalid active seat, missing room data or missed realtime messages presents recovery UI instead of arbitrarily choosing seat zero.
- Mobile and Pro navigation wording should not imply a working checkout.

## Two-browser security acceptance (Fanzeno's Supabase project only)
1. Open an active room using two different accounts. The active seat loads a verified question. The spectator should see the **same prompt** within a few seconds, with no answer buttons.
2. Submit the answer on the active seat. The spectator's old prompt should disappear and the next active question should appear on the next refresh; never show canonical answer details in the spectator network response.
3. Call the spectator endpoint while signed in to an **unjoined account** with the room UUID. The request must be denied without a prompt.
4. Attempt to reserve a room question with a higher difficulty, different sport or forged category. All must be rejected before the question bank reserves an exposure.
5. For Mastermind phase two, test unrelated sport IDs but reject a category filter; ensure no accepted answer information is sent until scoring is complete.
6. Submit a genuine reserved question but override the difficulty in the answer request. Confirm rejection and no new attempt/points.
7. Close or interrupt one browser and reconnect after missed realtime events. The UI should recover the latest turn and scoreboard after fallback polling.
8. Trigger an unanswered question near expiry; ensure the read-only spectator endpoint stops displaying it after the expiry time. Repeat with a completed/closed room.
9. Check game routes on phones (320px/375px), keyboard-only input and a 200% text zoom.

## Production constraints
Fanzeno database ref is `hcncbiufgcodempoapbf`. The currently connected Supabase project in this session is **DISHBEE**, not Fanzeno. Run **no** production SQL or migrations against that other project. This PR has no schema migration. It is not possible to verify live RLS, authorisation, publication, or two-account gameplay in source-only CI.

## Follow-up — authoritative scoring
The current ranked answer handler still writes a claim, attempt, submission, player progress and next turn in separate database operations. A later Fanzeno-specific transaction/RPC change must make these operations atomic and idempotent; adding a client-side retry does **not** solve partial updates. Test concurrency and rollback on the correct backend before treating ranked multiplayer as production-verified.
