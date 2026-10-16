import assert from "node:assert/strict";
import fs from "node:fs";

const path = "supabase/migrations/20261016140000_verified_question_depth_phase_14_choice_formats.sql";
const sql = fs.readFileSync(path, "utf8");

/** Parse SQL single-quoted tuple fields, including escaped apostrophes. */
function parseTuple(line) {
  let i = line.indexOf("(") + 1;
  const fields = [];
  while (i < line.length && line[i] !== ")") {
    while (line[i] === " " || line[i] === ",") i++;
    assert.equal(line[i], "'", "Expected a quoted seed field");
    i++;
    let value = "";
    let closed = false;
    while (i < line.length) {
      if (line[i] === "'" && line[i + 1] === "'") {
        value += "'";
        i += 2;
      } else if (line[i] === "'") {
        i++;
        closed = true;
        break;
      } else {
        value += line[i++];
      }
    }
    assert.ok(closed, "Unterminated SQL string");
    fields.push(value);
    while (line[i] === " ") i++;
    assert.ok(line[i] === "," || line[i] === ")", "Unexpected tuple punctuation");
    if (line[i] === ",") i++;
  }
  return fields;
}

const rows = sql.split("\n").filter((line) => /^\('/.test(line)).map(parseTuple);
assert.equal(rows.length, 28, "Phase 14 must contain exactly 28 questions");
const counts = new Map();
const prompts = new Set();
let choice = 0;
let typed = 0;
let truth = 0;
for (const fields of rows) {
  assert.equal(fields.length, 11, "Expected 11 fields per seed");
  const [sport, category, prompt, clue, acceptedText, display, percentile, sourceUrl, sourceTitle, kind, optionsText] = fields;
  assert.ok(sport && category && prompt && clue);
  assert.ok(!prompts.has(prompt), "Duplicate question: " + prompt);
  prompts.add(prompt);
  counts.set(sport, (counts.get(sport) || 0) + 1);
  assert.ok(Number(percentile) > 0 && Number(percentile) < 1, "Invalid difficulty");
  assert.ok(sourceUrl.startsWith("https://"), "Missing official source URL");
  assert.ok(sourceTitle.length >= 8);
  const answers = JSON.parse(acceptedText);
  const options = JSON.parse(optionsText);
  assert.ok(Array.isArray(answers) && answers.length >= 1 && answers.includes(display));
  assert.ok(new Set(answers.map((a) => a.toLowerCase())).size === answers.length);
  if (kind === "single_choice") {
    choice++;
    assert.ok(Array.isArray(options) && options.length >= 2 && options.length <= 6);
    assert.ok(options.includes(display));
    assert.equal(new Set(options.map((a) => a.toLowerCase())).size, options.length);
    if (options.length === 2) {
      truth++;
      assert.deepEqual([...options].sort(), ["False", "True"]);
    }
  } else {
    assert.equal(kind, "typed_single");
    typed++;
    assert.equal(options.length, 0);
  }
}
assert.deepEqual(Object.fromEntries([...counts.entries()].sort()), {
  darts: 4, f1: 4, mlb: 4, nba: 4, nhl: 4, snooker: 8,
});
assert.equal(choice, 19);
assert.equal(typed, 9);
assert.ok(truth >= 4);
console.log("Fanzeno phase-14 content validated", {
  questions: rows.length, sports: counts.size, choice, typed, trueFalse: truth,
});
