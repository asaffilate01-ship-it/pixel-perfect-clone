import { test } from "node:test";
import assert from "node:assert/strict";
import { canAdvanceMastermindTurn, createMastermindAdvanceGate, remainingMastermindSeconds } from "../src/lib/mastermindAdvance.ts";

test("only one advancement runs for a turn; success cannot skip a second seat", () => {
  const gate = createMastermindAdvanceGate();
  assert.equal(gate.claim("room-a:seat0:round1", 10_000), true);
  assert.equal(gate.claim("room-a:seat0:round1", 10_100), false);
  gate.finish("room-a:seat0:round1", true, 10_200);
  assert.equal(gate.claim("room-a:seat0:round1", 60_000), false);
  assert.equal(gate.claim("room-a:seat1:round1", 60_000), true);
});

test("network errors back off; a manual retry may bypass the delay", () => {
  const gate = createMastermindAdvanceGate(8_000);
  assert.equal(gate.claim("turn", 10_000), true);
  gate.finish("turn", false, 10_100);
  assert.equal(gate.claim("turn", 18_099), false);
  assert.equal(gate.claim("turn", 18_100), true);
  gate.finish("turn", false, 18_200);
  assert.equal(gate.claim("turn", 18_250, true), true);
  gate.finish("turn", true, 18_300);
  assert.equal(gate.claim("turn", 20_000, true), false);
});

test("late completion from an old room turn cannot mark the new turn completed", () => {
  const gate = createMastermindAdvanceGate();
  assert.equal(gate.claim("round1", 1_000), true);
  assert.equal(gate.claim("round2", 2_000), true);
  gate.finish("round1", true, 3_000);
  assert.equal(gate.claim("round2", 3_000), false);
  gate.finish("round2", false, 3_100);
  assert.equal(gate.claim("round2", 3_200), false);
  assert.equal(gate.claim("round2", 11_100), true);
});

test("deadline shows one second until the actual last millisecond, never early zero", () => {
  const end = "2026-10-31T12:03:00.000Z";
  const endMs = Date.parse(end);
  assert.equal(remainingMastermindSeconds(end, endMs - 500), 1);
  assert.equal(remainingMastermindSeconds(end, endMs - 1), 1);
  assert.equal(remainingMastermindSeconds(end, endMs), 0);
  assert.equal(remainingMastermindSeconds(end, endMs + 1), 0);
  assert.equal(remainingMastermindSeconds(null, endMs), null);
  assert.equal(remainingMastermindSeconds("bad", endMs), null);
  assert.equal(remainingMastermindSeconds(end, NaN), null);
});

test("host can hand off for a disconnected active player, spectators cannot", () => {
  assert.equal(canAdvanceMastermindTurn("seat1", "host", "seat1", "active"), true);
  assert.equal(canAdvanceMastermindTurn("host", "host", "seat1", "active"), true);
  assert.equal(canAdvanceMastermindTurn("spectator", "host", "seat1", "active"), false);
  assert.equal(canAdvanceMastermindTurn(null, "host", "seat1", "active"), false);
  assert.equal(canAdvanceMastermindTurn("host", "host", "seat1", "complete"), false);
  assert.equal(canAdvanceMastermindTurn("host", "host", "seat1", "lobby"), false);
});
