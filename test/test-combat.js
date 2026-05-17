// test/test-combat.js
const test = require("node:test");
const assert = require("node:assert");
const Combat = require("../src/combat.js");
const Heroes = require("../src/heroes.js");

test("createMatch returns initial state with full HP and player 0 active", () => {
  const s = Combat.createMatch("moses", "david");
  assert.strictEqual(s.players.length, 2);
  assert.strictEqual(s.players[0].heroId, "moses");
  assert.strictEqual(s.players[1].heroId, "david");
  assert.strictEqual(s.players[0].hp, Heroes.byId("moses").hp);
  assert.strictEqual(s.players[1].hp, Heroes.byId("david").hp);
  assert.strictEqual(s.players[0].maxHp, Heroes.byId("moses").hp);
  assert.strictEqual(s.activePlayer, 0);
  assert.strictEqual(s.winner, null);
  assert.strictEqual(s.turnNumber, 1);
});

test("createMatch initializes each player's special as ready and statuses empty", () => {
  const s = Combat.createMatch("moses", "david");
  for (const p of s.players) {
    assert.strictEqual(p.specialCooldown, 0);
    assert.deepStrictEqual(p.statuses, {});
  }
});

test("createMatch throws on unknown hero id", () => {
  assert.throws(() => Combat.createMatch("nobody", "david"));
  assert.throws(() => Combat.createMatch("moses", "nobody"));
});
