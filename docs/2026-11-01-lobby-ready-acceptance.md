# Fanzeno room lobby: fix ready host without sport (1 November 2026)

Release marker: `2026-11-01-q22-lobby-sport-ready`.

## What was wrong

The existing database function `create_arcade_room` creates a host seat with `status='ready'` even if `p_sport_id` is null. The room lobby disabled the subject/avator controls for **every** ready seat. This meant a new host could be locked out of selecting the sport needed to start a match.

## Fix in GitHub source

- `isRoomSeatReady` counts a player as ready only if their status is `ready` **and** their chosen sport ID is nonblank.
- `canEditRoomSeat` keeps the sport/avatar controls editable for legacy hosts whose status is `ready` but sport ID is absent, while continuing to freeze fully configured ready players until they unmark ready.
- The lobby icon, ready button, disabled state, host Start-match permission check and guidance text use those same rules.
- The hint and spectator text accurately describe live question and scoreboard visibility without claiming spectators can see submitted canonical answers.
- Tests cover normal ready players, missing sport, invalid legacy host state and disabled editing after game start or during a request.

## Live acceptance — correct Fanzeno account only

1. Create a private room as a new user with no default sport. The host should see a sport picker and a disabled 'Choose your sport first' ready button even if the database row initially says ready.
2. Choose a sport: the server updates settings and resets status to `active`. The player can now press `Mark me ready`; the picker then locks until they change ready.
3. Join a second account; configure their sport; mark both ready. Host Start-match becomes enabled and the room launches with valid chosen sports.
4. Test a host who already has sport/status ready; they must be able to unmark ready before changing it.
5. Confirm the server still rejects starting matches where any player has an absent sport, regardless of the UI's local state.
6. Check mobile/keyboard focus, room invite navigation and reconnects.

No SQL migrations were added and no live database was touched. Fanzeno's Supabase project `hcncbiufgcodempoapbf` is not available through the current connection, which lists DISHBEE only. Source publication through Lovable is a separate step. Confirm `2026-11-01-q22-lobby-sport-ready` on the public site only **after** publishing, via the live probe with `enforce_publication=true`.

The future backend cleanup should change `create_arcade_room` to insert `status='active'` when `p_sport_id` is null, but that requires a reviewed migration against Fanzeno's database. This release fixes the user-facing deadlock without touching the schema.
