# Fanzeno Phase 26 — recovering a settled answer after a lost response

**Source release:** `2026-11-02-q26-room-answer-recovery`

## Fixed gameplay failure

In online Mastermind, the room's active player can answer several questions during one 3-minute turn. If the server successfully records an answer but the browser loses its HTTP response, the local question index does not advance. Retrying the same answer may be rejected as already answered, leaving that player stuck on the previous prompt until the turn expires.

## Implementation

- New authenticated, read-only `recoverMyRoomAnswer` server action keyed to the **exact room-question UUID and room UUID**.
- A caller may recover **only a question issued to their own authenticated user ID**, including a question in a previous turn. A spectator, another room player, or a guessed room-question ID cannot recover another player's canonical answer.
- Only a verified, already revealed question **with both a saved `arcade_submissions` row and its matching `question_attempts` record** is treated as confirmed. If the question is unresolved, the result is `settled:false`; if the question was claimed without both records, it is flagged `needsReview:true` instead of returning the canonical answer.
- Response data contains only confirmed correct/incorrect status, whether a hint was used, pass state and canonical answer. No submitted text, answer rules, aliases, user IDs, leaderboard/calibration data or service credentials are serialized.
- QuestionCard checks the saved receipt after a failed submit request and lets the user manually select **Check saved result** if needed. A confirmed result follows the existing reveal and next-question flow, without calling the scoring action again.
- When the read finds an incomplete record, the UI blocks duplicate answer and hint actions and displays a clear review warning. This is a safety fallback, not an automatic scoring repair.
- `tests/roomAnswerRecovery.test.mjs` covers the privacy projection, impossible answer/movement combinations, and a source contract requiring authenticated, read-only receipt access.
- No schema migration or new runtime dependency is needed.

## Acceptance on the correct Fanzeno Supabase project

1. Create a two-player online Mastermind room. Answer a verified question, then simulate the server's response being lost **after** the database commit. The client should recover the saved result and advance to the next question without a second submission.
2. Repeat with Quiz Ludo and Quiz Snakes & Ladders. Verify a recovered result never advances the room or player a second time; only the original scoring operation does.
3. With a second signed-in user, try querying the first player's room-question UUID. The server must deny access regardless of shared room membership.
4. Test an unresolved question: the endpoint must return `settled:false` and must not reveal the answer.
5. Create a staging-only fixture where `arcade_questions.revealed_answer = true` but the submission or attempt is missing. The receipt must be marked incomplete and **must not** reveal the answer or suggest blindly resubmitting.
6. Check recovery of a passed, wrong, right, hinted and unhinted question; verify the displayed outcome and next question count.
7. Verify 320px screen, keyboard navigation, offline/reconnect, and stale component cleanup after changing turns or leaving the room.
8. Verify this exact release marker on all public routes only after actual publication.

## Remaining database work

**Do not confuse a recorded answer with fully atomic scoring.** The existing legacy server still writes the question claim, verified attempt, submission, player progress and next turn in separate transactions. An incomplete record needs administrative review; the UI cannot repair missing database points safely.

The proposed single-transaction scoring RPC from Phase 23 remains deliberately disabled and is **not** deployed. Its staging rollout, schema reconciliation, execution privileges, concurrency and transaction rollback tests must be completed on Fanzeno before activation.

The connected Supabase account currently exposes only unrelated DISHBEE, not Fanzeno project `hcncbiufgcodempoapbf`. No database SQL, production writes or Lovable credits are used in this source release. A successful GitHub build does not publish the Lovable site.
