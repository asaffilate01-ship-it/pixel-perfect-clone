# Fanzeno: server-verified hints and fair scoring (1 November 2026)

Release marker: `2026-11-01-q21-server-verified-clues`.

## What is built

- Signed-in ranked question reservations no longer disclose `clue` in the answer/question payload. A clue becomes available only through the authenticated `revealFairClue` action, after the server confirms an active reservation.
- For online rooms the action verifies the active seat, current turn and question ID, requires a live unresolved question, and sets `arcade_questions.revealed_clue = true` **before** returning the hint.
- For solo verified questions the action verifies the player's latest question exposure and checks for an existing answer attempt. It persists `hint_used: true` in the exposure's existing `selection_scope` JSON before returning the hint.
- Both paths refuse empty/nonexistent clues; the UI presents a recoverable error instead of charging a player for a missing hint.
- Ranked scoring now derives hint usage from persisted room/exposure data. A modified client cannot erase the penalty by sending `usedClue: false`; legacy clients that declare true are conservatively treated as hint users.
- The UI locks answer/pass controls during the hint request, supports retry on network failures, and uses the server-returned usage flag in the resolved game outcome. Guest pass-and-play hints remain explicitly human-adjudicated and unranked.
- The prior release's server-derived elapsed-time scoring and conditional room-turn update remain in place.

## Regression tests and code checks

`tests/verifiedHint.test.mjs` checks immutable ranked penalties and rejects blank/unverified hint text. The standard logic/content/typecheck/production build CI applies to the complete change. No new npm packages are installed.

## Production acceptance checklist (Fanzeno only)

1. On a signed-in ranked question, inspect the initial `nextFairQuestion` response: `clue` must be null even though the answer remains hidden.
2. Press `Get clue`; the client must receive the clue only after an authorized server write. The display updates to the returned text and cannot be used twice to reset the penalty.
3. In an online room inspect `arcade_questions.revealed_clue`; in solo mode inspect the most recent `question_exposures.selection_scope.hint_used`.
4. Submit a correct answer with `usedClue:false` from a modified client **after** receiving the hint. Server progress must still use the reduced hinted move and question-attempt calibration must record `used_clue=true`.
5. Attempt to request another player's question hint, an answered question's hint, or a hint for an expired turn. All should fail without returning the text.
6. With no verified hint supplied, the action should fail before writing the usage flag; normal answer/pass controls remain usable.
7. Simulate network failure during the hint request, then retry. A persisted hint must never be treated as free just because the response was lost.
8. Check two accounts across Quiz Race and Mastermind, plus solo, small-screen and keyboard flows.

## Security and deployment boundaries

The existing SQL schema already contains `arcade_questions.revealed_clue` and `question_exposures.selection_scope`; **no new database migration** is required for the source changes.

The **fully atomic** ranked scoring transaction is still outstanding. Concurrent hint/answer requests can race until one transaction owns all scoring steps. This source release reduces client-controlled score inflation but must not be represented as a complete transactional solution.

Fanzeno Supabase project: `hcncbiufgcodempoapbf`. The connected Supabase account currently exposes only DISHBEE. No Supabase SQL or Lovable credits were used. Merging into GitHub does **not** publish the live site; publish from the authorized Fanzeno Lovable workspace and run `fanzeno-live-smoke.yml` with `enforce_publication=true` before claiming the release is live.
