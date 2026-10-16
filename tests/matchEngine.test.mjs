import { test } from "node:test";
import assert from "node:assert/strict";
import { dropToken, connectWinner, ticWinner, ROWS, COLS } from "../src/lib/matchEngine.ts";

const blank = () => Array(COLS * ROWS).fill(null);

test("Connect Four refuses columns outside the gravity board", () => {
  assert.equal(dropToken(blank(), -1, "me"), null);
  assert.equal(dropToken(blank(), COLS, "me"), null);
  assert.equal(dropToken(blank(), NaN, "me"), null);
  assert.equal(dropToken(blank(), 1.5, "me"), null);
  assert.equal(dropToken([], 2, "me"), null);
});

test("Connect Four drops to the lowest available row", () => {
  const one = dropToken(blank(), 2, "me");
  assert.ok(one);
  assert.equal(one.index, 5 * COLS + 2);
  const two = dropToken(one.board, 2, "them");
  assert.ok(two);
  assert.equal(two.index, 4 * COLS + 2);
  let board = two.board;
  for (let i = 0; i < ROWS - 2; i++) board = dropToken(board, 2, "me").board;
  assert.equal(dropToken(board, 2, "me"), null);
});

test("Connect Four detects horizontal, vertical and diagonal wins", () => {
  let horizontal = blank();
  for (let c = 0; c < 4; c++) horizontal = dropToken(horizontal, c, "me").board;
  assert.equal(connectWinner(horizontal), "me");
  let vertical = blank();
  for (let k = 0; k < 4; k++) vertical = dropToken(vertical, 1, "them").board;
  assert.equal(connectWinner(vertical), "them");
  const diagonal = blank();
  for (let k = 0; k < 4; k++) diagonal[(ROWS - 1 - k) * COLS + k] = "me";
  assert.equal(connectWinner(diagonal), "me");
});

test("Tic-Tac-Toe recognises both main diagonals", () => {
  assert.equal(ticWinner(["me",null,null,null,"me",null,null,null,"me"]), "me");
  assert.equal(ticWinner([null,null,"them",null,"them",null,"them",null,null]), "them");
  assert.equal(ticWinner(Array(9).fill(null)), null);
});
