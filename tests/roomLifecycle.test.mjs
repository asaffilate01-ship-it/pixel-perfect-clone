import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOM_COMPLETE_STATUS, isArcadeRoomComplete, firstOccupiedSeat, nextMastermindTurn } from "../src/lib/roomLifecycle.ts";

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
