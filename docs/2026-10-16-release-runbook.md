# Fanzeno phase-14 launch procedure (16 October 2026)

## Actual status
- The GitHub game/UI changes are on `main` and production builds pass.
- Public website: https://amerfangame.lovable.app. The GitHub public probe reached home, arcade, Higher/Lower, crossword and upgrade with HTTP 200.
- The published site does **not yet expose** the build marker `2026-10-16-q14-hardened`. GitHub-to-Lovable synchronization does not prove that Publish was pressed.
- Fanzeno Supabase project ref from `supabase/config.toml`: `hcncbiufgcodempoapbf`.
- The connected Supabase workspace in this session lists DISHBEE only. Attempting a read of Fanzeno was **permission denied**. **No Fanzeno migration has been executed during this run**. Do not use DISHBEE's connected project.

## Before touching production
1. Confirm the connected project ref is precisely `hcncbiufgcodempoapbf`, not DISHBEE (`ebzinvoxundsdubczqfg`) or another tenant.
2. Check the database migration history and `question_bank` rows to ensure phase 14 has not already been applied. Never create duplicate content or rerun an incompatible historic migration.
3. Take a routine database backup or snapshot under the team's standard retention policy.

## Controlled database content rollout
Apply in this order **only if unapplied**:
- `supabase/migrations/20261016140000_verified_question_depth_phase_14_choice_formats.sql`
- `supabase/migrations/20261016153000_phase14_source_provenance_corrections.sql`

The first inserts 28 source-backed questions using idempotent content hashes and existing foreign keys. The second corrects event-specific citations for three darts questions. Both scripts should be run against Fanzeno alone by an authorized operator after confirming preceding migrations exist.

Then execute `supabase/verification/phase14_release_audit.sql` in the Fanzeno SQL editor. It only reads records and reports:
- 28 expected / 28 present / 28 playable, 19 playable choice questions
- Snooker 8; Darts, F1, NBA, NHL and MLB 4 each; four strict difficulty bands in every represented sport
- No missing answers or malformed options
- Confirm the three provenance corrections were applied successfully

If fewer than 28 appear, check for a missing `sports.slug`, an existing conflicting `content_hash`, absent `data_sources` editorial records or a failed migration before publishing. Do not advertise 28 new playable questions based only on GitHub files.

## Website publish
Open the existing [Fanzeno Lovable project](https://lovable.dev/projects/4e35e2ad-84ba-420e-a0d7-2ccf45c7afbd), inspect the synchronized `main` commit and publish the latest build to https://amerfangame.lovable.app.

After publishing, run [Fanzeno public publication probe](https://github.com/asaffilate01-ship-it/pixel-perfect-clone/actions/workflows/fanzeno-live-smoke.yml) with `enforce_publication=true`. The route probes and build-marker comparison must all pass. The probe is non-destructive and uses no credentials.

## Functional acceptance
- Signed in: answer one sourced typed question from every available difficulty band and each released sport; scoring persists once
- Multiple choice: options are unique, shuffled, correct accepted choice scores, incorrect scores zero; authoritative answers never appear before resolution
- True/false: test one correct and one incorrect response
- Resubmitting a resolved solo question or sending two simultaneous room submissions cannot award points twice
- Online room: create, join, start, answer, reconnect; check turn ownership, expiry, passes, scoreboard and finish (two browsers)
- Guest: offline crossword rotation, Higher/Lower variety, Connections rotating boards and four-strike ending; distinguish unranked manual adjudication
- Phone: run the arcade on a narrow screen; check all buttons, answer choices and board controls
- Pro checkout remains disabled pending separate payment integration; don't represent it as purchasable
- Monitor production errors and question challenge queue after publish

## Boundaries
A successful GitHub Actions build only establishes source quality. A successful public route probe establishes site reachability/version visibility, not authenticated database migration or multiplayer correctness.
