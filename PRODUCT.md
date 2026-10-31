# Fanzeno product context

## What the product is
Fanzeno is a multi-sport trivia and tactical arcade. Players explore sports knowledge through daily grids, solo puzzles and online room games. The existing implementation is a TanStack Start/React web product synchronized with Lovable, backed by Fanzeno's own Supabase project. Do not assume that the historical native mobile concept is already shipped.

## People and journeys
- Guests: discover supported sports, try clearly labelled casual/unranked modes, and understand account requirements.
- Signed-in players: complete verified questions, play supported competitive modes, manage their profile and avatar, see ranks and reconnect to rooms.
- Room hosts and friends: create/join with a code, choose sports and difficulty, receive authoritative turns/results and recover from disconnects.
- Editorial staff: review question evidence, verification, accepted-answer aliases and disputes without leaking answers prematurely.

## Product promises and boundaries
- Make the distinction between the *sports catalogue* and sports with playable content explicit.
- Ranked questions are server-validated; offline practice or pass-and-play cannot be advertised as equivalent.
- Pro entitlements exist, but the published checkout UI is currently disabled. Never use a purchase CTA that implies payment can be taken.
- Team logos, athlete likenesses and trademarked artwork require permissions; use owned abstract game artwork instead.
- Never describe a migration committed in Git as applied to production until confirmed against the correct database.
- Do not imply that all catalogue games are real-time head-to-head: some are solo/CPU/local or still in development.

## Stack and release constraints
React 19, TypeScript, TanStack Router/Start and Query, Tailwind CSS 4, Radix-based UI, Supabase (auth, data, realtime), Three.js/React Three Fiber where appropriate. Existing brand assets are in src/assets. Fanzeno database project ref: `hcncbiufgcodempoapbf`. This is not the DISHBEE project. GitHub changes sync to Lovable but publication is separate. No Lovable credit expenditure is required for source-level work.

## Success definition
A visitor understands what's playable, how each game works, whether sign-in/Pro is required and how to recover when content fails. A player can complete a session using keyboard/touch, receive clear truthful feedback and reconnect without double scoring. No visual polish counts as complete without automated checks and device/browser acceptance.

## Related
- `DESIGN.md`: owned visual direction, component rules and accessibility requirements
- `docs/2026-10-31-open-source-review.md`: external tools, adoption choices and staged plan
- `docs/2026-10-16-release-runbook.md`: pending environment and release verification
