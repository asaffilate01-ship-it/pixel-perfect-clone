# Fanzeno ranked scoring: trusted speed and turn reconciliation

Release marker: `2026-11-01-q20-trusted-speed-cas`.

## Shipped in GitHub source

- `record_verified_question_attempt` no longer receives `responseMs` supplied by an untrusted device. The server computes response elapsed time from the selected `arcade_questions.issued_at` (online) or `question_exposures.exposed_at` (solo). This removes an easy way to claim a 0ms answer and inflate the rank speed bonus.
- Reservation-time checks reject missing, invalid and substantially future-dated timestamps, and clamp elapsed milliseconds to the signed PostgreSQL integer range.
- Quiz Race uses the same tested `nextQuizRaceTurn` helper for normal scored progression and expired-turn recovery.
- Before advancing a scored Quiz Race turn, the server verifies the returned room still matches the active seat and room turn start. The turn update is conditional on active seat, round number and turn start and returns a `roomStateChanged` flag when another request already advanced it. This prevents a late accepted answer from rewinding someone else's turn.
- Existing replay and current-turn checks remain in place. No new dependencies or database migrations are applied.

## Verification

Source CI: `npm run test:logic`, `npm run test:content`, `bunx tsc --noEmit`, `bun run build`.

Manual integration acceptance, only when the **correct** Fanzeno Supabase account is available:

1. Claim a verified solo question; wait 15 seconds; submit a correct answer with a forged `responseMs: 0`. Confirm the stored attempt uses approximately 15 seconds plus network delay, not zero.
2. Repeat in a ranked room with two accounts and compare `question_attempts.response_ms` against `arcade_questions.issued_at`.
3. Submit just before a turn deadline while another browser initiates timeout recovery. Confirm the room does not move *back* to the original seat or overwrite the recovery timestamp.
4. Attempt a duplicate submission: it must not record an additional attempt or additional room points.
5. Confirm earned answer points, passes, ranking and next-seat order for Quiz Ludo, Snakes & Ladders, and Mastermind.
6. Reconnect a spectator and verify that no canonical answer appears in their room question response.

## Still blocked: atomic, idempotent scoring

The current pipeline still has multiple separate calls: mark `arcade_questions.revealed_answer`, write the verified attempt and calibration, insert the submission, update player statistics, update the room. **If a later step fails, an earlier step may have committed.** The conditional turn update cannot roll those changes back. It mitigates a stale room-state overwrite but does not guarantee whole-answer atomicity.

Next backend phase: wrap those actions in one `service_role`-only Postgres function with row-level locks on room and question, atomic updates/rollback, replay detection on the room-question ID, and a transaction test covering timeout recovery and two competing submits. Verify current migration ledger and function signature first. Do not enable a new RPC until its database migration and two-account integration tests pass on Fanzeno.

The connected Supabase account currently lists DISHBEE only, not Fanzeno project `hcncbiufgcodempoapbf`. No production SQL is run and no Lovable credits are used. Publishing must be done separately, then the public release probe run with `enforce_publication=true`.
