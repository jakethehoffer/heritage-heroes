// test/test-storage.js
const test = require("node:test");
const assert = require("node:assert");
const Storage = require("../src/storage.js");

function fakeStore() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); }
  };
}

function throwingStore() {
  return {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); }
  };
}

test("load returns defaults when store is empty", () => {
  const data = Storage.load(fakeStore());
  assert.deepStrictEqual(data.arcade, { moses: 0, david: 0, esther: 0, judah: 0, rambam: 0, golda: 0, einstein: 0 });
  assert.strictEqual(data.sound, false);
  assert.strictEqual(data.tutorialSeen, false);
});

test("save then load round-trips a value", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.arcade.moses = 3;
  data.sound = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.arcade.moses, 3);
  assert.strictEqual(reloaded.sound, true);
});

test("load returns defaults when stored JSON is corrupt", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", "{not json");
  const data = Storage.load(s);
  assert.strictEqual(data.arcade.moses, 0);
});

test("load returns defaults when store throws", () => {
  const data = Storage.load(throwingStore());
  assert.strictEqual(data.arcade.moses, 0);
  assert.strictEqual(data.sound, false);
});

test("save is a no-op when store throws", () => {
  Storage.save(throwingStore(), { arcade: {}, sound: true, tutorialSeen: true });
});

test("incrementArcadeWin increments the right counter", () => {
  const s = fakeStore();
  Storage.incrementArcadeWin(s, "moses");
  Storage.incrementArcadeWin(s, "moses");
  Storage.incrementArcadeWin(s, "david");
  const data = Storage.load(s);
  assert.strictEqual(data.arcade.moses, 2);
  assert.strictEqual(data.arcade.david, 1);
  assert.strictEqual(data.arcade.esther, 0);
});

test("specialsUnlocked defaults to all false and round-trips correctly", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  const heroIds = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];
  // All start as false
  for (const id of heroIds) {
    assert.strictEqual(data.specialsUnlocked[id], false, `${id} should default to false`);
  }
  // Set a couple to true, save, reload
  data.specialsUnlocked.moses = true;
  data.specialsUnlocked.golda = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.specialsUnlocked.moses, true);
  assert.strictEqual(reloaded.specialsUnlocked.golda, true);
  assert.strictEqual(reloaded.specialsUnlocked.david, false);
  assert.strictEqual(reloaded.specialsUnlocked.einstein, false);
});

test("unlockSpecial sets the right key and leaves others false", () => {
  const s = fakeStore();
  Storage.unlockSpecial(s, "esther");
  const data = Storage.load(s);
  assert.strictEqual(data.specialsUnlocked.esther, true);
  // All others still false
  for (const id of ["moses", "david", "judah", "rambam", "golda", "einstein"]) {
    assert.strictEqual(data.specialsUnlocked[id], false, `${id} should still be false`);
  }
});

test("mastered defaults to all false", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  const heroIds = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];
  for (const id of heroIds) {
    assert.strictEqual(data.mastered[id], false, `${id} mastered should default to false`);
  }
});

test("mastered round-trips via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.mastered.moses = true;
  data.mastered.golda = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.mastered.moses, true);
  assert.strictEqual(reloaded.mastered.golda, true);
  assert.strictEqual(reloaded.mastered.david, false);
  assert.strictEqual(reloaded.mastered.einstein, false);
});

test("markMastered flips only the targeted hero", () => {
  const s = fakeStore();
  Storage.markMastered(s, "david");
  const data = Storage.load(s);
  assert.strictEqual(data.mastered.david, true);
  for (const id of ["moses", "esther", "judah", "rambam", "golda", "einstein"]) {
    assert.strictEqual(data.mastered[id], false, `${id} should still be false`);
  }
});

test("totalMastered returns 0 when none are mastered", () => {
  const s = fakeStore();
  assert.strictEqual(Storage.totalMastered(s), 0);
});

test("totalMastered returns correct count after marking several heroes", () => {
  const s = fakeStore();
  Storage.markMastered(s, "moses");
  Storage.markMastered(s, "esther");
  Storage.markMastered(s, "rambam");
  assert.strictEqual(Storage.totalMastered(s), 3);
});

// ── Stats defaults ─────────────────────────────────────────────────────────
test("stats defaults to all zeros", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.stats.matchesPlayed, 0);
  assert.strictEqual(data.stats.matchesWon,    0);
  assert.strictEqual(data.stats.triviaCorrect, 0);
  assert.strictEqual(data.stats.triviaTotal,   0);
});

test("stats.perHero defaults all heroes to all zeros", () => {
  const data = Storage.load(fakeStore());
  const heroIds = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];
  for (const id of heroIds) {
    const ph = data.stats.perHero[id];
    assert.ok(ph, `perHero[${id}] should exist`);
    assert.strictEqual(ph.played,       0, `${id}.played`);
    assert.strictEqual(ph.won,          0, `${id}.won`);
    assert.strictEqual(ph.triviaCorrect,0, `${id}.triviaCorrect`);
    assert.strictEqual(ph.triviaTotal,  0, `${id}.triviaTotal`);
  }
});

// ── recordMatch ────────────────────────────────────────────────────────────
test("recordMatch increments global matchesPlayed and matchesWon by 1", () => {
  const s = fakeStore();
  Storage.recordMatch(s, "moses", "david");
  const data = Storage.load(s);
  assert.strictEqual(data.stats.matchesPlayed, 1);
  assert.strictEqual(data.stats.matchesWon,    1);
});

test("recordMatch increments perHero played and won for winner, played only for loser", () => {
  const s = fakeStore();
  Storage.recordMatch(s, "moses", "david");
  const data = Storage.load(s);
  assert.strictEqual(data.stats.perHero.moses.played, 1);
  assert.strictEqual(data.stats.perHero.moses.won,    1);
  assert.strictEqual(data.stats.perHero.david.played, 1);
  assert.strictEqual(data.stats.perHero.david.won,    0);
});

test("recordMatch accumulates across multiple calls", () => {
  const s = fakeStore();
  Storage.recordMatch(s, "esther", "judah");
  Storage.recordMatch(s, "esther", "golda");
  const data = Storage.load(s);
  assert.strictEqual(data.stats.matchesPlayed,         2);
  assert.strictEqual(data.stats.matchesWon,            2);
  assert.strictEqual(data.stats.perHero.esther.played, 2);
  assert.strictEqual(data.stats.perHero.esther.won,    2);
  assert.strictEqual(data.stats.perHero.judah.played,  1);
  assert.strictEqual(data.stats.perHero.golda.played,  1);
});

// ── recordTrivia ───────────────────────────────────────────────────────────
test("recordTrivia increments triviaTotal globally and perHero", () => {
  const s = fakeStore();
  Storage.recordTrivia(s, "rambam", false);
  const data = Storage.load(s);
  assert.strictEqual(data.stats.triviaTotal,             1);
  assert.strictEqual(data.stats.triviaCorrect,           0);
  assert.strictEqual(data.stats.perHero.rambam.triviaTotal,   1);
  assert.strictEqual(data.stats.perHero.rambam.triviaCorrect, 0);
});

test("recordTrivia increments triviaCorrect when wasCorrect=true", () => {
  const s = fakeStore();
  Storage.recordTrivia(s, "golda", true);
  const data = Storage.load(s);
  assert.strictEqual(data.stats.triviaCorrect,             1);
  assert.strictEqual(data.stats.perHero.golda.triviaCorrect, 1);
});

// ── unlockAchievement ─────────────────────────────────────────────────────
test("unlockAchievement flips only the targeted achievement key", () => {
  const s = fakeStore();
  Storage.unlockAchievement(s, "firstWin");
  const data = Storage.load(s);
  assert.strictEqual(data.achievements.firstWin, true);
  // all others still false
  const keys = ["arcadeChampion","hardChampion","heroOfThePeople","triviaApprentice",
                 "triviaScholar","triviaSage","heritageScholar","streakOf5","streakOf10",
                 "comeback","centurion"];
  for (const k of keys) {
    assert.strictEqual(data.achievements[k], false, `${k} should still be false`);
  }
});

test("unlockAchievement is idempotent (second call is a no-op)", () => {
  const s = fakeStore();
  Storage.unlockAchievement(s, "centurion");
  Storage.unlockAchievement(s, "centurion");
  const data = Storage.load(s);
  assert.strictEqual(data.achievements.centurion, true);
});

// ── achievements defaults ─────────────────────────────────────────────────
test("achievements defaults to all false", () => {
  const data = Storage.load(fakeStore());
  for (const key of Object.keys(data.achievements)) {
    assert.strictEqual(data.achievements[key], false, `${key} should default false`);
  }
});

test("achievements round-trips via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.achievements.firstWin      = true;
  data.achievements.arcadeChampion = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.achievements.firstWin,       true);
  assert.strictEqual(reloaded.achievements.arcadeChampion, true);
  assert.strictEqual(reloaded.achievements.centurion,      false);
});

// ── hardCleared ───────────────────────────────────────────────────────────
test("hardCleared defaults to false", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.hardCleared, false);
});

test("hardCleared round-trips via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.hardCleared = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.hardCleared, true);
});

// ── bossSlayer achievement ─────────────────────────────────────────────────
test("bossSlayer achievement defaults to false", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.achievements.bossSlayer, false);
});

test("bossSlayer achievement round-trips via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.achievements.bossSlayer = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.achievements.bossSlayer, true);
  // Verify other achievements stay false
  assert.strictEqual(reloaded.achievements.firstWin, false);
  assert.strictEqual(reloaded.achievements.centurion, false);
});

test("unlockAchievement sets bossSlayer and leaves others unchanged", () => {
  const s = fakeStore();
  Storage.unlockAchievement(s, "bossSlayer");
  const data = Storage.load(s);
  assert.strictEqual(data.achievements.bossSlayer, true);
  assert.strictEqual(data.achievements.firstWin, false);
});

// ── endlessHighScore defaults ─────────────────────────────────────────────
test("endlessHighScore defaults to all zeros for all 7 heroes", () => {
  const data = Storage.load(fakeStore());
  const heroIds = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];
  assert.ok(data.endlessHighScore, "endlessHighScore should exist");
  for (const id of heroIds) {
    assert.strictEqual(data.endlessHighScore[id], 0, `endlessHighScore[${id}] should default to 0`);
  }
});

test("endlessHighScore round-trips via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.endlessHighScore.moses = 7;
  data.endlessHighScore.esther = 3;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.endlessHighScore.moses, 7);
  assert.strictEqual(reloaded.endlessHighScore.esther, 3);
  assert.strictEqual(reloaded.endlessHighScore.david, 0);
});

// ── recordEndlessRun ──────────────────────────────────────────────────────
test("recordEndlessRun first call sets score and returns isNewBest=true, previousBest=0", () => {
  const s = fakeStore();
  const result = Storage.recordEndlessRun(s, "moses", 4);
  assert.strictEqual(result.isNewBest, true);
  assert.strictEqual(result.previousBest, 0);
  const data = Storage.load(s);
  assert.strictEqual(data.endlessHighScore.moses, 4);
});

test("recordEndlessRun second call with higher streak overwrites and returns isNewBest=true", () => {
  const s = fakeStore();
  Storage.recordEndlessRun(s, "david", 5);
  const result = Storage.recordEndlessRun(s, "david", 9);
  assert.strictEqual(result.isNewBest, true);
  assert.strictEqual(result.previousBest, 5);
  const data = Storage.load(s);
  assert.strictEqual(data.endlessHighScore.david, 9);
});

test("recordEndlessRun third call with lower streak does not change score, returns isNewBest=false", () => {
  const s = fakeStore();
  Storage.recordEndlessRun(s, "esther", 8);
  Storage.recordEndlessRun(s, "esther", 12);
  const result = Storage.recordEndlessRun(s, "esther", 3);
  assert.strictEqual(result.isNewBest, false);
  assert.strictEqual(result.previousBest, 12);
  const data = Storage.load(s);
  assert.strictEqual(data.endlessHighScore.esther, 12);
});

// ── Endless achievements defaults ─────────────────────────────────────────
test("endless achievements default to false", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.achievements.endlessSurvivor, false);
  assert.strictEqual(data.achievements.endlessMarathon, false);
  assert.strictEqual(data.achievements.endlessLegend,   false);
});

// ── animSpeed ─────────────────────────────────────────────────────────────
test("animSpeed defaults to 'normal'", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.animSpeed, "normal");
});

test("animSpeed round-trips a valid value via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.animSpeed = "fast";
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.animSpeed, "fast");

  // Also test 'slow'
  reloaded.animSpeed = "slow";
  Storage.save(s, reloaded);
  const reloaded2 = Storage.load(s);
  assert.strictEqual(reloaded2.animSpeed, "slow");
});

test("animSpeed rejects invalid value and falls back to 'normal'", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.animSpeed = "warp9";
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.animSpeed, "normal");
});

test("Storage.resetAll wipes save back to defaults", () => {
  const s = fakeStore();
  // First, accumulate some non-default state
  const data = Storage.load(s);
  data.sound = true;
  data.animSpeed = "fast";
  data.stats.matchesPlayed = 42;
  data.achievements.firstWin = true;
  Storage.save(s, data);

  // Confirm it was saved
  const before = Storage.load(s);
  assert.strictEqual(before.sound, true);
  assert.strictEqual(before.animSpeed, "fast");
  assert.strictEqual(before.stats.matchesPlayed, 42);
  assert.strictEqual(before.achievements.firstWin, true);

  // Reset
  Storage.resetAll(s);

  // Confirm everything is back to defaults
  const after = Storage.load(s);
  assert.strictEqual(after.sound, false);
  assert.strictEqual(after.animSpeed, "normal");
  assert.strictEqual(after.stats.matchesPlayed, 0);
  assert.strictEqual(after.achievements.firstWin, false);
});
