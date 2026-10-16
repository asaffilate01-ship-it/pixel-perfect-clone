# Fanzeno — 16 October 2026 arcade release audit

This is an evidence-based repository audit, not a claim that every feature has been live-tested. The default branch before these changes was `9e042c3a` (9 October 2026). The Lovable project is linked to GitHub, but publishing the Lovable application and applying database migrations remain separate actions.

## Confirmed in source
- Sport filters, online rooms for Quiz Ludo / Snakes & Ladders / Mastermind, server-checked fair questions and answer-challenge administration
- Solo arcade views for Connect Four, Higher or Lower, crossword, Territory, Sports 501, Connections, Draft XI, Bingo, Category Tower and Stat Cards; Tic-Tac-Toe through grid play
- Question-bank migrations through verified depth phase 13; historical source references and answer aliases, scoring bands and cooldown mechanisms
- Pro entitlements and a £4.99 lifetime upgrade screen; checkout is visibly disabled in current source
- Offline/guest question paths and image/voice answer capabilities are present; actual browser/platform availability varies

## This pull request
- Phase-14 question migration: 28 additional official-source questions (snooker 8; darts, F1, NBA, NHL, MLB 4 each), 19 server-scored choice questions including true/false, 9 typed questions
- Answer-choice rendering without exposing the accepted-answer set, with server-side shuffling
- Hardened QuestionCard delayed turn callbacks, challenge window and automatic continuation
- Higher/Lower: within-metric comparisons, unbiased directions, easier/harder gap bands and repeated-pair control
- Connections: 3 editorial puzzle rotations and four-miss ending; one-away hint
- Sports 501: double-bull checkout at 50, set-up dart for otherwise-unfinishable low odd scores, and locked difficulty during an active throw
- Crossword: rotation between 3 offline practice grids, reset on difficulty/new puzzle, no score-as-answer oracle
- Connect Four: invalid column and malformed board input rejected
- Quality gate: arcade logic tests, TypeScript checking and production build on PRs and main

## Release blockers / follow-ups
1. **Fanzeno production database not connected here.** Only the DISHBEE Supabase project is currently accessible in the account connector. Do not run the Fanzeno migration against DISHBEE. Apply `20261016140000_verified_question_depth_phase_14_choice_formats.sql` to the correct Fanzeno backend and verify seed counts and fair-reservation results by each sport/difficulty.
2. Confirm Lovable sync and explicitly publish a live version. A GitHub merge is not proof that a production domain has been published.
3. Verify multi-device room turn ownership, re-joining and stalled/disconnected player recovery in browser tests. Connect Four remains CPU-only rather than authoritative realtime head-to-head.
4. The one-million-question campaign is infrastructure and targets, **not one million published questions**. Verify live totals by category, source quality and difficulty, and expand ingestion from official or licensed feeds before marketing depth claims.
5. Lifetime Pro checkout/payment webhooks, real ad network connectors and multilingual web copy remain separate deliverables.
6. Guest pass-and-play relies on human checking and is not equivalent to ranked, server-verified questions.
7. Test accessibility and phone screens for all 14 catalogue cards and the longer option choices before release. Crosswords and 501 are particularly sensitive to narrow viewports.

## Acceptance criteria
- All quality-gate checks pass at the exact merge head SHA
- Choice question accepted answers never appear in pre-answer client JSON, options are unique and present, server scoring accepts exactly the chosen option
- Incorrect answers can be challenged; room moves can only advance once and cannot be applied after changing turns
- Sports 501 is finishable on 50 and odd totals below 25; no negative/malformed board moves
- Connections ends after four wrong sets; restart offers a different board
- Local crossword play reports an offline state and never leaks scoring hints while typing
- Query the Fanzeno database after migration for each sport/difficulty count and for duplicate `content_hash` values
