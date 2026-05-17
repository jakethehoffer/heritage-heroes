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

test("AI Moses: special on cooldown -> 60% attack, 40% defend", () => {
  const s = Combat.createMatch("moses", "david");
  s.players[0].specialCooldown = 2;
  // rng < 0.60 -> attack
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.59), "attack");
  // rng >= 0.60 -> defend
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.60), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "defend");
});

test("AI Moses: uses special when opponent HP > 75% of maxHp and low rng", () => {
  const s = Combat.createMatch("moses", "david");
  // David starts at 95 HP (maxHp=95); 75% of 95 = 71.25 — David at full HP qualifies
  // First rng() call is the condition check; supply 0.29 (< 0.30) to trigger special
  let calls = 0;
  const rng = () => { calls++; return calls === 1 ? 0.29 : 0.99; };
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng), "special");
});

test("AI Moses: falls back to 40/35/25 split when rng is high on first roll", () => {
  const s = Combat.createMatch("moses", "david");
  // First roll >=0.30 (skip special condition), second roll drives the split
  let calls = 0;
  // First call = 0.50 (>= 0.30, so condition not triggered), second call drives split
  const rngAttack = () => { calls++; return calls === 1 ? 0.50 : 0.20; }; // 0.20 < 0.40 -> attack
  assert.strictEqual(Combat.chooseAIMove(s, 0, rngAttack), "attack");
  calls = 0;
  const rngDefend = () => { calls++; return calls === 1 ? 0.50 : 0.60; }; // 0.60 in [0.40,0.75) -> defend
  assert.strictEqual(Combat.chooseAIMove(s, 0, rngDefend), "defend");
  calls = 0;
  const rngSpecial = () => { calls++; return calls === 1 ? 0.50 : 0.80; }; // 0.80 >= 0.75 -> special
  assert.strictEqual(Combat.chooseAIMove(s, 0, rngSpecial), "special");
});

// append
test("arcadeOrder: returns the other 7 heroes in a fixed order", () => {
  const order = Combat.arcadeOrder("moses");
  assert.strictEqual(order.length, 7);
  assert.ok(!order.includes("moses"));
  // Order must be stable
  assert.deepStrictEqual(order, Combat.arcadeOrder("moses"));
});

test("arcadeOrder: for david omits david but includes moses and samson", () => {
  const order = Combat.arcadeOrder("david");
  assert.ok(!order.includes("david"));
  assert.ok(order.includes("moses"));
  assert.ok(order.includes("samson"));
  assert.strictEqual(order.length, 7);
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

test("Hard mode AI: special on cooldown means no override possible", () => {
  // With cooldown > 0, the overlay cannot override to special.
  // Moses on cooldown: 60% attack, 40% defend — Hard mode cannot override since special unavailable.
  const s = Combat.createMatch("moses", "david");
  s.players[0].specialCooldown = 2;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0,  "hard"), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99, "hard"), "defend");
});

test("Hard mode AI: defend -> special override when rng triggers (30% chance)", () => {
  // Moses with special available and opponent HP > 75% maxHp.
  // Sequence: first rng() = 0.99 (opponent HP check fails), second rng() = 0.90 (>= 0.40 -> defend via base),
  // but wait — Moses's personality uses 2 rng calls when condition check fails (one for condition, one for split).
  // Let's use a simpler scenario: force Moses to pick "defend" then let overlay fire.
  // opponent HP is below 75% threshold so condition check is skipped (r=0.99 still, and opp hp forced low)
  const s = Combat.createMatch("moses", "david");
  s.players[1].hp = 1; // below 75% of 95 — condition won't fire
  // personality rolls: first roll 0.99 (condition fails), second roll 0.50 (falls in defend bucket [0.40,0.75))
  // overlay roll: 0.10 (< 0.30) -> overrides to special
  let seq = [0.99, 0.50, 0.10];
  let i = 0;
  const rng = () => seq[i++];
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng, "hard"), "special");
});

test("Hard mode AI: attack -> special override when rng triggers (20% chance)", () => {
  // Moses with opponent HP low (condition check fails), personality picks attack, overlay overrides.
  const s = Combat.createMatch("moses", "david");
  s.players[1].hp = 1;
  // first roll 0.99 (condition fails), second roll 0.10 (< 0.40 -> attack), overlay roll 0.10 (< 0.20 -> override to special)
  let seq = [0.99, 0.10, 0.10];
  let i = 0;
  const rng = () => seq[i++];
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng, "hard"), "special");
});

test("Hard mode AI: overlay does NOT fire when rng is above threshold", () => {
  // Moses picks defend on Normal; overlay roll 0.50 (>= 0.30) -> stays defend
  const s = Combat.createMatch("moses", "david");
  s.players[1].hp = 1;
  let seq = [0.99, 0.50, 0.50]; // condition fails, defend, overlay no-op
  let i = 0;
  const rng = () => seq[i++];
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng, "hard"), "defend");
});

test("Hard mode AI: charging always returns 'charge' regardless of difficulty", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special"); // charging=2
  s.activePlayer = 0;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0, "hard"), "charge");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99, "hard"), "charge");
});

// ─── Per-hero personality tests ─────────────────────────────────────────────

test("AI David: special when opponent HP > 50 and rng < 0.40", () => {
  // David vs Moses: Moses starts at 100 HP (> 50), first rng call is 0.39 < 0.40 -> special
  const s = Combat.createMatch("david", "moses");
  let calls = 0;
  const rng = () => { calls++; return calls === 1 ? 0.39 : 0.99; };
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng), "special");
});

test("AI David: special on cooldown -> 75/25 attack/defend split", () => {
  const s = Combat.createMatch("david", "moses");
  s.players[0].specialCooldown = 2;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.74), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.75), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "defend");
});

test("AI Esther: special when opponent's special is available (cd=0) and rng < 0.50", () => {
  // Esther vs Moses: Moses specialCooldown=0 (ready). First rng = 0.40 < 0.50 -> special.
  const s = Combat.createMatch("esther", "moses");
  assert.strictEqual(s.players[1].specialCooldown, 0, "Moses special ready");
  let calls = 0;
  const rng = () => { calls++; return calls === 1 ? 0.40 : 0.99; };
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng), "special");
});

test("AI Esther: no special trigger when opponent's special is on cooldown", () => {
  // Esther vs Moses: Moses specialCooldown=2 -> condition not triggered, falls to split
  const s = Combat.createMatch("esther", "moses");
  s.players[1].specialCooldown = 2;
  // First rng = 0.10 (condition check irrelevant since cd>0), split rng = 0.10 < 0.40 -> attack
  let calls = 0;
  const rng = () => { calls++; return 0.10; };
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng), "attack");
});

test("AI Esther: special on cooldown -> 55/45 attack/defend split", () => {
  const s = Combat.createMatch("esther", "moses");
  s.players[0].specialCooldown = 2;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.54), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.55), "defend");
});

test("AI Judah: special when opponent has no burn and rng < 0.45", () => {
  // Judah vs Moses: Moses has no burn status (default). First rng = 0.40 < 0.45 -> special.
  const s = Combat.createMatch("judah", "moses");
  let calls = 0;
  const rng = () => { calls++; return calls === 1 ? 0.40 : 0.99; };
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng), "special");
});

test("AI Judah: skips special trigger when opponent already has burn", () => {
  const s = Combat.createMatch("judah", "moses");
  s.players[1].statuses.burn = 3; // burn already applied
  // condition skipped; split rng 0.10 < 0.55 -> attack
  let calls = 0;
  const rng = () => { calls++; return 0.10; };
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng), "attack");
});

test("AI Rambam: forces special when own HP < 50% of maxHp regardless of rng", () => {
  // Rambam maxHp=85; 50% = 42.5 -> hp=42 triggers forced heal
  const s = Combat.createMatch("rambam", "moses");
  s.players[0].hp = 42;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "special");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "special");
});

test("AI Rambam: at exactly 50% HP does NOT force special (threshold is strictly less than)", () => {
  const s = Combat.createMatch("rambam", "moses");
  s.players[0].hp = Math.floor(85 * 0.50); // 42 HP — same as above, still forces
  // 42 < 42.5 -> still true; use 43 to be above threshold
  s.players[0].hp = 43; // 43 >= 42.5 -> no forced heal
  // rng 0.10 -> 40% attack bucket
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.10), "attack");
});

test("AI Golda: forces attack when doubleNextAttack buff is active", () => {
  const s = Combat.createMatch("golda", "moses");
  s.players[0].statuses.doubleNextAttack = true;
  // Any rng value should return attack
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "attack");
});

test("AI Golda: special on cooldown -> 60/40 attack/defend (no buff active)", () => {
  const s = Combat.createMatch("golda", "moses");
  s.players[0].specialCooldown = 2;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.59), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.60), "defend");
});

test("AI Einstein: special when own HP < 50% of maxHp and rng < 0.55", () => {
  // Einstein maxHp=80; 50% = 40; set hp=35 (< 40).
  const s = Combat.createMatch("einstein", "moses");
  s.players[0].hp = 35;
  let calls = 0;
  const rng = () => { calls++; return calls === 1 ? 0.50 : 0.99; }; // 0.50 < 0.55 -> special
  assert.strictEqual(Combat.chooseAIMove(s, 0, rng), "special");
});

test("AI Einstein: no forced special above 50% HP", () => {
  const s = Combat.createMatch("einstein", "moses");
  s.players[0].hp = 41; // 41 >= 40 (50% of 80) -> no forced special
  // rng 0.10 -> 50% attack bucket
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.10), "attack");
});

test("AI charging: any hero with charging status always returns 'charge'", () => {
  // Use Einstein who can actually charge; manually set charging for another hero too
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special"); // Einstein charging=2
  s.activePlayer = 0;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "charge");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "charge");
  // Also test a hero that doesn't normally charge but has charging status injected
  const s2 = Combat.createMatch("moses", "david");
  s2.players[0].statuses.charging = 1;
  assert.strictEqual(Combat.chooseAIMove(s2, 0, () => 0.0),  "charge");
});

// ─── Boss encounter tests ─────────────────────────────────────────────────

test("Boss: createMatch with bossSlot=1 boosts player 1 maxHp by ~25%", () => {
  const s = Combat.createMatch("moses", "david", { bossSlot: 1 });
  const davidHp = Heroes.byId("david").hp;
  const expectedMax = Math.round(davidHp * 1.25);
  assert.strictEqual(s.players[1].maxHp, expectedMax);
  assert.strictEqual(s.players[1].hp, expectedMax);
  // Player 0 (moses) unaffected
  assert.strictEqual(s.players[0].maxHp, Heroes.byId("moses").hp);
});

test("Boss: createMatch with bossSlot=1 applies 1.20 damageMultiplier", () => {
  const s = Combat.createMatch("moses", "david", { bossSlot: 1 });
  assert.strictEqual(s.players[1].damageMultiplier, 1.20);
  // Player 0 unaffected
  assert.strictEqual(s.players[0].damageMultiplier, 1);
});

test("Boss: hardMode + bossSlot stacks multipliers (1.25 * 1.20 = 1.50)", () => {
  const s = Combat.createMatch("moses", "david", { hardMode: true, hardOpponentSlot: 1, bossSlot: 1 });
  // hard sets 1.25 first, then boss multiplies by 1.20: 1.25 * 1.20 = 1.50
  assert.strictEqual(s.players[1].damageMultiplier, 1.50);
});

test("Boss: createMatch with bossSlot=1 sets bossTwist=true on slot 1", () => {
  const s = Combat.createMatch("moses", "david", { bossSlot: 1 });
  assert.strictEqual(s.players[1].bossTwist, true);
  assert.strictEqual(s.players[0].bossTwist, undefined);
});

test("Boss Moses twist: starts with defend status already active", () => {
  // Moses in slot 1 as boss
  const s = Combat.createMatch("david", "moses", { bossSlot: 1 });
  assert.strictEqual(s.players[1].statuses.defend, true);
  // David (slot 0) has no defend status
  assert.strictEqual(s.players[0].statuses.defend, undefined);
});

test("Boss Judah twist: Menorah Flame burn lasts 4 turns instead of 3", () => {
  // Judah in slot 0 as boss
  const s = Combat.createMatch("judah", "moses", { bossSlot: 0 });
  assert.strictEqual(s.players[0].bossTwist, true);
  Combat.applyMove(s, "special"); // Judah fires Menorah Flame
  assert.strictEqual(s.players[1].statuses.burn, 4);
});

test("Boss Rambam twist: Healing Touch restores 30 HP instead of 20", () => {
  const s = Combat.createMatch("rambam", "moses", { bossSlot: 0 });
  s.players[0].hp = 50;
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].hp, 80); // 50 + 30
});

test("Boss Einstein twist: charge takes 1 turn instead of 2", () => {
  const s = Combat.createMatch("einstein", "moses", { bossSlot: 0 });
  Combat.applyMove(s, "special"); // Einstein starts charging
  assert.strictEqual(s.players[0].statuses.charging, 1);
  // One charge tick should fire the blast
  Combat.applyMove(s, "attack"); // Moses's turn (attacks Einstein for 10)
  const mosesHpBeforeBlast = s.players[1].hp; // Moses's HP before Einstein fires
  Combat.applyMove(s, "charge"); // Einstein: tick 1->0, blast fires for 40 * 1.20 = 48
  assert.strictEqual(s.players[0].statuses.charging, undefined, "charging cleared after blast");
  // Boss Einstein blast damage = Math.round(40 * 1.20) = 48
  const expectedBlastDmg = Math.round(40 * 1.20);
  assert.strictEqual(s.players[1].hp, Math.max(0, mosesHpBeforeBlast - expectedBlastDmg));
});

test("Boss David twist: bonus activates at >30 HP (not >50) and is +15", () => {
  const s = Combat.createMatch("david", "moses", { bossSlot: 0 });
  // Set Moses to 40 HP — this is >30 but NOT >50, so boss twist applies the +15 bonus
  s.players[1].hp = 40;
  Combat.applyMove(s, "special"); // David boss special: 22 + 15 = 37, * 1.20 = 44 -> KO
  // 40 - Math.round(37 * 1.20) = 40 - 44 = -4, clamped to 0
  const expected = Math.max(0, 40 - Math.round((22 + 15) * 1.20));
  assert.strictEqual(s.players[1].hp, expected);
  // Also verify that a normal David (no boss) at 40 HP would get no bonus (hp <= 50 condition)
  const s2 = Combat.createMatch("david", "moses");
  s2.players[1].hp = 40;
  Combat.applyMove(s2, "special"); // Normal David: 22+0=22 damage
  assert.strictEqual(s2.players[1].hp, 40 - 22);
});

test("Boss Esther twist: Reversal reflects at 2.0x instead of 1.5x", () => {
  // Esther in slot 0 as boss vs Moses (attack=10)
  const s = Combat.createMatch("esther", "moses", { bossSlot: 0 });
  Combat.applyMove(s, "special"); // Esther reversal + reversalMult=2.0
  assert.strictEqual(s.players[0].statuses.reversalMult, 2.0);
  // Moses attacks for 10; reversed at 2x = 20
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].hp, s.players[0].maxHp, "Esther unharmed");
  assert.strictEqual(s.players[1].hp, 100 - 20, "Moses takes 20 reflected (2x)");
});

// ─── Samson tests ────────────────────────────────────────────────────────────

test("Samson's special: deals 30 damage to opponent and 12 to self", () => {
  const s = Combat.createMatch("samson", "moses"); // Moses 100 HP, Samson 110 HP
  Combat.applyMove(s, "special"); // Collapse the Pillars
  assert.strictEqual(s.players[1].hp, 100 - 30, "opponent takes 30 damage");
  assert.strictEqual(s.players[0].hp, 110 - 12, "Samson takes 12 self-damage");
});

test("Samson's special: boss twist deals 40 to opponent and 18 to self", () => {
  const s = Combat.createMatch("samson", "moses", { bossSlot: 0 });
  // Boss Samson: maxHp = round(110 * 1.25) = 138, damageMultiplier=1.20
  const samsonMaxHp = Math.round(110 * 1.25);
  assert.strictEqual(s.players[0].maxHp, samsonMaxHp, "boss HP boosted");
  Combat.applyMove(s, "special");
  // Opponent dmg = Math.round(40 * 1.20) = 48; self dmg = 18 (constant)
  const expectedOppDmg = Math.round(40 * 1.20);
  assert.strictEqual(s.players[1].hp, 100 - expectedOppDmg, "opponent takes 40 * 1.20 damage");
  assert.strictEqual(s.players[0].hp, samsonMaxHp - 18, "Samson takes 18 self-damage (constant, not multiplied)");
});

test("Samson's special: self-damage can KO Samson (opponent wins)", () => {
  const s = Combat.createMatch("samson", "moses");
  s.players[0].hp = 10; // Samson has only 10 HP — 12 self-damage will KO him
  s.players[1].hp = 50; // Opponent survives the 30 damage
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].hp, 0, "Samson KOs himself");
  assert.strictEqual(s.winner, 1, "opponent (moses, slot 1) wins when Samson self-KOs");
});

test("Samson's special: self-damage log entry is appended", () => {
  const s = Combat.createMatch("samson", "moses");
  Combat.applyMove(s, "special");
  // Log should include both the normal move log and the self-hit log
  const selfHitLog = s.log.find(l => l.includes("12") && l.toLowerCase().includes("pillar"));
  assert.ok(selfHitLog, "log should include self-damage message about collapsing pillars");
});

test("Samson's special: enters 3-turn cooldown after use", () => {
  const s = Combat.createMatch("samson", "moses");
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].specialCooldown, 3);
});

// ─── Samson AI personality tests ─────────────────────────────────────────────

test("AI Samson: uses special when HP < 30% of maxHp and special available (any rng)", () => {
  const s = Combat.createMatch("samson", "moses");
  // Samson maxHp=110; 30% = 33; set hp=30 to trigger last-resort
  s.players[0].hp = 30;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "special");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "special");
});

test("AI Samson: does NOT force special above 30% HP threshold", () => {
  const s = Combat.createMatch("samson", "moses");
  // 30% of 110 = 33; hp=34 is above threshold
  s.players[0].hp = 34;
  // rng=0.0 -> < 0.55 -> attack
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0), "attack");
});

test("AI Samson: does NOT force special when HP < 30% but cooldown > 0", () => {
  const s = Combat.createMatch("samson", "moses");
  s.players[0].hp = 20;
  s.players[0].specialCooldown = 2; // on cooldown
  // Should fall through to cooldown branch: 70% attack, 30% defend
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.70), "defend");
});

test("AI Samson: when special on cooldown uses 70/30 attack/defend split", () => {
  const s = Combat.createMatch("samson", "moses");
  s.players[0].specialCooldown = 2;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.69), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.70), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "defend");
});

test("AI Samson: normal play uses 55/15/30 attack/defend/special split", () => {
  const s = Combat.createMatch("samson", "moses");
  s.players[0].hp = 100; // above 30% threshold
  // rng < 0.55 -> attack
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.54), "attack");
  // 0.55 <= rng < 0.70 -> defend
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.55), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.69), "defend");
  // rng >= 0.70 -> special
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.70), "special");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "special");
});
