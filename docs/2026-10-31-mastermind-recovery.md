# Fanzeno Mastermind timed-turn recovery — 31 October 2026

Source marker: `2026-10-31-q18-mastermind-recovery`.

## Built in this release
- The active player's browser **or the room host** can initiate the timed handoff when Mastermind's 3-minute turn reaches zero. A disconnected active player no longer requires a manual host intervention if the host remains connected.
- One in-flight advance request per turn; success suppresses further attempts on the same stale snapshot. Server CAS on `active_seat` / `round_no` remains the authority.
- Client retries transient advance failures with an 8-second cooldown rather than sending a rejected request every second or leaving an unhandled promise rejection.
- The end-of-turn button shares the same gate, gives users clear failure feedback, and can manually retry during a cooldown.
- Countdown uses `Math.ceil` to avoid showing zero before the official deadline.
- Successful advancement invalidates room and player queries even if a realtime message was missed.
- Tests cover double request prevention, backoff/manual retry, late previous-turn responses, countdown boundaries and host/active/spectator authorization.

## Live acceptance checklist — Fanzeno project only
1. Host a two-player Mastermind room. Start the first 180-second turn. Verify the host and active player both see the same turn deadline.
2. At zero with both connected, **exactly one** seat advance occurs despite both clients sending a request. Inspect room `active_seat` and `round_no`.
3. Disconnect the active player's browser before the deadline. Keep the host online; the host must automatically initiate the expired-turn handoff.
4. Temporarily block the advance request. Verify backoff rather than one error per second. Restore connectivity; the retry should advance at most one seat.
5. On a failed manual early handoff, show the failure state and allow a further manual retry; a successful handoff clears the error.
6. Close the room or complete the final round: the stale timer must not issue another advancement request.
7. Test phone widths, keyboard focus and slow connection scenarios, including reconnecting a browser just before the deadline.
8. Verify current release marker after publishing in Lovable using the GitHub public probe with `enforce_publication=true`.

## Not claimed
The connected Supabase account lists DISHBEE rather than the Fanzeno database (`hcncbiufgcodempoapbf`). No production DB changes or two-account tests were executed. This is GitHub-source logic and build validation. A fully transactional scoring RPC and production publishing remain separate.
