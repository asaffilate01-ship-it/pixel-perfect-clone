import { test } from "node:test";
import assert from "node:assert/strict";
import { authoritativeResponseMs, roomTurnWasAlreadyAdvanced } from "../src/lib/rankedScoring.ts";

const issued = "2026-11-01T10:00:00.000Z";
const now = Date.parse(issued);

test("ranked response time derives from server reservation, never client-provided values", () => {
  assert.equal(authoritativeResponseMs(issued, now), 0);
  assert.equal(authoritativeResponseMs(issued, now + 9_000), 9_000);
  assert.equal(authoritativeResponseMs(issued, now + 30_000), 30_000);
  assert.equal(authoritativeResponseMs(issued, now + 180_000), 180_000);
  assert.equal(authoritativeResponseMs(issued, now - 2_000), 0);
});

test("malformed or missing reservation timestamps fail closed", () => {
  for (const start of [null, undefined, "", "bogus"]) {
    assert.throws(() => authoritativeResponseMs(start, now), /reservation time/);
  }
  assert.throws(() => authoritativeResponseMs(issued, NaN), /reservation time/);
  assert.throws(() => authoritativeResponseMs(issued, now - 10_000), /reservation time/);
});

test("ranked response time is constrained to the Postgres signed integer range", () => {
  assert.equal(authoritativeResponseMs(issued, now + 3_000_000_000), 2_147_483_647);
});

test("a concurrent turn advance must not be overwritten by a stale scoring response", () => {
  assert.equal(roomTurnWasAlreadyAdvanced(null), true);
  assert.equal(roomTurnWasAlreadyAdvanced({ id: "active-room" }), false);
});
