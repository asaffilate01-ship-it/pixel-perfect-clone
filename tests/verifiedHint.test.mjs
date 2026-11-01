import { test } from "node:test";
import assert from "node:assert/strict";
import { authoritativeClueUsed, verifiedClueText } from "../src/lib/verifiedHint.ts";

test("a stored room clue reveal cannot be hidden by a client saying false", () => {
  assert.equal(authoritativeClueUsed(true, {}, false), true);
  assert.equal(authoritativeClueUsed(false, {}, false), false);
  assert.equal(authoritativeClueUsed(false, {}, true), true);
});

test("a stored solo hint cannot be hidden by a client flag", () => {
  assert.equal(authoritativeClueUsed(false, { hint_used: true }, false), true);
  assert.equal(authoritativeClueUsed(false, { hint_used: "true" }, false), false);
  assert.equal(authoritativeClueUsed(false, [true], false), false);
  assert.equal(authoritativeClueUsed(false, null, false), false);
});

test("a verified clue has nonblank English text before usage is marked", () => {
  assert.equal(verifiedClueText({ en: "  Think of the 2003 final.  " }), "Think of the 2003 final.");
  for (const clue of [null, {}, { en: "" }, { en: "   " }, [], { en: 12 }, { fr: "piste" }]) {
    assert.throws(() => verifiedClueText(clue), /no verified clue/);
  }
});
