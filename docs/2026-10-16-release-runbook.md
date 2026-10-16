# Fanzeno phases 14–15 release procedure (16 October 2026)

## Actual status
- The GitHub game/UI changes are on `main` and production builds pass.
- Public website: https://amerfangame.lovable.app. The GitHub public probe reached home, arcade, Higher/Lower, crossword and upgrade with HTTP 200.
- The previously checked public site did **not** expose the release marker. The latest release must expose `2026-10-16-q15-multiplayer-hardened`. GitHub-to-Lovable synchronization alone does not confirm publication.
- Fanzeno Supabase project ref from `supabase/config.toml`: `hcncbiufgcodempoapbf`.
- The connected Supabase workspace in this session lists DISHBEE only. Attempting a read of Fanzeno was **permission denied**. **No Fanzeno migration has been executed during this run**. Do not use DISHBEE's connected project.

## Before touching production
1. Confirm the connected project ref is precisely `hcncbiufgcodempoapbf`, not DISHBEE (`ebzinvoxundsdubczqfg`) or another tenant.
2. Check the database migration history and `question_bank` rows to ensure phases 14 and 15 have not already been applied. Never create duplicate content or rerun an incompatible historic migration.
3. Take a routine database backup or snapshot under the team's standard retention policy.

## Controlled database content rollout
Apply in this order **only if unapplied**:
- `supabase/migrations/20261016140000_verified_question_depth_phase_14_choice_formats.sql`
- `supabase/migrations/20261016153000_phase14_source_provenance_corrections.sql`
- `supabase/migrations/20261016170000_verified_question_depth_phase_15_mixed_formats.sql`

Phase 14 inserts 28 source-backed questions. The second migration corrects three darts source references. Phase 15 adds a further 32 evidence-backed AFL, snooker, darts and Formula 1 questions, with two questions in each difficulty level per sport. All SQL should be reviewed against the existing Fanzeno backend and applied by an authorized operator only if unapplied. A committed migration is not a confirmed live import.

Then execute both read-only reports in the Fanzeno SQL editor: `supabase/verification/phase14_release_audit.sql` and `supabase/verification/phase15_release_audit.sql`. It only reads records and reports:
- 28 expected / 28 present / 28 playable, 19 playable choice questions
- Snooker 8; Darts, F1, NBA, NHL and MLB 4 each; four strict difficulty bands in every represented sport
- No missing answers or malformed options
- Phase 15: 32 expected / 32 present / 32 playable, 20 playable choice questions, AFL, snooker, darts and F1 eight each (two per difficulty band)
- Confirm the three provenance corrections were applied successfully

If fewer than the expected 60 questions appear, check for a missing `sports.slug`, an existing conflicting `content_hash`, absent `data_sources` editorial records or a failed migration before publishing. Do not advertise 28 new playable questions based only on GitHub files.

## Website publish
Open the existing [Fanzeno Lovable project](https://lovable.dev/projects/4e35e2ad-84ba-420e-a0d7-2ccf45c7afbd), inspect the synchronized `main` commit and publish the latest build to https://amerfangame.lovable.app.

After publishing, run [Fanzeno public publication probe](https://github.com/asaffilate01-ship-it/pixel-perfect-clone/actions/workflows/fanzeno-live-smoke.yml) with `enforce_publication=true`. The route probes and build-marker comparison must all pass. The probe is non-destructive and uses no credentials.

## Functional acceptance
- Signed in: answer one sourced typed question from every available difficulty band and each released sport; scoring persists once
- Multiple choice: options are unique, shuffled, correct accepted choice scores, incorrect scores zero; authoritative answers never appear before resolution
- True/false: test one correct and one incorrect response
- Resubmitting a resolved solo question or sending two simultaneous room submissions cannot award points twice
- Online room: create, join, start, answer, reconnect; check turn ownership, expiry, passes, scoreboard and `complete` finish status (two browsers)
- Mastermind: correct, incorrect and passed answers must all lead to a fresh question during the same active seat; a duplicate advance cannot skip a player
- Guest: offline crossword rotation, Higher/Lower variety, Connections rotating boards and four-strike ending; distinguish unranked manual adjudication
- Phone: run the arcade on a narrow screen; check all buttons, answer choices and board controls
- Pro checkout remains disabled pending separate payment integration; don't represent it as purchasable
- Monitor production errors and question challenge queue after publish

## Boundaries
A successful GitHub Actions build only establishes source quality. A successful public route probe establishes site reachability/version visibility, not authenticated database migration or multiplayer correctness.
