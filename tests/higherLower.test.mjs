import { test } from "node:test";
import assert from "node:assert/strict";
import { makeHigherLowerRun } from "../src/lib/higherLower.ts";

const cards = [1, 2, 3, 5, 10, 20, 30, 45, 60, 75, 90, 100].map((value) => ({
  name: `Player ${value}`,
  value,
  display: String(value),
  sport: "Golf",
  metric: "Major championship points",
}));

test("same seed produces the same run and pair ordering", () => {
  assert.deepEqual(makeHigherLowerRun(cards, 2, 1988), makeHigherLowerRun(cards, 2, 1988));
});

test("never compares different sports or statistical metrics", () => {
  const mixed = [
    ...cards,
    { ...cards[0], name: "Other sport", sport: "Cricket" },
    { ...cards[1], name: "Other metric", metric: "Grand Slam singles titles" },
  ];
  const run = makeHigherLowerRun(mixed, 3, 18);
  assert.ok(run.length > 0);
  for (const { a, b } of run) {
    assert.equal(a.sport, b.sport);
    assert.equal(a.metric, b.metric);
    assert.notEqual(a.name, b.name);
  }
});

test("expert comparisons are generally closer than easy comparisons", () => {
  const easy = makeHigherLowerRun(cards, 1, 2026);
  const expert = makeHigherLowerRun(cards, 4, 2026);
  const average = (pairs) => pairs.reduce((sum, p) => sum + p.gap, 0) / pairs.length;
  assert.ok(average(expert) < average(easy), "Expert gaps should be smaller");
});

test("comparison orientation is not always lower", () => {
  const run = makeHigherLowerRun(cards, 2, 2026);
  assert.ok(run.some(({ a, b }) => b.value > a.value));
  assert.ok(run.some(({ a, b }) => b.value < a.value));
});

test("pairs are unique and incomplete groups cannot create invalid rounds", () => {
  const pairs = makeHigherLowerRun(cards, 2, 55);
  const ids = pairs.map(({ a, b }) => [a.name, b.name].sort().join("/"));
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(
    makeHigherLowerRun([cards[0], { ...cards[0], name: "Another", sport: "F1" }], 1, 5),
    [],
  );
});
