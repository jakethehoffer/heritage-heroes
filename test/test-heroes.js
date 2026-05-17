// test/test-heroes.js
const test = require("node:test");
const assert = require("node:assert");
const Heroes = require("../src/heroes.js");

const EXPECTED_IDS = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein", "samson"];

test("roster has exactly the 8 expected heroes", () => {
  assert.strictEqual(Heroes.list.length, 8);
  const ids = Heroes.list.map(h => h.id);
  for (const id of EXPECTED_IDS) assert.ok(ids.includes(id), `missing ${id}`);
});

test("every hero has required fields", () => {
  for (const h of Heroes.list) {
    assert.ok(typeof h.id === "string" && h.id.length > 0, `${h.id}: bad id`);
    assert.ok(typeof h.name === "string" && h.name.length > 0, `${h.id}: bad name`);
    assert.ok(typeof h.era === "string", `${h.id}: bad era`);
    assert.ok(Number.isInteger(h.hp) && h.hp >= 80 && h.hp <= 120, `${h.id}: hp out of range`);
    assert.ok(typeof h.bio === "string" && h.bio.length > 0, `${h.id}: bad bio`);
    assert.ok(h.moves && h.moves.attack && h.moves.defend && h.moves.special, `${h.id}: missing moves`);
    assert.ok(typeof h.moves.attack.name === "string", `${h.id}: bad attack name`);
    assert.ok(Number.isInteger(h.moves.attack.damage) && h.moves.attack.damage > 0, `${h.id}: bad attack dmg`);
    assert.ok(typeof h.moves.special.name === "string", `${h.id}: bad special name`);
    assert.ok(typeof h.moves.special.description === "string", `${h.id}: bad special desc`);
    assert.ok(typeof h.stageId === "string" && h.stageId.length > 0, `${h.id}: bad stageId`);
  }
});

test("every hero trivia is an array with at least 1 entry, each entry well-formed", () => {
  for (const h of Heroes.list) {
    assert.ok(Array.isArray(h.trivia), `${h.id}: trivia should be an array`);
    assert.ok(h.trivia.length >= 1, `${h.id}: trivia should have at least 1 entry`);
    for (const t of h.trivia) {
      assert.ok(typeof t.question === "string" && t.question.length > 0, `${h.id}: trivia entry missing question`);
      assert.ok(Array.isArray(t.options) && t.options.length >= 2, `${h.id}: trivia entry missing options`);
      assert.ok(Number.isInteger(t.correctIndex) && t.correctIndex >= 0 && t.correctIndex < t.options.length,
        `${h.id}: trivia entry correctIndex out of range`);
      assert.ok(typeof t.explanation === "string" && t.explanation.length > 0, `${h.id}: trivia entry missing explanation`);
    }
  }
});

test("every hero has exactly 20 trivia questions", () => {
  for (const h of Heroes.list) {
    assert.strictEqual(h.trivia.length, 20, `${h.id}: should have 20 trivia questions`);
  }
});

test("byId returns the right hero or undefined", () => {
  assert.strictEqual(Heroes.byId("moses").name, "Moses");
  assert.strictEqual(Heroes.byId("nonexistent"), undefined);
});

test("HP totals are within design tolerance", () => {
  const total = Heroes.list.reduce((s, h) => s + h.hp, 0);
  // moses=100, samson=110, david=95, esther=90, judah=100, rambam=85, golda=100, einstein=80
  assert.strictEqual(total, 100 + 110 + 95 + 90 + 100 + 85 + 100 + 80);
});

test("pickTrivia returns a valid trivia result from the hero's pool", () => {
  // Deterministic RNG that returns 0 → picks first available index
  const result0 = Heroes.pickTrivia("moses", [], () => 0);
  assert.ok(result0 !== null, "should return a result object");
  assert.ok(typeof result0.trivia.question === "string", "entry has question");
  assert.ok(Array.isArray(result0.trivia.options), "entry has options");
  assert.strictEqual(result0.index, 0, "rng=0 picks index 0");
  assert.strictEqual(result0.trivia, Heroes.byId("moses").trivia[0], "trivia matches pool entry at index 0");

  // Deterministic RNG that returns 0.99 → picks last available index (index 19 when pool is [0..19])
  const result99 = Heroes.pickTrivia("moses", [], () => 0.99);
  assert.strictEqual(result99.index, 19, "rng=0.99 with empty used picks last index");
  assert.strictEqual(result99.trivia, Heroes.byId("moses").trivia[19], "rng=0.99 picks last entry");

  // Returns null for unknown hero
  assert.strictEqual(Heroes.pickTrivia("nobody", []), null, "unknown hero returns null");
});

test("pickTrivia uses Math.random when no rng provided", () => {
  // Just verify it returns a valid result on 20 calls (cycling through used)
  const used = [];
  for (let i = 0; i < 20; i++) {
    const result = Heroes.pickTrivia("david", used);
    assert.ok(result !== null);
    assert.ok(Heroes.byId("david").trivia.includes(result.trivia));
    used.push(result.index);
  }
});

test("pickTrivia no-recycle: all 10 indices appear exactly once before any repeat", () => {
  const heroId = "moses";
  const pool = Heroes.byId(heroId).trivia;
  const used = [];
  const seen = new Set();

  for (let i = 0; i < pool.length; i++) {
    const result = Heroes.pickTrivia(heroId, used);
    assert.ok(result !== null, `pick ${i}: should return a result`);
    assert.ok(!seen.has(result.index), `index ${result.index} should not repeat before cycle exhausted`);
    seen.add(result.index);
    used.push(result.index);
  }
  assert.strictEqual(seen.size, pool.length, "all 20 distinct indices should have been returned");

  // After exhaustion, pickTrivia picks from the full pool again (exhausted === true on the last pick)
  // Simulate the reset: pass an empty used array as the caller would after exhausted
  const afterReset = Heroes.pickTrivia(heroId, []);
  assert.ok(afterReset !== null, "after cycle reset, pick should succeed");
  assert.ok(afterReset.index >= 0 && afterReset.index < pool.length, "reset pick index is in range");
});

test("pickTrivia exhausted flag is true only on the last question of a cycle", () => {
  const heroId = "david";
  const total = Heroes.byId(heroId).trivia.length;
  const used = [];

  for (let i = 0; i < total - 1; i++) {
    const result = Heroes.pickTrivia(heroId, used);
    assert.strictEqual(result.exhausted, false, `pick ${i}: exhausted should be false before last question`);
    used.push(result.index);
  }
  // Last pick
  const last = Heroes.pickTrivia(heroId, used);
  assert.strictEqual(last.exhausted, true, "exhausted should be true on the final question of the cycle");
});
