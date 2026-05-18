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
  assert.strictEqual(total, 100 + 95 + 90 + 100 + 85 + 100 + 80);
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

test("every hero has a valid profile field with dates, bio, and quote", () => {
  for (const h of Heroes.list) {
    assert.ok(h.profile && typeof h.profile === "object", `${h.id}: missing profile object`);
    assert.ok(typeof h.profile.dates === "string" && h.profile.dates.length > 0, `${h.id}: profile.dates missing or empty`);
    assert.ok(typeof h.profile.bio === "string" && h.profile.bio.length > 100, `${h.id}: profile.bio too short or missing`);
    assert.ok(typeof h.profile.quote === "string" && h.profile.quote.length > 5, `${h.id}: profile.quote too short or missing`);
  }
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

// ── pickRandomFact — "Did You Know?" card on the title screen ────────────────

test("pickRandomFact returns a valid {heroId, heroName, explanation} shape", () => {
  const fact = Heroes.pickRandomFact();
  assert.ok(fact !== null, "should not return null when heroes exist");
  assert.ok(typeof fact.heroId === "string" && fact.heroId.length > 0, "heroId is a non-empty string");
  assert.ok(typeof fact.heroName === "string" && fact.heroName.length > 0, "heroName is a non-empty string");
  assert.ok(typeof fact.explanation === "string" && fact.explanation.length > 0, "explanation is a non-empty string");
});

test("pickRandomFact heroId is one of the 7 heroes", () => {
  // Run several picks to make sure every result lands on a valid hero id.
  for (let i = 0; i < 25; i++) {
    const fact = Heroes.pickRandomFact();
    assert.ok(EXPECTED_IDS.includes(fact.heroId), `unexpected heroId: ${fact.heroId}`);
  }
});

test("pickRandomFact respects custom rng for determinism — () => 0 returns first hero's first explanation", () => {
  const fact = Heroes.pickRandomFact(() => 0);
  const firstHero = Heroes.list[0];
  assert.strictEqual(fact.heroId, firstHero.id, "rng=0 picks the first hero in the pool");
  assert.strictEqual(fact.heroName, firstHero.name, "heroName matches the first hero");
  assert.strictEqual(fact.explanation, firstHero.trivia[0].explanation,
    "rng=0 picks the first trivia entry's explanation");
});

test("pickRandomFact returns different facts for rngs that point to different pool entries", () => {
  // The flat pool spans every hero's trivia in order. () => 0 lands on the
  // very first entry; () => 0.9999 lands on the very last. They must differ.
  const factLow  = Heroes.pickRandomFact(() => 0);
  const factHigh = Heroes.pickRandomFact(() => 0.9999);
  assert.notStrictEqual(factLow.explanation, factHigh.explanation,
    "rng=0 and rng=0.9999 should yield different explanations");
});

test("pickRandomFact rng near 1 selects the last hero's last explanation", () => {
  // Floor(0.9999 * 140) = 139, the last index in the pool — matches the last
  // trivia entry of the last hero in the roster.
  const fact = Heroes.pickRandomFact(() => 0.9999);
  const lastHero = Heroes.list[Heroes.list.length - 1];
  const lastEntry = lastHero.trivia[lastHero.trivia.length - 1];
  assert.strictEqual(fact.heroId, lastHero.id, "rng=0.9999 lands on the last hero");
  assert.strictEqual(fact.explanation, lastEntry.explanation,
    "rng=0.9999 lands on the last trivia entry's explanation");
});

test("pickRandomFact explanation is drawn from the named hero's own trivia pool", () => {
  for (let i = 0; i < 10; i++) {
    const fact = Heroes.pickRandomFact();
    const hero = Heroes.byId(fact.heroId);
    const explanations = hero.trivia.map(t => t.explanation);
    assert.ok(explanations.includes(fact.explanation),
      `explanation should belong to ${fact.heroId}'s trivia`);
  }
});
