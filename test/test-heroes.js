// test/test-heroes.js
const test = require("node:test");
const assert = require("node:assert");
const Heroes = require("../src/heroes.js");

const EXPECTED_IDS = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

test("roster has exactly the 7 expected heroes", () => {
  assert.strictEqual(Heroes.list.length, 7);
  const ids = Heroes.list.map(h => h.id);
  for (const id of EXPECTED_IDS) assert.ok(ids.includes(id), `missing ${id}`);
});

test("every hero has required fields", () => {
  for (const h of Heroes.list) {
    assert.ok(typeof h.id === "string" && h.id.length > 0, `${h.id}: bad id`);
    assert.ok(typeof h.name === "string" && h.name.length > 0, `${h.id}: bad name`);
    assert.ok(typeof h.era === "string", `${h.id}: bad era`);
    assert.ok(Number.isInteger(h.hp) && h.hp >= 80 && h.hp <= 100, `${h.id}: hp out of range`);
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

test("every hero has exactly 3 trivia questions", () => {
  for (const h of Heroes.list) {
    assert.strictEqual(h.trivia.length, 3, `${h.id}: should have 3 trivia questions`);
  }
});

test("byId returns the right hero or undefined", () => {
  assert.strictEqual(Heroes.byId("moses").name, "Moses");
  assert.strictEqual(Heroes.byId("nonexistent"), undefined);
});

test("HP totals are within design tolerance", () => {
  const total = Heroes.list.reduce((s, h) => s + h.hp, 0);
  assert.strictEqual(total, 100 + 95 + 90 + 100 + 85 + 100 + 80);
});

test("pickTrivia returns a valid trivia entry from the hero's pool", () => {
  // Deterministic RNG that returns 0 → picks first entry
  const first = Heroes.pickTrivia("moses", () => 0);
  assert.ok(first !== null, "should return an entry");
  assert.ok(typeof first.question === "string", "entry has question");
  assert.ok(Array.isArray(first.options), "entry has options");
  assert.strictEqual(first, Heroes.byId("moses").trivia[0], "rng=0 picks index 0");

  // Deterministic RNG that returns 0.99 → picks last entry
  const last = Heroes.pickTrivia("moses", () => 0.99);
  assert.strictEqual(last, Heroes.byId("moses").trivia[2], "rng=0.99 picks last entry");

  // Returns null for unknown hero
  assert.strictEqual(Heroes.pickTrivia("nobody"), null, "unknown hero returns null");
});

test("pickTrivia uses Math.random when no rng provided", () => {
  // Just verify it returns a valid entry on 10 calls
  for (let i = 0; i < 10; i++) {
    const entry = Heroes.pickTrivia("david");
    assert.ok(entry !== null);
    assert.ok(Heroes.byId("david").trivia.includes(entry));
  }
});
