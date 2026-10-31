# Fanzeno — Quiz Race expired-turn recovery (31 October 2026)

## Release identity

GitHub source marker: `2026-10-31-q19-race-timeout-recovery`. This document covers the Quiz Ludo and Quiz Snakes & Ladders **online** modes only. Pass-and-play and CPU gameplay are unaffected.

## Implemented

- When an online Quiz Race turn reaches its deadline, answers and new question reservations already fail closed through the existing server-authoritative time checks. The new recovery path advances to the next occupied seat **after a 5-second grace period**.
- Any authenticated, currently seated participant may request timeout recovery. The server re-reads the room and members, checks status, mode and deadline, then advances using a conditional database update constrained by room ID, active seat, round, turn start and turn end. If another player has already advanced the same turn, the second request changes nothing.
- The next seat/round uses an occupied-seat list; missing seat 0 does not trap the race. A timeout does **not** grant points, apply a move or count as a pass.
- Clients show a live turn countdown, disable question controls after expiry, and retry recovery with an 8-second backoff when the server or network fails. A successful recovery refetches the room/player data even if realtime events are missed.
- The previously Mastermind-only client advance gate and countdown now expose generic names while retaining existing exports for compatibility.
- Tests cover recovery timing, invalid requests and modes, occupied seats, wrap-around rounds, duplicate requests and shared timer behaviour.

## Before production

1. Confirm GitHub source checks pass for the exact merged SHA. Do not confuse the public reachability probe with proof of publication.
2. In the **Fanzeno** Lovable project, synchronise and explicitly publish the merged commit. Confirm marker `2026-10-31-q19-race-timeout-recovery` using `fanzeno-live-smoke.yml` with `enforce_publication=true`.
3. Verify access to the **Fanzeno** Supabase project `hcncbiufgcodempoapbf` before performing any database inspection or migrations. The currently connected account only exposes DISHBEE. **Never apply Fanzeno code or SQL to DISHBEE**.
4. In two separate signed-in browsers, create and join Quiz Ludo, and then Snakes & Ladders. Confirm the countdown matches the stored room deadline and that an active player can answer before expiry.
5. Disconnect the active player, leave a second player connected and wait for expiry plus five seconds. Confirm the second player triggers a single transition to the next occupied seat, preserving points/positions and incrementing the round only on wrap.
6. Simultaneously trigger recovery from two clients; check that only one write advances the server room state. A stale or completed room must never advance.
7. Temporarily interrupt network access; the UI must show recovery feedback and retry at a reasonable interval, without indefinite unhandled errors. Reconnect and confirm state refresh.
8. Try to submit an answer after the deadline; server must deny scoring. Verify that spectator views never receive the canonical answer, even while the room is recovering.
9. Test 320px and 375px screens, 200% zoom, keyboard navigation, and background/foreground recovery on mobile.

## Known remaining high-priority backend work

This implementation uses an authoritative **conditional turn transition**, not a fully transactional scoring pipeline. Existing answer submission still performs a claim, attempt write, submission, player update and room turn update as separate database operations. For reliable, concurrent ranking, a reviewed Fanzeno-specific transaction/RPC and integration tests must precede claims of atomic scoring. A late in-flight answer versus a timeout recovery requires deliberate database-level sequencing in that phase.

No database schema migrations, new packages, new payment code or Lovable-credit usage are part of this PR. Roll back through a normal revert PR, not a force-push to the Lovable-synced repository.
