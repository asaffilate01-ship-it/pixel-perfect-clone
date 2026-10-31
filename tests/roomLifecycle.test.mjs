import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOM_COMPLETE_STATUS, isArcadeRoomComplete, firstOccupiedSeat, nextMastermindTurn, assertRoomQuestionScope, assertRoomAnswerDifficulty, publicRoomQuestion, assertActiveRoomTurnWindow, assertQuestionIssuedThisTurn } from "../src/lib/roomLifecycle.ts";

test("database completion status is complete, with legacy display compatibility", () => {
  assert.equal(ROOM_COMPLETE_STATUS, "complete");
  assert.equal(isArcadeRoomComplete("complete"), true);
  assert.equal(isArcadeRoomComplete("finished"), true);
  for (const state of ["lobby", "active", "cancelled", null, undefined]) {
    assert.equal(isArcadeRoomComplete(state), false);
  }
});

test("Mastermind advances every occupied seat and wraps only at last seat", () => {
  assert.deepEqual(nextMastermindTurn([0, 2, 3], 0, 1), { seat: 2, round: 1, complete: false });
  assert.deepEqual(nextMastermindTurn([3, 0, 2], 2, 1), { seat: 3, round: 1, complete: false });
  assert.deepEqual(nextMastermindTurn([3, 0, 2], 3, 1), { seat: 0, round: 2, complete: false });
  assert.deepEqual(nextMastermindTurn([3, 0, 2], 3, 2), { seat: 0, round: 3, complete: true });
});

test("Mastermind rejects invalid seats, missing players and invalid rounds", () => {
  for (const args of [
    [[0], 0, 1], [[0, 1], 2, 1], [[-1, 0], -1, 1],
    [[0, 4], 0, 1], [[0, 1], 0, 0], [[0, 1], 0, NaN],
  ]) assert.throws(() => nextMastermindTurn(...args), /Invalid active room/);
});

test("a match starts at the first occupied room seat, even when seat zero is vacant", () => {
  assert.equal(firstOccupiedSeat([0, 1]), 0);
  assert.equal(firstOccupiedSeat([3, 1, 2]), 1);
  assert.equal(firstOccupiedSeat([2, 3]), 2);
  for (const seats of [[0], [], [0, 0], [-1, 2], [1, 4], [1, NaN], [0, 1, 2, 3, 4]]) {
    assert.throws(() => firstOccupiedSeat(seats), /Invalid occupied room seats/);
  }
});

test("ranked questions must match server-owned difficulty, player sport and category", () => {
  const room = { modeSlug: "quiz-ludo", roundNo: 1, difficulty: 3 };
  const player = { sportId: "football", categoryKey: "premier-league" };
  const correct = { sportId: "football", categoryKey: "premier-league", difficulty: 3 };
  assert.doesNotThrow(() => assertRoomQuestionScope(room, player, correct));
  assert.throws(
    () => assertRoomQuestionScope(room, player, { ...correct, difficulty: 4 }),
    /difficulty/,
  );
  assert.throws(
    () => assertRoomQuestionScope(room, player, { ...correct, sportId: "nba" }),
    /sport/,
  );
  assert.throws(
    () => assertRoomQuestionScope(room, player, { ...correct, categoryKey: null }),
    /category/,
  );
  assert.throws(
    () => assertRoomQuestionScope({ ...room, roundNo: 0 }, player, correct),
    /round/,
  );
  assert.throws(
    () => assertRoomQuestionScope(room, { sportId: null, categoryKey: null }, correct),
    /sport/,
  );
});

test("Mastermind all-sports round allows varied sports but not category filtering", () => {
  const room = { modeSlug: "sports-mastermind", roundNo: 2, difficulty: 2 };
  const player = { sportId: "football", categoryKey: "premier-league" };
  assert.doesNotThrow(() =>
    assertRoomQuestionScope(room, player, { sportId: "cricket", categoryKey: null, difficulty: 2 }),
  );
  assert.throws(
    () => assertRoomQuestionScope(room, player, { sportId: "cricket", categoryKey: "ipl", difficulty: 2 }),
    /cannot be filtered/,
  );
  assert.throws(
    () => assertRoomQuestionScope({ ...room, roundNo: 1 }, player, { sportId: "cricket", categoryKey: null, difficulty: 2 }),
    /sport/,
  );
  assert.throws(
    () => assertRoomQuestionScope(room, player, { sportId: "cricket", categoryKey: null, difficulty: 4 }),
    /difficulty/,
  );
});

test("room answer difficulty checks reject client overrides and invalid room records", () => {
  for (const d of [1, 2, 3, 4]) assert.doesNotThrow(() => assertRoomAnswerDifficulty(d, d));
  for (const [roomDifficulty, supplied] of [[2, 4], [4, 1], [0, 1], [5, 4], [NaN, 2]]) {
    assert.throws(() => assertRoomAnswerDifficulty(roomDifficulty, supplied), /difficulty/);
  }
});

test("spectator payload excludes the canonical answer even if input includes it", () => {
  const input = {
    id: "question-123",
    prompt_i18n: { en: "Which athlete won this competition?" },
    issued_at: "2026-10-31T11:00:00Z",
    answer_rule: { accepted: ["SECRET ANSWER"] },
    answer_display_i18n: { en: "SECRET ANSWER" },
    source_url: "https://example.invalid/source",
  };
  const visible = publicRoomQuestion(input);
  assert.deepEqual(visible, {
    id: "question-123",
    prompt: "Which athlete won this competition?",
    issuedAt: "2026-10-31T11:00:00Z",
  });
  assert.equal(JSON.stringify(visible).includes("SECRET ANSWER"), false);
});

test("expired, future and malformed room turns cannot reserve or submit ranked answers", () => {
  const start = "2026-10-31T10:00:00.000Z";
  const end = "2026-10-31T10:03:00.000Z";
  const tick = Date.parse("2026-10-31T10:02:00.000Z");
  assert.doesNotThrow(() => assertActiveRoomTurnWindow(start, end, tick));
  assert.doesNotThrow(() => assertActiveRoomTurnWindow(start, end, Date.parse(start)));
  for (const [a, b, now] of [
    [start, end, Date.parse(end)],
    [start, end, Date.parse(end) + 1],
    [start, end, Date.parse(start) - 1],
    [null, end, tick],
    [start, null, tick],
    ["not a date", end, tick],
    [start, "not a date", tick],
    [end, start, tick],
    [start, end, NaN],
  ]) assert.throws(() => assertActiveRoomTurnWindow(a, b, now), /room turn/);
});

test("answers cannot reuse an unresolved question from a previous room turn", () => {
  const oldIssued = "2026-10-31T10:00:10.000Z";
  const newTurnStart = "2026-10-31T10:00:30.000Z";
  const currentIssued = "2026-10-31T10:00:31.000Z";
  const expiresAt = "2026-10-31T10:03:10.000Z";
  const now = Date.parse("2026-10-31T10:00:45.000Z");
  assert.doesNotThrow(() => assertQuestionIssuedThisTurn(currentIssued, newTurnStart, expiresAt, now));
  assert.doesNotThrow(() => assertQuestionIssuedThisTurn(newTurnStart, newTurnStart, expiresAt, now));
  assert.throws(() => assertQuestionIssuedThisTurn(oldIssued, newTurnStart, expiresAt, now), /not issued/);
  assert.throws(() => assertQuestionIssuedThisTurn(null, newTurnStart, expiresAt, now), /not issued/);
  assert.throws(() => assertQuestionIssuedThisTurn(currentIssued, null, expiresAt, now), /not issued/);
  assert.throws(() => assertQuestionIssuedThisTurn(currentIssued, newTurnStart, expiresAt, Date.parse(expiresAt)), /expired/);
  assert.throws(() => assertQuestionIssuedThisTurn(currentIssued, newTurnStart, null, now), /expired/);
  assert.throws(() => assertQuestionIssuedThisTurn(currentIssued, newTurnStart, oldIssued, now), /expired/);
});
