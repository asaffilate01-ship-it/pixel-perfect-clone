import assert from "node:assert/strict";
import fs from "node:fs";

const batches = [
  {
    label: "phase-14", path: "supabase/migrations/20261016140000_verified_question_depth_phase_14_choice_formats.sql",
    count: 28, choices: 19, typed: 9,
    bySport: { darts: 4, f1: 4, mlb: 4, nba: 4, nhl: 4, snooker: 8 },
  },
  {
    label: "phase-15", path: "supabase/migrations/20261016170000_verified_question_depth_phase_15_mixed_formats.sql",
    count: 32, choices: 20, typed: 12,
    bySport: { afl: 8, darts: 8, f1: 8, snooker: 8 },
  },
];

/** Parse SQL single-quoted tuple fields with doubled apostrophes. */
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

const canonical = (value) => value.toLowerCase().normalize("NFKC")
  .replace(/[^a-z0-9]+/g, " ").trim();
const seenPrompts = new Map();
for (const batch of batches) {
  const sql = fs.readFileSync(batch.path, "utf8");
  const rows = sql.split("\n").filter((line) => /^\('/.test(line)).map(parseTuple);
  assert.equal(rows.length, batch.count, `${batch.label} question count`);
  const counts = new Map();
  const bands = new Map();
  let choice = 0;
  let typed = 0;
  let trueFalse = 0;
  for (const fields of rows) {
    assert.equal(fields.length, 11, `${batch.label}: 11 seed fields expected`);
    const [sport, category, prompt, clue, acceptedText, display, percentileText, sourceUrl, sourceTitle, kind, optionsText] = fields;
    assert.ok(sport && category && prompt && clue && display);
    const normalizedPrompt = canonical(prompt);
    assert.ok(!seenPrompts.has(normalizedPrompt),
      `Duplicate prompt in ${batch.label} or ${seenPrompts.get(normalizedPrompt)}: ${prompt}`);
    seenPrompts.set(normalizedPrompt, batch.label);
    counts.set(sport, (counts.get(sport) || 0) + 1);
    const percentile = Number(percentileText);
    assert.ok(Number.isFinite(percentile) && percentile > 0 && percentile < 1, `Invalid percentile: ${prompt}`);
    const level = Math.min(4, Math.floor(percentile * 4) + 1);
    const scope = `${sport}:${level}`;
    bands.set(scope, (bands.get(scope) || 0) + 1);
    assert.ok(sourceUrl.startsWith("https://"), `Missing HTTPS evidence: ${prompt}`);
    assert.ok(sourceTitle.length >= 8);
    const accepted = JSON.parse(acceptedText);
    const options = JSON.parse(optionsText);
    assert.ok(Array.isArray(accepted) && accepted.length > 0 && accepted.includes(display), `No canonical answer: ${prompt}`);
    // Historical phase-14 authoring accepted punctuation variants (e.g.
    // straight/curly apostrophes). Keep those released rows immutable, but
    // enforce canonical alias uniqueness for all newly authored questions.
    if (batch.label === "phase-15") {
      assert.equal(new Set(accepted.map(canonical)).size, accepted.length,
        `Duplicate aliases: ${prompt}`);
    }
    assert.ok(Array.isArray(options));
    if (kind === "single_choice") {
      choice++;
      assert.ok(options.length >= 2 && options.length <= 6 && options.includes(display), `Invalid options: ${prompt}`);
      assert.equal(new Set(options.map(canonical)).size, options.length, `Repeated distractors: ${prompt}`);
      if (options.length === 2) {
        trueFalse++;
        assert.deepEqual([...options].sort(), ["False", "True"], `Two-choice format must be true/false: ${prompt}`);
      }
    } else {
      assert.equal(kind, "typed_single", `Unrecognised question type: ${prompt}`);
      typed++;
      assert.equal(options.length, 0);
    }
  }
  assert.deepEqual(Object.fromEntries([...counts.entries()].sort()), batch.bySport);
  assert.equal(choice, batch.choices, `${batch.label} choice count`);
  assert.equal(typed, batch.typed, `${batch.label} typed count`);
  assert.ok(trueFalse >= 4, `${batch.label} must include true/false questions`);
  if (batch.label === "phase-15") {
    for (const sport of Object.keys(batch.bySport)) {
      for (let level = 1; level <= 4; level++) {
        assert.equal(bands.get(`${sport}:${level}`), 2,
          `Phase 15 must provide two ${sport} questions in difficulty ${level}`);
      }
    }
  }
  console.log(`Fanzeno ${batch.label} passed`, {
    questions: rows.length, sports: counts.size, multipleChoice: choice,
    typed, trueFalse,
  });
}
console.log("60 curated questions passed cross-release checks");
