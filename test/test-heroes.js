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

test("byId returns the right hero or undefined", () => {
  assert.strictEqual(Heroes.byId("moses").name, "Moses");
  assert.strictEqual(Heroes.byId("nonexistent"), undefined);
});

test("HP totals are within design tolerance", () => {
  const total = Heroes.list.reduce((s, h) => s + h.hp, 0);
  assert.strictEqual(total, 100 + 95 + 90 + 100 + 85 + 100 + 80);
});
