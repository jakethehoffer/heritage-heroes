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

test("attack: reduces opponent HP by attack damage", () => {
  const s = Combat.createMatch("moses", "david");
  const startDavidHp = s.players[1].hp;
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, startDavidHp - Heroes.byId("moses").moves.attack.damage);
});

test("attack: advances turn to other player and increments turn number", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.activePlayer, 1);
  assert.strictEqual(s.turnNumber, 2);
});

test("attack: writes an entry to the log", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.log.length, 1);
  assert.match(s.log[0], /Moses/);
  assert.match(s.log[0], /Staff Strike/);
});

test("attack: HP cannot go negative", () => {
  const s = Combat.createMatch("moses", "einstein");
  s.players[1].hp = 5;
  Combat.applyMove(s, "attack"); // Moses 10 dmg
  assert.strictEqual(s.players[1].hp, 0);
});

test("defend: applies status without dealing damage", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "defend");
  assert.strictEqual(s.players[0].statuses.defend, true);
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp);
  assert.strictEqual(s.activePlayer, 1);
});

test("defend: halves the next incoming attack (rounded down)", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "defend"); // Moses defends
  // P2 (David) attacks for 12 -> halved to 6
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].hp, s.players[0].maxHp - 6);
  assert.strictEqual(s.players[0].statuses.defend, undefined, "defend should expire");
});

test("defend: persists if opponent does not attack", () => {
  const s = Combat.createMatch("moses", "rambam");
  Combat.applyMove(s, "defend"); // Moses defends
  Combat.applyMove(s, "defend"); // Rambam also defends (no attack)
  assert.strictEqual(s.players[0].statuses.defend, true, "Moses defend still up");
});

test("defend: odd damage rounds down", () => {
  const s = Combat.createMatch("david", "rambam"); // Rambam attack = 9
  Combat.applyMove(s, "attack"); // David hits Rambam for 12
  Combat.applyMove(s, "defend"); // Rambam defends
  Combat.applyMove(s, "attack"); // David's sling 12 -> halved to 6
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp - 12 - 6);
});

test("winner: set when opponent HP reaches 0", () => {
  const s = Combat.createMatch("moses", "einstein");
  s.players[1].hp = 8; // Moses attack = 10
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, 0);
  assert.strictEqual(s.winner, 0);
});

test("winner: applyMove is no-op once match is over", () => {
  const s = Combat.createMatch("moses", "einstein");
  s.players[1].hp = 8;
  Combat.applyMove(s, "attack");
  const turnBefore = s.turnNumber;
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.turnNumber, turnBefore);
});

test("isMatchOver returns true after a KO", () => {
  const s = Combat.createMatch("moses", "einstein");
  assert.strictEqual(Combat.isMatchOver(s), false);
  s.players[1].hp = 8;
  Combat.applyMove(s, "attack");
  assert.strictEqual(Combat.isMatchOver(s), true);
});
