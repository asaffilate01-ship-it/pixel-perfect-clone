import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FREE_ROOM_AVATARS,
  PRO_ROOM_AVATARS,
  canonicalRoomAvatarId,
  roomAvatarNeedsPro,
  authorizeRoomAvatar,
} from "../src/lib/roomAvatarAccess.ts";

test("all eight free and four Pro avatar IDs are distinct and authorized correctly", () => {
  const all = [...FREE_ROOM_AVATARS, ...PRO_ROOM_AVATARS];
  assert.equal(new Set(all).size, 12);
  for (const id of FREE_ROOM_AVATARS) {
    assert.equal(canonicalRoomAvatarId(id), id);
    assert.equal(roomAvatarNeedsPro(id), false);
    assert.equal(authorizeRoomAvatar(id, false), id);
  }
  for (const id of PRO_ROOM_AVATARS) {
    assert.equal(canonicalRoomAvatarId(id), id);
    assert.equal(roomAvatarNeedsPro(id), true);
    assert.throws(() => authorizeRoomAvatar(id, false), /Pro is required/);
    assert.equal(authorizeRoomAvatar(id, true), id);
  }
});

test("retired avatar IDs map to canonical IDs without bypassing Pro", () => {
  assert.equal(authorizeRoomAvatar("batter", false), "playmaker");
  assert.equal(authorizeRoomAvatar("fighter", false), "challenger");
  assert.equal(authorizeRoomAvatar("hoops", false), "playmaker");
  for (const [legacy, canonical] of [
    ["rocket", "maverick"],
    ["lion", "veteran"],
    ["eagle", "allstar"],
  ]) {
    assert.equal(canonicalRoomAvatarId(legacy), canonical);
    assert.throws(() => authorizeRoomAvatar(legacy, false), /Pro is required/);
    assert.equal(authorizeRoomAvatar(legacy, true), canonical);
  }
});

test("unknown or malformed avatar selections cannot be persisted", () => {
  for (const input of ["", "premium", "superuser", "captain ", "Captain", "__proto__", "constructor", "../../admin"]) {
    assert.equal(canonicalRoomAvatarId(input), null);
    assert.throws(() => authorizeRoomAvatar(input, true), /Unknown Fanzeno room avatar/);
  }
});

test("client avatar catalogue and server roster remain in sync", () => {
  const source = fs.readFileSync(new URL("../src/components/game/AvatarPicker.tsx", import.meta.url), "utf8");
  const clientRoster = [...source.matchAll(/\{ id: "([a-z-]+)", label: "[^"]+", img: [^,]+, color: "[^"]+", pro: (true|false) \}/g)];
  assert.equal(clientRoster.length, 12, "Unexpected client avatar catalogue shape");
  for (const match of clientRoster) {
    const id = match[1];
    const pro = match[2] === "true";
    assert.equal(canonicalRoomAvatarId(id), id);
    assert.equal(roomAvatarNeedsPro(id), pro);
  }
});
