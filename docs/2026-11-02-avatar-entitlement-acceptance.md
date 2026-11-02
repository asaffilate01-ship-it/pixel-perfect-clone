# Fanzeno Phase 24 — server-side avatar access

Release marker: `2026-11-02-q24-room-avatar-entitlements`.

## What changed

The room AvatarPicker visually disables four Fanzeno Pro avatars, but the authenticated `arcadeRoomAction({ action:"settings" })` previously accepted *any* `avatarId` and stored it in seat settings. A modified browser could select Pro characters for free or insert unknown avatar identifiers.

- The new `src/lib/roomAvatarAccess.ts` defines the eight free and four premium room avatar IDs, plus the supported retired IDs. Legacy premium aliases resolve to their canonical Pro characters and remain gated.
- The settings server action now trims/bounds incoming IDs, rejects unknown values, and calls the server-verified `can_host_game` entitlement RPC for premium avatars before changing room settings. It uses `quiz-ludo`, a known Pro-required mode, as the access check irrespective of the current room mode.
- Authorized characters are stored under canonical IDs. Existing legacy avatars remain visible via the UI's legacy mapping; this change affects new settings updates, not stored historical user profiles.
- `tests/roomAvatarAccess.test.mjs` tests the exact roster, Pro checks, legacy aliases, unknown identifiers and source parity with the avatar picker.

## Manual tests on the correct Fanzeno backend

1. Signed-in Free player in a private room can select each of the eight free characters.
2. Attempt to send a direct settings server request for `veteran`, `maverick`, `rookie`, `allstar` and retired premium aliases. Free player must receive an authorization error and the seat settings must stay unchanged.
3. Existing verified Pro user can choose all 12 characters. If entitlement RPC is temporarily unavailable, premium changes fail closed with no settings write.
4. Unknown/overlong IDs must be rejected; non-premium room settings (sport/category) must continue to work.
5. Host and participant can change avatars only before the match starts, and changing a player setting invalidates their ready state.
6. Verify mobile picker touch targets, keyboard accessibility, and avatar rendering with both legacy and current saved IDs.

## Operational boundaries

No database migration is needed for this phase. The Pro entitlement check is executed by the authenticated TanStack server, never by a client-side boolean. Source CI can validate the rules and build, but cannot verify actual entitlements without access to Fanzeno's project `hcncbiufgcodempoapbf`. The connected Supabase account currently only exposes DISHBEE; do not send any Fanzeno SQL to that unrelated project.

GitHub merge is not Lovable publication. Publish the new code only through the authorized Fanzeno project, then check `2026-11-02-q24-room-avatar-entitlements` with the public probe's `enforce_publication=true` workflow option.

Phase 23's atomic scoring remains an **opt-in proposal** and is not enabled by this release.
