import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertQuizRaceTurnRecoverable,
  nextQuizRaceTurn,
  QUIZ_RACE_TIMEOUT_GRACE_MS,
} from "../src/lib/roomLifecycle.ts";
import { createTurnAdvanceGate, remainingTurnSeconds } from "../src/lib/mastermindAdvance.ts";

test("Quiz Race advances to next occupied seat, wrapping rounds only at last seat", () => {
  assert.deepEqual(nextQuizRaceTurn([0, 2, 3], 0, 1), { seat: 2, round: 1 });
  assert.deepEqual(nextQuizRaceTurn([3, 0, 2], 2, 1), { seat: 3, round: 1 });
  assert.deepEqual(nextQuizRaceTurn([3, 0, 2], 3, 1), { seat: 0, round: 2 });
  assert.deepEqual(nextQuizRaceTurn([3, 1], 3, 4), { seat: 1, round: 5 });
  assert.deepEqual(nextQuizRaceTurn([3, 1], 1, 4), { seat: 3, round: 4 });
});

test("Quiz Race never recovers from invalid membership, active seat or round", () => {
  for (const args of [
    [[0], 0, 1],
    [[], 0, 1],
    [[0, 1, 1], 1, 1],
    [[0, 4], 0, 1],
    [[0, 1], -1, 1],
    [[0, 1], 2, 1],
    [[0, 1], 0, 0],
    [[0, 1], 0, NaN],
    [[0, 1], 0.5, 1],
  ]) assert.throws(() => nextQuizRaceTurn(...args), /Invalid Quiz Race/);
});

test("turn recovery is server-gated until grace period expires", () => {
  const start = "2026-10-31T10:00:00.000Z";
  const end = "2026-10-31T10:03:00.000Z";
  const deadlineMs = Date.parse(end);
  for (const mode of ["quiz-ludo", "quiz-snakes-ladders"]) {
    assert.throws(
      () => assertQuizRaceTurnRecoverable(mode, "active", start, end, deadlineMs),
      /not yet expired/,
    );
    assert.throws(
      () => assertQuizRaceTurnRecoverable(
        mode, "active", start, end, deadlineMs + QUIZ_RACE_TIMEOUT_GRACE_MS - 1,
      ),
      /not yet expired/,
    );
    assert.doesNotThrow(() => assertQuizRaceTurnRecoverable(
      mode, "active", start, end, deadlineMs + QUIZ_RACE_TIMEOUT_GRACE_MS,
    ));
  }
});

test("recovery rejects lobby, completed, other game modes and invalid clock data", () => {
  const start = "2026-10-31T10:00:00.000Z";
  const end = "2026-10-31T10:03:00.000Z";
  const now = Date.parse(end) + 20_000;
  for (const mode of ["sports-mastermind", "connect-four", "anything"]) {
    assert.throws(() => assertQuizRaceTurnRecoverable(mode, "active", start, end, now), /only available/);
  }
  for (const status of ["lobby", "complete", "cancelled"]) {
    assert.throws(() => assertQuizRaceTurnRecoverable("quiz-ludo", status, start, end, now), /no longer active/);
  }
  for (const [a, b, tick] of [
    [null, end, now],
    [start, null, now],
    [end, start, now],
    ["invalid", end, now],
    [start, "invalid", now],
    [start, end, NaN],
  ]) assert.throws(
    () => assertQuizRaceTurnRecoverable("quiz-ludo", "active", a, b, tick),
    /Invalid Quiz Race turn deadline/,
  );
});

test("multiple devices cannot re-advance one expired turn through client retry gate", () => {
  const gate = createTurnAdvanceGate(8_000);
  const key = "room-a:seat0:round1:deadline";
  assert.equal(gate.claim(key, 1000), true);
  assert.equal(gate.claim(key, 1001), false);
  gate.finish(key, true, 1200);
  assert.equal(gate.claim(key, 30000), false);
  assert.equal(gate.claim("room-a:seat1:round1:next-deadline", 30000), true);
  assert.equal(remainingTurnSeconds("2026-10-31T10:03:00Z", Date.parse("2026-10-31T10:02:59.500Z")), 1);
});
