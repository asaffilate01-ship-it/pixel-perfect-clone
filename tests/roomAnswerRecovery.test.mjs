import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { settledRoomAnswer } from "../src/lib/roomAnswerRecovery.ts";

test("only a confirmed submission may be projected as a recovered answer", () => {
  assert.deepEqual(
    settledRoomAnswer(
      { action: "answer", correct: true, movement: 5, answer_text: "PRIVATE", user_id: "PRIVATE" },
      "Verified canonical answer", true,
    ),
    {
      settled: true,
      correct: true,
      usedClue: true,
      passed: false,
      answer: "Verified canonical answer",
    },
  );
  assert.deepEqual(
    settledRoomAnswer({ action: "pass", correct: false, movement: 0 }, "Answer", false),
    { settled: true, correct: false, usedClue: false, passed: true, answer: "Answer" },
  );
});

test("recovered hints are detected from movement even for older clients", () => {
  assert.equal(
    settledRoomAnswer({ action: "answer", correct: true, movement: 5 }, "Answer", false).usedClue,
    true,
  );
  assert.equal(
    settledRoomAnswer({ action: "answer", correct: true, movement: 6 }, "Answer", false).usedClue,
    false,
  );
});

test("malformed or inconsistent saved submissions require review", () => {
  const bad = [
    { action: "answer", correct: true, movement: 0 },
    { action: "answer", correct: false, movement: 6 },
    { action: "pass", correct: true, movement: 5 },
    { action: "clue", correct: false, movement: 0 },
    { action: "answer", correct: null, movement: 0 },
    { action: "answer", correct: true, movement: 8 },
  ];
  for (const row of bad) {
    assert.throws(() => settledRoomAnswer(row, "Answer", false), /requires review/);
  }
  assert.throws(
    () => settledRoomAnswer({ action: "pass", correct: false, movement: 0 }, "", false),
    /requires review/,
  );
});

test("recovery endpoint checks authenticated original player and confirmed submission", () => {
  const server = fs.readFileSync(
    new URL("../src/lib/arcadeRooms.functions.ts", import.meta.url), "utf8",
  );
  const start = server.indexOf("export const recoverMyRoomAnswer =");
  const end = server.indexOf("const answerSchema =", start);
  assert.ok(start > 0 && end > start, "Expected separate read-only recovery action");
  const action = server.slice(start, end);
  for (const part of [
    ".middleware([requireSupabaseAuth])",
    "issued.active_user_id !== context.userId",
    "if (!issued.revealed_answer)",
    "if (!submission) return { settled: false",
    '.eq("user_id", context.userId)',
    "return settledRoomAnswer(",
  ]) assert.ok(action.includes(part), `Missing receipt authorization: ${part}`);
  assert.ok(!action.includes(".update("));
  assert.ok(!action.includes(".insert("));
  assert.ok(!action.includes(".delete("));
  const card = fs.readFileSync(
    new URL("../src/components/game/QuestionCard.tsx", import.meta.url), "utf8",
  );
  assert.ok(card.includes("recoverMyRoomAnswer({"));
  assert.ok(card.includes("Check saved result"));
});
