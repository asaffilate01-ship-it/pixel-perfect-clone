import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  atomicRoomScoringEnabled,
  parseAtomicRoomScoreResult,
} from "../src/lib/atomicRoomScoring.ts";

const sql = fs.readFileSync(
  new URL("../supabase/proposals/atomic_room_scoring_v1.sql", import.meta.url),
  "utf8",
);

test("atomic scoring is disabled unless explicitly enabled by a server-only flag", () => {
  for (const value of [undefined, "", "true", "1", "ENABLED", "disabled", "enabled "]) {
    assert.equal(atomicRoomScoringEnabled(value), false);
  }
  assert.equal(atomicRoomScoringEnabled("enabled"), true);
});

test("atomic scoring results preserve replay and score fields but discard any extra payload", () => {
  const result = parseAtomicRoomScoreResult({
    correct: true, movement: 5, usedClue: true,
    answer: "Correct answer", duplicate: true, roomStateChanged: false,
    secret: "must not leak",
  });
  assert.deepEqual(result, {
    correct: true, movement: 5, usedClue: true,
    answer: "Correct answer", duplicate: true, roomStateChanged: false,
  });
});

test("atomic scoring refuses invalid, partial or out-of-range responses", () => {
  const base = {
    correct: true, movement: 6, usedClue: false, answer: "Answer",
    duplicate: false, roomStateChanged: false,
  };
  for (const value of [null, [], "", 0, {}, { ...base, correct: "yes" },
    { ...base, movement: 7 }, { ...base, movement: NaN },
    { ...base, answer: null }, { ...base, duplicate: "false" },
    { ...base, usedClue: undefined }]) {
    assert.throws(() => parseAtomicRoomScoreResult(value), /Invalid atomic scoring response/);
  }
});

test("SQL proposal requires row locks, one-transaction settlement and replay protection", () => {
  for (const required of [
    "create or replace function public.settle_arcade_room_answer_v1",
    "security invoker",
    "from public.arcade_rooms where id = p_room_id for update",
    "where room_id = p_room_id and user_id = p_actor_id for update",
    "for update;",
    "if v_issued.revealed_answer then",
    "return jsonb_build_object(",
    "perform public.record_verified_question_attempt(",
    "insert into public.arcade_submissions",
    "update public.arcade_room_players",
    "update public.arcade_rooms",
    "from public, anon, authenticated;",
    "to service_role;",
  ]) {
    assert.ok(sql.toLowerCase().includes(required.toLowerCase()), `Missing: ${required}`);
  }
  const executableSql = sql.split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .toLowerCase();
  assert.ok(!executableSql.includes("security definer"), "RPC must remain invoker-security");
});

test("review proposal duplicates the real game board jumps, not a different ruleset", () => {
  const jumps = {
    4: 14, 14: 28, 40: 59, 51: 71, 63: 84,
    17: 7, 32: 12, 48: 26, 69: 49, 88: 68, 96: 76,
  };
  for (const [from, to] of Object.entries(jumps)) {
    assert.ok(sql.includes(`when ${from} then ${to}`), `Missing jump: ${from} to ${to}`);
  }
  assert.ok(sql.includes("v_position := least(57, v_position + v_movement)"));
});
