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

test("special: not allowed at full HP only? no — allowed any time when ready", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special"); // Moses Part the Sea
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp - 25);
});

test("special: enters 3-turn cooldown after use", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special"); // Moses
  assert.strictEqual(s.players[0].specialCooldown, 3);
  // David's turn — Moses cooldown should still be 3
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].specialCooldown, 3);
  // Moses's next turn — cooldown ticks down to 2 at turn start
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].specialCooldown, 2);
});

test("special: throws if used while on cooldown", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special");
  Combat.applyMove(s, "attack"); // David
  assert.throws(() => Combat.applyMove(s, "special"));
});

test("special: becomes usable after cooldown reaches 0", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special"); // Moses, cd=3
  Combat.applyMove(s, "attack");  // David
  Combat.applyMove(s, "attack");  // Moses tick cd 3->2
  Combat.applyMove(s, "attack");  // David
  Combat.applyMove(s, "attack");  // Moses tick cd 2->1
  Combat.applyMove(s, "attack");  // David
  Combat.applyMove(s, "attack");  // Moses tick cd 1->0
  Combat.applyMove(s, "attack");  // David
  // Moses's next turn: should be usable again
  Combat.applyMove(s, "special"); // does not throw
  assert.strictEqual(s.players[0].specialCooldown, 3);
});

test("David's special: +10 bonus damage when opponent HP > 50", () => {
  const s = Combat.createMatch("david", "moses");
  // Moses starts at 100, >50, so 22+10 = 32
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[1].hp, 100 - 32);
});

test("David's special: no bonus when opponent HP <= 50", () => {
  const s = Combat.createMatch("david", "moses");
  s.players[1].hp = 50;
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[1].hp, 50 - 22);
});

test("Esther's Reversal: next attack against her bounces back at 1.5x", () => {
  const s = Combat.createMatch("esther", "moses"); // Moses attack = 10
  Combat.applyMove(s, "special"); // Esther sets reversal
  // Moses attacks Esther for 10; reversed to Moses at 15
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].hp, s.players[0].maxHp, "Esther unharmed");
  assert.strictEqual(s.players[1].hp, 100 - 15, "Moses takes 15 reflected");
  assert.strictEqual(s.players[0].statuses.reversal, undefined, "reversal expired");
});

test("Esther's Reversal: rounds down on fractional damage", () => {
  const s = Combat.createMatch("esther", "rambam"); // Rambam attack = 9
  Combat.applyMove(s, "special");
  // 9 * 1.5 = 13.5 -> 13
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp - 13);
});

test("Esther's Reversal: does NOT trigger on opponent's non-attack moves", () => {
  const s = Combat.createMatch("esther", "rambam");
  Combat.applyMove(s, "special"); // Esther reversal up
  Combat.applyMove(s, "defend"); // Rambam defends -- reversal should stay
  assert.strictEqual(s.players[0].statuses.reversal, true);
});

test("Judah's Menorah Flame: 8 immediate damage + 3 turns of 8 burn", () => {
  const s = Combat.createMatch("judah", "moses"); // Moses 100 HP
  Combat.applyMove(s, "special"); // Judah -> Moses: 8 dmg, burn=3
  assert.strictEqual(s.players[1].hp, 92);
  assert.strictEqual(s.players[1].statuses.burn, 3);

  Combat.applyMove(s, "defend"); // Moses turn starts -> burn tick to 8 dmg, burn=2
  assert.strictEqual(s.players[1].hp, 84);
  assert.strictEqual(s.players[1].statuses.burn, 2);

  Combat.applyMove(s, "defend"); // Judah turn (no burn on him)
  Combat.applyMove(s, "defend"); // Moses turn -> 76, burn=1
  assert.strictEqual(s.players[1].hp, 76);

  Combat.applyMove(s, "defend"); // Judah
  Combat.applyMove(s, "defend"); // Moses -> 68, burn expires
  assert.strictEqual(s.players[1].hp, 68);
  assert.strictEqual(s.players[1].statuses.burn, undefined);

  Combat.applyMove(s, "defend"); // Judah
  Combat.applyMove(s, "defend"); // Moses: no more burn
  assert.strictEqual(s.players[1].hp, 68);
});

test("Rambam's Healing Touch: restores 20 HP, capped at maxHp", () => {
  const s = Combat.createMatch("rambam", "moses");
  s.players[0].hp = 50;
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].hp, 70);
});

test("Rambam's Healing Touch: caps at maxHp", () => {
  const s = Combat.createMatch("rambam", "moses");
  s.players[0].hp = 80; // max is 85
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].hp, 85);
});

// append

// Golda
test("Golda's Resolve: doubles damage on her next Basic Attack only", () => {
  const s = Combat.createMatch("golda", "moses");
  Combat.applyMove(s, "special"); // Golda Resolve
  Combat.applyMove(s, "attack");  // Moses attacks Golda (irrelevant to assertion)
  // Golda attacks: 10 doubled = 20. Hits Moses for 20.
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, 100 - 20);
  assert.strictEqual(s.players[0].statuses.doubleNextAttack, undefined);
});

test("Golda's Resolve: buff persists across defends until attack consumes it", () => {
  const s = Combat.createMatch("golda", "moses");
  Combat.applyMove(s, "special"); // Golda Resolve set
  Combat.applyMove(s, "attack");  // Moses
  Combat.applyMove(s, "defend");  // Golda defends — should NOT consume buff
  assert.strictEqual(s.players[0].statuses.doubleNextAttack, true);
});

test("Golda's Diplomatic Shield: counters for 5 when struck", () => {
  const s = Combat.createMatch("moses", "golda"); // Moses goes first
  Combat.applyMove(s, "defend"); // Moses defends — irrelevant for now
  Combat.applyMove(s, "defend"); // Golda defends (Diplomatic Shield)
  // Moses attacks Golda for 10 -> halved to 5 -> Moses takes 5 counter
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, 100 - 5);
  assert.strictEqual(s.players[0].hp, 100 - 5);
});

// Einstein
test("Einstein's E=mc^2: charge phase blocks normal moves and ticks down", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special"); // Einstein starts charging (charging=2)
  assert.strictEqual(s.players[0].statuses.charging, 2);
  // Moses turn
  Combat.applyMove(s, "attack");
  // Einstein's turn — must call applyMove(state, "charge") to advance charge
  // applyMove with any other action throws while charging.
  assert.throws(() => Combat.applyMove(s, "attack"));
  assert.throws(() => Combat.applyMove(s, "defend"));
  assert.throws(() => Combat.applyMove(s, "special"));
});

test("Einstein's E=mc^2: 'charge' move ticks charging and ends turn", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special");        // charging=2
  Combat.applyMove(s, "attack");         // Moses
  Combat.applyMove(s, "charge");         // Einstein: tick to 1
  assert.strictEqual(s.players[0].statuses.charging, 1);
  Combat.applyMove(s, "attack");         // Moses
  Combat.applyMove(s, "charge");         // Einstein: tick to 0, blast for 40
  assert.strictEqual(s.players[0].statuses.charging, undefined);
  assert.strictEqual(s.players[1].hp, 100 - 40);
  assert.strictEqual(s.players[0].specialCooldown, 3);
});

test("Einstein: while charging, isCharging exposes true", () => {
  const s = Combat.createMatch("einstein", "moses");
  assert.strictEqual(Combat.isCharging(s, 0), false);
  Combat.applyMove(s, "special");
  assert.strictEqual(Combat.isCharging(s, 0), true);
});

// append
test("AI: while charging, always returns 'charge'", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special"); // charging=2
  // Bypass Moses's turn for test purposes — pretend state.activePlayer = 0
  s.activePlayer = 0;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0), "charge");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "charge");
});

test("AI: special on cooldown -> attack at low rng, defend at high rng", () => {
  const s = Combat.createMatch("moses", "david");
  s.players[0].specialCooldown = 2;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.69), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.71), "defend");
});

test("AI: special available -> 0.0=attack, 0.6=defend, 0.9=special", () => {
  const s = Combat.createMatch("moses", "david");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.54), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.56), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.84), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.86), "special");
});

// append
test("arcadeOrder: returns the other 6 heroes in a fixed order", () => {
  const order = Combat.arcadeOrder("moses");
  assert.strictEqual(order.length, 6);
  assert.ok(!order.includes("moses"));
  // Order must be stable
  assert.deepStrictEqual(order, Combat.arcadeOrder("moses"));
});

test("arcadeOrder: for david omits david but includes moses", () => {
  const order = Combat.arcadeOrder("david");
  assert.ok(!order.includes("david"));
  assert.ok(order.includes("moses"));
  assert.strictEqual(order.length, 6);
});

test("burn KO at start of turn prevents move from executing", () => {
  const s = Combat.createMatch("judah", "moses");
  // Apply menorah flame, then set Moses to 8 HP so next burn tick KOs him
  Combat.applyMove(s, "special"); // Moses: 92 HP, burn=3
  s.players[1].hp = 8;
  const logBefore = s.log.length;
  // Moses's turn: burn tick takes him from 8 -> 0, sets winner
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.winner, 0, "Judah wins via burn KO");
  // Only the burn-damage log entry should be added (not Moses's attack entry)
  assert.strictEqual(s.log.length, logBefore + 1, "only burn log entry added, no post-KO move logged");
  assert.strictEqual(s.players[0].hp, s.players[0].maxHp, "Judah unharmed by Moses's dead-man attack");
});

test("Esther's Reversal blocks Judah's Menorah Flame burn entirely", () => {
  const s = Combat.createMatch("esther", "judah");
  Combat.applyMove(s, "special"); // Esther reversal
  // Judah's Menorah Flame: 8 dmg + burn=3. Reversal should redirect dmg AND skip burn.
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].statuses.burn, undefined, "no burn on Esther");
  // Esther unharmed
  assert.strictEqual(s.players[0].hp, s.players[0].maxHp);
  // Judah took bounced damage (8 * 1.5 = 12)
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp - 12);
});

// Hard mode tests
test("Hard mode: createMatch with hardMode=true sets damageMultiplier 1.25 on slot 1", () => {
  const s = Combat.createMatch("moses", "david", { hardMode: true, hardOpponentSlot: 1 });
  assert.strictEqual(s.players[1].damageMultiplier, 1.25);
  assert.strictEqual(s.players[0].damageMultiplier, 1); // player slot unaffected
});

test("Hard mode: createMatch with no options leaves damageMultiplier at 1 (backwards compat)", () => {
  const s = Combat.createMatch("moses", "david");
  assert.strictEqual(s.players[0].damageMultiplier, 1);
  assert.strictEqual(s.players[1].damageMultiplier, 1);
});

test("Hard mode: attack damage is multiplied by 1.25 and rounded", () => {
  // Moses attack = 10, * 1.25 = 12.5 -> 13 (Math.round)
  const s = Combat.createMatch("moses", "david", { hardMode: true, hardOpponentSlot: 0 });
  const startHp = s.players[1].hp;
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, startHp - 13);
});

test("Hard mode: special damage is multiplied by 1.25 and rounded", () => {
  // Moses special = 25, * 1.25 = 31.25 -> 31 (Math.round)
  const s = Combat.createMatch("moses", "david", { hardMode: true, hardOpponentSlot: 0 });
  const startHp = s.players[1].hp;
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[1].hp, startHp - 31);
});

test("Hard mode AI weights: special on cooldown → attack 65%, defend 35%", () => {
  const s = Combat.createMatch("moses", "david");
  s.players[0].specialCooldown = 2;
  // r < 0.65 → attack
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0,  "hard"), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.64, "hard"), "attack");
  // r >= 0.65 → defend
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.65, "hard"), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99, "hard"), "defend");
});

test("Hard mode AI weights: special available → attack 45%, defend 25%, special 30%", () => {
  const s = Combat.createMatch("moses", "david");
  s.players[0].specialCooldown = 0;
  // r < 0.45 → attack
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0,  "hard"), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.44, "hard"), "attack");
  // 0.45 <= r < 0.70 → defend
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.45, "hard"), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.69, "hard"), "defend");
  // r >= 0.70 → special
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.70, "hard"), "special");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99, "hard"), "special");
});

test("Hard mode AI: charging always returns 'charge' regardless of difficulty", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special"); // charging=2
  s.activePlayer = 0;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0, "hard"), "charge");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99, "hard"), "charge");
});
