# Fanzeno Phase 23 — transactional multiplayer scoring candidate

Release marker: `2026-11-02-q23-atomic-room-scoring-candidate`.

## Built in GitHub

- `supabase/proposals/atomic_room_scoring_v1.sql` contains a **review-only**, service-role-only PostgreSQL settlement function. It is deliberately NOT in `supabase/migrations`; no production or staging schema is modified by GitHub merge.
- One PostgreSQL transaction is designed to lock the room, participant and exact issued question; verify seat, mode, turn deadline and question expiry; record the verified attempt (including ability, XP and calibration); persist the answer submission; update room-player progress; and select the next room turn.
- The exact `arcade_questions.id` is the idempotency key. A retry of an already settled question returns the original recorded result, without awarding another attempt or moving the seat twice.
- The function serializes against timeout recovery by locking `arcade_rooms` first, and uses server-held issued timestamps to measure response speed. The room-question hint flag is authoritative for movement and scoring.
- `nextFairQuestion` now also returns `roomQuestionId` to the active player; `QuestionCard` sends this to `submitArcadeAnswer`.
- A server-only flag, `FANZENO_ATOMIC_ROOM_SCORING=enabled`, opts the server into the single-RPC path after deployment approval. **The default is disabled** and uses the existing scoring path. When enabled, an RPC failure or missing question ID fails closed—there is NO fallback that could double-score an attempt.
- `src/lib/atomicRoomScoring.ts` strictly validates RPC responses and provides a literal-only rollout gate.
- `tests/atomicRoomScoring.test.mjs` checks flag gating, result contracts, SQL structure, room lock/order, restricted EXECUTE grants and Snakes & Ladders board jump parity. These are **source-contract tests, not a database integration test**.
- `supabase/verification/atomic-scoring-preflight.sql` is a read-only check for required columns, installed function signature and execution grants.

## Required rollout sequence

1. **Access confirmation:** connect the Fanzeno project `hcncbiufgcodempoapbf`. The currently connected Supabase account lists **DISHBEE only**; do not inspect, modify or deploy SQL to DISHBEE.
2. **Review live schema:** take a backup and use the read-only preflight. Inspect migration ledger, actual constraints, RLS, old function bodies, grants and whether the current live client is on the expected release. Review outstanding phases 14 and 15 database migrations separately.
3. **Create a real migration:** use the Supabase CLI `supabase migration new <descriptive-name>`, placing the reviewed SQL into that CLI-generated migration. Do not apply the proposal as-is without reviewing live database differences.
4. **Stage/test:** run the migration only on the correct Fanzeno staging database. Verify anonymous/authenticated cannot execute the RPC, service role can, and the RPC does not expose answer rules or other secrets.
5. **Two-browser acceptance:** create a Quiz Ludo, Snakes & Ladders and Sports Mastermind match using two distinct accounts. Enable `FANZENO_ATOMIC_ROOM_SCORING=enabled` in staging's **server-only environment** after applying the tested function.
6. **Transaction tests:** submit correct, incorrect, passed, hinted and unhinted answers. Verify all five effects—`arcade_questions`, `question_attempts`, `arcade_submissions`, `arcade_room_players`, and `arcade_rooms`—commit together. Check the associated ability and XP updates.
7. **Idempotency:** submit the identical room-question UUID twice simultaneously and again after the turn changes. Expect exactly one attempt, one submission, one score increment and one turn movement. The replay should return `duplicate=true`.
8. **Rollback:** on a staging fixture, deliberately force a post-attempt failure (e.g. a constraint violation) and confirm *all* writes roll back, including the question reveal, ability, XP and calibration updates. Clear the fixture afterwards.
9. **Timeout race:** hold a scored-answer RPC while the other client tries the expired-turn recovery. The room lock must serialize those operations. Neither path should rewind a newer turn or award twice.
10. **Publishing:** only after the DB test matrix passes, publish the GitHub code into Fanzeno's own Lovable project and enable the server-only flag in the correct environment. Verify the public marker `2026-11-02-q23-atomic-room-scoring-candidate` with the existing public probe `enforce_publication=true`. That probe still cannot verify authenticated scoring.

## Rollback and limitations

- To turn off the candidate scoring path, remove the server flag or set it to `disabled`; do not remove DB functions while a still-running server may be using them.
- Changing the flag returns to the **legacy multi-request path**; that path is not fully atomic. Only the staged, enabled RPC is designed to be atomic.
- A SQL function called through a single PostgREST transaction will roll back on an exception, but **this proposal has not been run against the live schema**. No claims of successful real-world transaction testing are warranted.
- The existing game model represents online Quiz Ludo as a single position track to 57, while local pass-and-play shows four tokens. That difference is retained to avoid silently changing rankings.
- The code still computes answer correctness on the authenticated server using the verified answer rule; the RPC accepts a boolean only from a service-role server call. Never expose this RPC or the service credentials to browser clients.
- This proposal covers **online room answers only**. Solo question settlement, timed room creation, offline modes and payment integration are not reimplemented here.

## Source quality and review

Standard CI executes `npm run test:logic`, `npm run test:content`, `bunx tsc --noEmit` and `bun run build`. Review the full SQL and the source contract tests before merging; a green GitHub build is **not** permission to enable the untested backend switch.
