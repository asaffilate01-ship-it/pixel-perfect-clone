import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeArcadePresence } from "../src/lib/arcadePresenceState.ts";

const now = Date.parse("2026-10-31T10:30:00.000Z");
const row = (user_id, status, agoMs) => ({
  user_id,
  status,
  last_seen_at: new Date(now - agoMs).toISOString(),
});

test("an online tab beats background and reconnecting tabs regardless of row order", () => {
  const rows = [
    row("player-a", "background", 2_000),
    row("player-a", "online", 4_000),
    row("player-a", "reconnecting", 100),
  ];
  assert.equal(summarizeArcadePresence(rows, now).get("player-a"), "online");
  assert.equal(summarizeArcadePresence([...rows].reverse(), now).get("player-a"), "online");
});

test("all stale tabs are offline even when their saved state said online", () => {
  const statuses = summarizeArcadePresence([
    row("stale", "online", 36_000),
    row("stale", "background", 40_000),
    row("recent", "background", 35_000),
    row("recovering", "reconnecting", 1_000),
  ], now);
  assert.equal(statuses.get("stale"), "offline");
  assert.equal(statuses.get("recent"), "background");
  assert.equal(statuses.get("recovering"), "reconnecting");
});

test("corrupt or future heartbeat timestamps cannot display phantom online players", () => {
  const statuses = summarizeArcadePresence([
    { user_id: "bad", status: "online", last_seen_at: "not-a-date" },
    { user_id: "future", status: "online", last_seen_at: new Date(now + 60_000).toISOString() },
    { user_id: "missing", status: "online", last_seen_at: "" },
    { user_id: "", status: "online", last_seen_at: new Date(now).toISOString() },
    row("good", "online", -2_000),
  ], now);
  for (const id of ["bad", "future", "missing"]) assert.equal(statuses.get(id), "offline");
  assert.equal(statuses.get("good"), "online");
  assert.equal(statuses.has(""), false);
});
