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
  assert.ok(data.achievements.firstWin > 0, "firstWin should be a positive timestamp");
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
  const firstTs = Storage.load(s).achievements.centurion;
  Storage.unlockAchievement(s, "centurion");
  const data = Storage.load(s);
  assert.ok(data.achievements.centurion > 0, "centurion should be a positive timestamp");
  assert.strictEqual(data.achievements.centurion, firstTs, "second call should not change the timestamp");
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
  const now = Date.now();
  data.achievements.firstWin       = now;
  data.achievements.arcadeChampion = now;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.achievements.firstWin,       now);
  assert.strictEqual(reloaded.achievements.arcadeChampion, now);
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
  const now = Date.now();
  data.achievements.bossSlayer = now;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.achievements.bossSlayer, now);
  // Verify other achievements stay false
  assert.strictEqual(reloaded.achievements.firstWin, false);
  assert.strictEqual(reloaded.achievements.centurion, false);
});

test("unlockAchievement sets bossSlayer and leaves others unchanged", () => {
  const s = fakeStore();
  Storage.unlockAchievement(s, "bossSlayer");
  const data = Storage.load(s);
  assert.ok(data.achievements.bossSlayer > 0, "bossSlayer should be a positive timestamp");
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

// ── textSize (accessibility) ──────────────────────────────────────────────
test("textSize defaults to 'normal'", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.textSize, "normal");
});

test("textSize round-trips 'normal' / 'large' / 'xlarge' via save/load", () => {
  const s = fakeStore();
  for (const size of ["normal", "large", "xlarge"]) {
    const data = Storage.load(s);
    data.textSize = size;
    Storage.save(s, data);
    const reloaded = Storage.load(s);
    assert.strictEqual(reloaded.textSize, size, `${size} should round-trip`);
  }
});

test("textSize rejects malformed values and falls back to 'normal'", () => {
  const malformed = ["huge", "", "LARGE", null, 0, 1, true, false, [], {}];
  for (const bad of malformed) {
    const s = fakeStore();
    // Manually inject the malformed value via raw JSON so we exercise load()'s
    // validator (not save(), which would JSON-stringify anything).
    s.setItem("heritageHeroes.save", JSON.stringify({ textSize: bad }));
    const reloaded = Storage.load(s);
    assert.strictEqual(reloaded.textSize, "normal",
      `malformed textSize ${JSON.stringify(bad)} should default to "normal"`);
  }
});

test("textSize persists alongside other settings (animSpeed, music)", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.textSize  = "xlarge";
  data.animSpeed = "fast";
  data.music     = false;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.textSize, "xlarge");
  assert.strictEqual(reloaded.animSpeed, "fast");
  assert.strictEqual(reloaded.music, false);
});

// ── theme (accessibility) ─────────────────────────────────────────────────
test("theme defaults to 'default'", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.theme, "default");
});

test("theme round-trips 'default' and 'high-contrast' via save/load", () => {
  const s = fakeStore();
  for (const theme of ["default", "high-contrast"]) {
    const data = Storage.load(s);
    data.theme = theme;
    Storage.save(s, data);
    const reloaded = Storage.load(s);
    assert.strictEqual(reloaded.theme, theme, `${theme} should round-trip`);
  }
});

test("theme rejects malformed values and falls back to 'default'", () => {
  const malformed = ["dark", "light", "", "DEFAULT", null, 0, 1, true, false, [], {}];
  for (const bad of malformed) {
    const s = fakeStore();
    s.setItem("heritageHeroes.save", JSON.stringify({ theme: bad }));
    const reloaded = Storage.load(s);
    assert.strictEqual(reloaded.theme, "default",
      `malformed theme ${JSON.stringify(bad)} should default to "default"`);
  }
});

test("theme persists alongside other settings (textSize, animSpeed)", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.theme     = "high-contrast";
  data.textSize  = "large";
  data.animSpeed = "fast";
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.theme, "high-contrast");
  assert.strictEqual(reloaded.textSize, "large");
  assert.strictEqual(reloaded.animSpeed, "fast");
});

// ── recentMatches / recordMatchHistory ────────────────────────────────────────

test("recentMatches defaults to empty array", () => {
  const data = Storage.load(fakeStore());
  assert.ok(Array.isArray(data.recentMatches), "recentMatches should be an array");
  assert.strictEqual(data.recentMatches.length, 0);
});

test("recordMatchHistory pushes entry to front of recentMatches", () => {
  const s = fakeStore();
  const entry = { id: 1000, date: "2026-05-17T12:00:00.000Z", mode: "quick",
    hero0Id: "moses", hero1Id: "david", winnerSlot: 0, turns: 10,
    biggestHit: null, specialsUsed: [1, 0], triviaCorrect: 1, triviaTotal: 2, log: [] };
  const entry2 = { id: 2000, date: "2026-05-17T13:00:00.000Z", mode: "arcade",
    hero0Id: "esther", hero1Id: "judah", winnerSlot: 1, turns: 8,
    biggestHit: null, specialsUsed: [0, 0], triviaCorrect: 0, triviaTotal: 0, log: [] };
  Storage.recordMatchHistory(s, entry);
  Storage.recordMatchHistory(s, entry2);
  const data = Storage.load(s);
  assert.strictEqual(data.recentMatches.length, 2);
  assert.strictEqual(data.recentMatches[0].id, 2000, "newest entry should be first");
  assert.strictEqual(data.recentMatches[1].id, 1000);
});

test("recordMatchHistory trims to 10 entries when 11th is pushed", () => {
  const s = fakeStore();
  for (let i = 1; i <= 11; i++) {
    Storage.recordMatchHistory(s, {
      id: i, date: "2026-05-17T00:00:00.000Z", mode: "quick",
      hero0Id: "moses", hero1Id: "david", winnerSlot: 0, turns: i,
      biggestHit: null, specialsUsed: [0, 0], triviaCorrect: 0, triviaTotal: 0, log: []
    });
  }
  const data = Storage.load(s);
  assert.strictEqual(data.recentMatches.length, 10, "should be capped at 10");
  assert.strictEqual(data.recentMatches[0].id, 11, "newest (id=11) should be first");
});

test("load accepts stored recentMatches and round-trips them", () => {
  const s = fakeStore();
  const entry = { id: 9999, date: "2026-05-17T10:00:00.000Z", mode: "endless",
    hero0Id: "golda", hero1Id: "einstein", winnerSlot: 0, turns: 5,
    biggestHit: { damage: 20, attackerName: "Golda", targetName: "Einstein", moveName: "Iron Will" },
    specialsUsed: [2, 1], triviaCorrect: 3, triviaTotal: 3, log: ["Golda attacks.", "Einstein defends."] };
  const data = Storage.load(s);
  data.recentMatches = [entry];
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.recentMatches.length, 1);
  assert.strictEqual(reloaded.recentMatches[0].id, 9999);
  assert.strictEqual(reloaded.recentMatches[0].hero0Id, "golda");
  assert.strictEqual(reloaded.recentMatches[0].turns, 5);
});

test("load filters out malformed recentMatches entries", () => {
  const s = fakeStore();
  const good = { id: 1, date: "2026-05-17T00:00:00.000Z", mode: "quick",
    hero0Id: "moses", hero1Id: "david", winnerSlot: 0, turns: 7,
    biggestHit: null, specialsUsed: [0, 0], triviaCorrect: 0, triviaTotal: 0, log: [] };
  const missingHero = { id: 2, date: "2026-05-17T00:00:00.000Z", mode: "quick",
    hero1Id: "david", winnerSlot: 0, turns: 5,   // hero0Id missing
    biggestHit: null, specialsUsed: [0, 0], triviaCorrect: 0, triviaTotal: 0, log: [] };
  const badTurns = { id: 3, date: "2026-05-17T00:00:00.000Z", mode: "quick",
    hero0Id: "esther", hero1Id: "judah", winnerSlot: 1, turns: "seven",  // non-integer turns
    biggestHit: null, specialsUsed: [0, 0], triviaCorrect: 0, triviaTotal: 0, log: [] };
  const raw = JSON.stringify({ recentMatches: [good, missingHero, badTurns] });
  s.setItem("heritageHeroes.save", raw);
  const data = Storage.load(s);
  assert.strictEqual(data.recentMatches.length, 1, "only the valid entry should survive");
  assert.strictEqual(data.recentMatches[0].id, 1);
});

test("Storage.resetAll wipes save back to defaults", () => {
  const s = fakeStore();
  // First, accumulate some non-default state
  const data = Storage.load(s);
  data.sound = true;
  data.animSpeed = "fast";
  data.stats.matchesPlayed = 42;
  data.achievements.firstWin = Date.now();
  Storage.save(s, data);

  // Confirm it was saved
  const before = Storage.load(s);
  assert.strictEqual(before.sound, true);
  assert.strictEqual(before.animSpeed, "fast");
  assert.strictEqual(before.stats.matchesPlayed, 42);
  assert.ok(before.achievements.firstWin > 0, "firstWin should be a positive timestamp before reset");

  // Reset
  Storage.resetAll(s);

  // Confirm everything is back to defaults
  const after = Storage.load(s);
  assert.strictEqual(after.sound, false);
  assert.strictEqual(after.animSpeed, "normal");
  assert.strictEqual(after.stats.matchesPlayed, 0);
  assert.strictEqual(after.achievements.firstWin, false);
});

// ── Daily Challenge ───────────────────────────────────────────────────────

test("daily defaults to empty completedDates and all-zero counters", () => {
  const data = Storage.load(fakeStore());
  assert.ok(data.daily, "daily key should exist");
  assert.ok(Array.isArray(data.daily.completedDates), "completedDates should be an array");
  assert.strictEqual(data.daily.completedDates.length, 0);
  assert.strictEqual(data.daily.currentStreak, 0);
  assert.strictEqual(data.daily.bestStreak, 0);
  assert.strictEqual(data.daily.lifetimeCompletions, 0);
});

test("recordDailyCompletion pushes date and increments lifetimeCompletions", () => {
  const s = fakeStore();
  Storage.recordDailyCompletion(s, "2026-05-17");
  const data = Storage.load(s);
  assert.ok(data.daily.completedDates.includes("2026-05-17"));
  assert.strictEqual(data.daily.lifetimeCompletions, 1);
  assert.strictEqual(data.daily.currentStreak, 1);
});

test("recordDailyCompletion is idempotent — calling twice with same date doesn't double-count", () => {
  const s = fakeStore();
  Storage.recordDailyCompletion(s, "2026-05-17");
  Storage.recordDailyCompletion(s, "2026-05-17");
  const data = Storage.load(s);
  assert.strictEqual(data.daily.completedDates.length, 1);
  assert.strictEqual(data.daily.lifetimeCompletions, 1);
  assert.strictEqual(data.daily.currentStreak, 1);
});

test("streak calculation: 3 consecutive days yields streak of 3", () => {
  const s = fakeStore();
  Storage.recordDailyCompletion(s, "2026-05-15");
  Storage.recordDailyCompletion(s, "2026-05-16");
  const result = Storage.recordDailyCompletion(s, "2026-05-17");
  assert.strictEqual(result.daily.currentStreak, 3);
});

test("streak calculation: gap in dates breaks the streak", () => {
  const s = fakeStore();
  Storage.recordDailyCompletion(s, "2026-05-15");
  // 2026-05-16 is missing
  const result = Storage.recordDailyCompletion(s, "2026-05-17");
  // Streak ending 2026-05-17 is 1 (because 2026-05-16 is missing)
  assert.strictEqual(result.daily.currentStreak, 1);
});

test("bestStreak updates when surpassed, persists if current streak is shorter", () => {
  const s = fakeStore();
  // Build a 3-day streak
  Storage.recordDailyCompletion(s, "2026-05-14");
  Storage.recordDailyCompletion(s, "2026-05-15");
  Storage.recordDailyCompletion(s, "2026-05-16");
  let data = Storage.load(s);
  assert.strictEqual(data.daily.bestStreak, 3);

  // Now record a single isolated day (no streak)
  Storage.recordDailyCompletion(s, "2026-05-18"); // gap on 17th
  data = Storage.load(s);
  assert.strictEqual(data.daily.currentStreak, 1);
  assert.strictEqual(data.daily.bestStreak, 3, "bestStreak should still be 3");
});

test("dailyStats returns currentStreak computed against today and completedToday flag", () => {
  const s = fakeStore();
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${day}`;

  // Build yesterday's date string
  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 2); // 2 days ago (so yesterday is missing)
  const yy = yesterday.getFullYear();
  const ym = String(yesterday.getMonth() + 1).padStart(2, "0");
  const yd = String(yesterday.getDate()).padStart(2, "0");
  const twoDaysAgo = `${yy}-${ym}-${yd}`;

  // Record two days ago and today (yesterday missing)
  Storage.recordDailyCompletion(s, twoDaysAgo);
  Storage.recordDailyCompletion(s, today);

  const stats = Storage.dailyStats(s);
  assert.strictEqual(stats.completedToday, true);
  // Current streak is 1 because yesterday is missing
  assert.strictEqual(stats.currentStreak, 1);
  assert.strictEqual(stats.lifetimeCompletions, 2);
});

// ── music / sfx defaults and backward compat ──────────────────────────────

test("music and sfx default to true", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.music, true, "music should default to true");
  assert.strictEqual(data.sfx,   true, "sfx should default to true");
});

test("backward compat: old save with sound:false migrates both music and sfx to false", () => {
  const s = fakeStore();
  // Simulate a save that only has the old `sound` key (no music/sfx)
  s.setItem("heritageHeroes.save", JSON.stringify({ sound: false }));
  const data = Storage.load(s);
  assert.strictEqual(data.music, false, "music should be false (migrated from sound:false)");
  assert.strictEqual(data.sfx,   false, "sfx should be false (migrated from sound:false)");
});

test("backward compat: old save with sound:true migrates both music and sfx to true", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", JSON.stringify({ sound: true }));
  const data = Storage.load(s);
  assert.strictEqual(data.music, true, "music should be true (migrated from sound:true)");
  assert.strictEqual(data.sfx,   true, "sfx should be true (migrated from sound:true)");
});

// ── Tournament ────────────────────────────────────────────────────────────

test("tournamentsWon defaults to 0", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.tournamentsWon, 0);
});

test("recordTournamentWin increments by 1 and persists", () => {
  const s = fakeStore();
  Storage.recordTournamentWin(s);
  const data = Storage.load(s);
  assert.strictEqual(data.tournamentsWon, 1);

  Storage.recordTournamentWin(s);
  const data2 = Storage.load(s);
  assert.strictEqual(data2.tournamentsWon, 2);
});

test("tournament achievements default false and round-trip", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  assert.strictEqual(data.achievements.tournamentWinner, false);
  assert.strictEqual(data.achievements.tournamentMaster, false);
  assert.strictEqual(data.achievements.tournamentLegend, false);

  const now = Date.now();
  data.achievements.tournamentWinner = now;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.achievements.tournamentWinner, now);
  assert.strictEqual(reloaded.achievements.tournamentMaster, false);
  assert.strictEqual(reloaded.achievements.tournamentLegend, false);
});

test("music and sfx round-trip independently via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.music = false;
  data.sfx   = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.music, false, "music=false should round-trip");
  assert.strictEqual(reloaded.sfx,   true,  "sfx=true should round-trip");

  // flip them
  reloaded.music = true;
  reloaded.sfx   = false;
  Storage.save(s, reloaded);
  const reloaded2 = Storage.load(s);
  assert.strictEqual(reloaded2.music, true,  "music=true should round-trip");
  assert.strictEqual(reloaded2.sfx,   false, "sfx=false should round-trip");
});

// ── Volume sliders (master / music / sfx) ─────────────────────────────────

test("masterVolume / musicVolume / sfxVolume default to 100", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.masterVolume, 100, "masterVolume should default to 100");
  assert.strictEqual(data.musicVolume,  100, "musicVolume should default to 100");
  assert.strictEqual(data.sfxVolume,    100, "sfxVolume should default to 100");
});

test("load accepts integer 0-100 for each volume", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", JSON.stringify({
    masterVolume: 0,
    musicVolume: 50,
    sfxVolume: 100
  }));
  const data = Storage.load(s);
  assert.strictEqual(data.masterVolume, 0,   "0 should be accepted as a min boundary");
  assert.strictEqual(data.musicVolume,  50,  "50 should be accepted mid-range");
  assert.strictEqual(data.sfxVolume,    100, "100 should be accepted as a max boundary");
});

test("load rejects out-of-range or non-integer volumes -> defaults to 100", () => {
  const badValues = [-1, 101, 50.5, "100", null, undefined, NaN, Infinity, true, [], {}];
  for (const v of badValues) {
    const s = fakeStore();
    s.setItem("heritageHeroes.save", JSON.stringify({
      masterVolume: v, musicVolume: v, sfxVolume: v
    }));
    const data = Storage.load(s);
    assert.strictEqual(data.masterVolume, 100, `masterVolume should default to 100 when input is ${JSON.stringify(v)}`);
    assert.strictEqual(data.musicVolume,  100, `musicVolume should default to 100 when input is ${JSON.stringify(v)}`);
    assert.strictEqual(data.sfxVolume,    100, `sfxVolume should default to 100 when input is ${JSON.stringify(v)}`);
  }
});

test("volumes round-trip independently via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.masterVolume = 75;
  data.musicVolume  = 20;
  data.sfxVolume    = 0;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.masterVolume, 75);
  assert.strictEqual(reloaded.musicVolume,  20);
  assert.strictEqual(reloaded.sfxVolume,    0);

  // change again
  reloaded.masterVolume = 100;
  reloaded.musicVolume  = 100;
  reloaded.sfxVolume    = 60;
  Storage.save(s, reloaded);
  const reloaded2 = Storage.load(s);
  assert.strictEqual(reloaded2.masterVolume, 100);
  assert.strictEqual(reloaded2.musicVolume,  100);
  assert.strictEqual(reloaded2.sfxVolume,    60);
});

// ── Hero Matchup Tracking ─────────────────────────────────────────────────

test("matchups defaults to empty object", () => {
  const data = Storage.load(fakeStore());
  assert.ok(data.matchups !== null && typeof data.matchups === "object" && !Array.isArray(data.matchups),
    "matchups should be an object");
  assert.strictEqual(Object.keys(data.matchups).length, 0, "matchups should start empty");
});

test("recordMatchup initializes a missing key and increments wins on a win", () => {
  const s = fakeStore();
  Storage.recordMatchup(s, "moses", "einstein", true);
  const data = Storage.load(s);
  assert.ok(data.matchups["moses|einstein"], "moses|einstein key should exist");
  assert.strictEqual(data.matchups["moses|einstein"].wins,   1);
  assert.strictEqual(data.matchups["moses|einstein"].losses, 0);
});

test("recordMatchup increments losses for a loss", () => {
  const s = fakeStore();
  Storage.recordMatchup(s, "david", "esther", false);
  const data = Storage.load(s);
  assert.strictEqual(data.matchups["david|esther"].wins,   0);
  assert.strictEqual(data.matchups["david|esther"].losses, 1);
});

test("matchup keys are directional: moses|einstein and einstein|moses are separate counters", () => {
  const s = fakeStore();
  Storage.recordMatchup(s, "moses", "einstein", true);   // moses played, won
  Storage.recordMatchup(s, "einstein", "moses", false);  // einstein played, lost
  const data = Storage.load(s);
  // moses|einstein: 1 win, 0 losses
  assert.strictEqual(data.matchups["moses|einstein"].wins,   1);
  assert.strictEqual(data.matchups["moses|einstein"].losses, 0);
  // einstein|moses: 0 wins, 1 loss
  assert.strictEqual(data.matchups["einstein|moses"].wins,   0);
  assert.strictEqual(data.matchups["einstein|moses"].losses, 1);
});

// ── Achievement timestamp format ───────────────────────────────────────────

test("unlockAchievement stores a timestamp (integer > 0) rather than true", () => {
  const s = fakeStore();
  const before = Date.now();
  Storage.unlockAchievement(s, "firstWin");
  const after = Date.now();
  const data = Storage.load(s);
  const val = data.achievements.firstWin;
  assert.ok(typeof val === "number" && val > 0, "achievements.firstWin should be a positive integer timestamp");
  assert.ok(val >= before && val <= after, "timestamp should be within the test window");
});

test("load migrates legacy achievements true -> 1 (truthy without precise timestamp)", () => {
  const s = fakeStore();
  // Simulate an old-format save where achievements are stored as booleans
  s.setItem("heritageHeroes.save", JSON.stringify({
    achievements: { firstWin: true, centurion: false }
  }));
  const data = Storage.load(s);
  assert.strictEqual(data.achievements.firstWin, 1, "legacy true should migrate to integer 1");
  assert.strictEqual(data.achievements.centurion, false, "false should stay false");
});

test("matchups round-trip via save/load and malformed entries are filtered out", () => {
  const s = fakeStore();
  // Manually craft a save with one valid and two invalid matchup entries
  const raw = JSON.stringify({
    matchups: {
      "moses|david":    { wins: 3, losses: 1 },   // valid
      "BAD|KEY":        { wins: 1, losses: 0 },   // uppercase — invalid key
      "esther|judah":   { wins: "two", losses: 0 } // non-integer wins — invalid value
    }
  });
  s.setItem("heritageHeroes.save", raw);
  const data = Storage.load(s);
  // Only the valid entry survives
  assert.ok(data.matchups["moses|david"], "valid entry should survive");
  assert.strictEqual(data.matchups["moses|david"].wins,   3);
  assert.strictEqual(data.matchups["moses|david"].losses, 1);
  assert.strictEqual(data.matchups["BAD|KEY"],     undefined, "uppercase key should be filtered");
  assert.strictEqual(data.matchups["esther|judah"], undefined, "non-integer wins should be filtered");
});

// ── dailyCalendar ─────────────────────────────────────────────────────────

test("dailyCalendar returns daysBack + 1 entries (today + N days back)", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, 35, "2026-05-17");
  assert.strictEqual(result.length, 36, "should be daysBack (35) + 1 (today) = 36 entries");
});

test("dailyCalendar default daysBack is 35 (returns 36 entries)", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, undefined, "2026-05-17");
  assert.strictEqual(result.length, 36);
});

test("dailyCalendar entries are oldest first, last entry is today with isToday:true", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, 6, "2026-05-17");
  // 7 entries: 2026-05-11 ... 2026-05-17
  assert.strictEqual(result.length, 7);
  assert.strictEqual(result[0].iso, "2026-05-11", "first entry should be 6 days before today");
  assert.strictEqual(result[6].iso, "2026-05-17", "last entry should be today");
  assert.strictEqual(result[6].isToday, true);
  assert.strictEqual(result[0].isToday, false);
});

test("dailyCalendar marks completed dates correctly", () => {
  const save = Storage.defaults();
  save.daily.completedDates = ["2026-05-14", "2026-05-16", "2026-05-17"];
  const result = Storage.dailyCalendar(save, 6, "2026-05-17");
  const byIso = {};
  for (const e of result) byIso[e.iso] = e;
  assert.strictEqual(byIso["2026-05-14"].completed, true);
  assert.strictEqual(byIso["2026-05-16"].completed, true);
  assert.strictEqual(byIso["2026-05-17"].completed, true);
  assert.strictEqual(byIso["2026-05-15"].completed, false);
  assert.strictEqual(byIso["2026-05-13"].completed, false);
  assert.strictEqual(byIso["2026-05-12"].completed, false);
  assert.strictEqual(byIso["2026-05-11"].completed, false);
});

test("dailyCalendar handles empty completedDates (no entries completed)", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, 6, "2026-05-17");
  for (const entry of result) {
    assert.strictEqual(entry.completed, false, `${entry.iso} should be uncompleted`);
  }
});

test("dailyCalendar handles a save with no daily field (no crash, all uncompleted)", () => {
  const save = {};  // intentionally missing daily
  const result = Storage.dailyCalendar(save, 6, "2026-05-17");
  assert.strictEqual(result.length, 7, "should still return 7 entries");
  for (const entry of result) {
    assert.strictEqual(entry.completed, false);
  }
  assert.strictEqual(result[6].isToday, true);
});

test("dailyCalendar entries include dayOfMonth, monthShort, weekday fields", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, 0, "2026-05-17");
  assert.strictEqual(result.length, 1);
  const today = result[0];
  assert.strictEqual(today.iso, "2026-05-17");
  assert.strictEqual(today.dayOfMonth, 17);
  assert.strictEqual(typeof today.monthShort, "string");
  assert.ok(today.monthShort.length >= 3, "monthShort should be a short label like 'May'");
  assert.strictEqual(typeof today.weekday, "string");
  assert.ok(today.weekday.length >= 3, "weekday should be a short label like 'Sun'");
});

test("dailyCalendar marks no entry as future when todayIso is the last entry", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, 6, "2026-05-17");
  for (const entry of result) {
    assert.strictEqual(entry.isFuture, false, `${entry.iso} should not be future`);
  }
});

test("dailyCalendar filters out malformed completedDates entries", () => {
  const save = Storage.defaults();
  save.daily.completedDates = ["2026-05-14", "bogus-date", 12345, null, "2026-05-17"];
  const result = Storage.dailyCalendar(save, 6, "2026-05-17");
  const byIso = {};
  for (const e of result) byIso[e.iso] = e;
  assert.strictEqual(byIso["2026-05-14"].completed, true);
  assert.strictEqual(byIso["2026-05-17"].completed, true);
  // malformed entries don't add phantom completed days
  assert.strictEqual(byIso["2026-05-15"].completed, false);
});

test("dailyCalendar when todayIso is omitted derives today from new Date()", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, 6);
  assert.strictEqual(result.length, 7);
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  const todayIso = `${y}-${m}-${dy}`;
  assert.strictEqual(result[6].iso, todayIso);
  assert.strictEqual(result[6].isToday, true);
});

test("dailyCalendar with daysBack=0 returns just today", () => {
  const save = Storage.defaults();
  const result = Storage.dailyCalendar(save, 0, "2026-05-17");
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].iso, "2026-05-17");
  assert.strictEqual(result[0].isToday, true);
});

test("dailyCalendar handles month boundaries correctly", () => {
  const save = Storage.defaults();
  save.daily.completedDates = ["2026-04-30", "2026-05-01"];
  const result = Storage.dailyCalendar(save, 3, "2026-05-02");
  // entries: 2026-04-29, 2026-04-30, 2026-05-01, 2026-05-02
  assert.strictEqual(result.length, 4);
  assert.strictEqual(result[0].iso, "2026-04-29");
  assert.strictEqual(result[1].iso, "2026-04-30");
  assert.strictEqual(result[2].iso, "2026-05-01");
  assert.strictEqual(result[3].iso, "2026-05-02");
  assert.strictEqual(result[1].completed, true);
  assert.strictEqual(result[2].completed, true);
  assert.strictEqual(result[0].completed, false);
  assert.strictEqual(result[3].completed, false);
});

// ── Heritage Quiz ─────────────────────────────────────────────────────────

test("quizBestStreak defaults to 0", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.quizBestStreak, 0);
});

test("quizBestStreak round-trips via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.quizBestStreak = 17;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.quizBestStreak, 17);
});

test("load migrates a missing quizBestStreak gracefully (defaults to 0)", () => {
  const s = fakeStore();
  // Save without quizBestStreak
  s.setItem("heritageHeroes.save", JSON.stringify({ sound: true }));
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 0);
});

test("load handles malformed quizBestStreak (string) -> defaults to 0", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", JSON.stringify({ quizBestStreak: "lots" }));
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 0);
});

test("load handles malformed quizBestStreak (null) -> defaults to 0", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", JSON.stringify({ quizBestStreak: null }));
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 0);
});

test("load handles malformed quizBestStreak (negative) -> defaults to 0", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", JSON.stringify({ quizBestStreak: -5 }));
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 0);
});

test("recordQuizRun first call sets score and returns isNewBest=true, previousBest=0", () => {
  const s = fakeStore();
  const result = Storage.recordQuizRun(s, 7);
  assert.strictEqual(result.isNewBest, true);
  assert.strictEqual(result.previousBest, 0);
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 7);
});

test("recordQuizRun second call with higher streak overwrites and returns isNewBest=true", () => {
  const s = fakeStore();
  Storage.recordQuizRun(s, 5);
  const result = Storage.recordQuizRun(s, 12);
  assert.strictEqual(result.isNewBest, true);
  assert.strictEqual(result.previousBest, 5);
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 12);
});

test("recordQuizRun third call with lower streak does not change score, returns isNewBest=false", () => {
  const s = fakeStore();
  Storage.recordQuizRun(s, 10);
  const result = Storage.recordQuizRun(s, 3);
  assert.strictEqual(result.isNewBest, false);
  assert.strictEqual(result.previousBest, 10);
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 10);
});

test("recordQuizRun with equal streak does not change score, returns isNewBest=false", () => {
  const s = fakeStore();
  Storage.recordQuizRun(s, 8);
  const result = Storage.recordQuizRun(s, 8);
  assert.strictEqual(result.isNewBest, false);
  assert.strictEqual(result.previousBest, 8);
  const data = Storage.load(s);
  assert.strictEqual(data.quizBestStreak, 8);
});

test("recordQuizRun result round-trips via save/load", () => {
  const s = fakeStore();
  Storage.recordQuizRun(s, 14);
  // Simulate a reload from another browser session — load and re-save.
  const data = Storage.load(s);
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.quizBestStreak, 14);
});

// ── Quiz achievements ─────────────────────────────────────────────────────
test("quiz achievements default to false", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.achievements.quizStreak5,  false);
  assert.strictEqual(data.achievements.quizStreak10, false);
  assert.strictEqual(data.achievements.quizStreak20, false);
});

test("quiz achievements round-trip via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  const now = Date.now();
  data.achievements.quizStreak5  = now;
  data.achievements.quizStreak10 = now;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.achievements.quizStreak5,  now);
  assert.strictEqual(reloaded.achievements.quizStreak10, now);
  assert.strictEqual(reloaded.achievements.quizStreak20, false);
});

test("unlockAchievement sets quizStreak5 and leaves others unchanged", () => {
  const s = fakeStore();
  Storage.unlockAchievement(s, "quizStreak5");
  const data = Storage.load(s);
  assert.ok(data.achievements.quizStreak5 > 0, "quizStreak5 should be a positive timestamp");
  assert.strictEqual(data.achievements.quizStreak10, false);
  assert.strictEqual(data.achievements.quizStreak20, false);
  assert.strictEqual(data.achievements.firstWin,     false);
});

// ── lastSeenVersion / setLastSeenVersion ─────────────────────────────────

test("lastSeenVersion defaults to 0", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.lastSeenVersion, 0);
});

test("defaults() exposes lastSeenVersion=0", () => {
  const d = Storage.defaults();
  assert.strictEqual(d.lastSeenVersion, 0);
});

test("setLastSeenVersion writes the value and persists across reload", () => {
  const s = fakeStore();
  Storage.setLastSeenVersion(s, 3);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.lastSeenVersion, 3);
});

test("setLastSeenVersion can be called repeatedly (idempotent for same value)", () => {
  const s = fakeStore();
  Storage.setLastSeenVersion(s, 2);
  Storage.setLastSeenVersion(s, 2);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.lastSeenVersion, 2);
});

test("setLastSeenVersion preserves other save fields", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.arcade.moses = 5;
  data.quizBestStreak = 9;
  Storage.save(s, data);
  Storage.setLastSeenVersion(s, 4);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.lastSeenVersion, 4);
  assert.strictEqual(reloaded.arcade.moses, 5);
  assert.strictEqual(reloaded.quizBestStreak, 9);
});

test("load handles missing lastSeenVersion gracefully (defaults to 0)", () => {
  const s = fakeStore();
  // Persist a save object missing lastSeenVersion entirely
  const partial = Storage.defaults();
  delete partial.lastSeenVersion;
  s.setItem("heritageHeroes.save", JSON.stringify(partial));
  const data = Storage.load(s);
  assert.strictEqual(data.lastSeenVersion, 0);
});

test("load rejects malformed lastSeenVersion (string) -> defaults to 0", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.lastSeenVersion = "5";
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.strictEqual(data.lastSeenVersion, 0);
});

test("load rejects malformed lastSeenVersion (null) -> defaults to 0", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.lastSeenVersion = null;
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.strictEqual(data.lastSeenVersion, 0);
});

test("load rejects malformed lastSeenVersion (-1) -> defaults to 0", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.lastSeenVersion = -1;
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.strictEqual(data.lastSeenVersion, 0);
});

test("load rejects malformed lastSeenVersion (float 2.5) -> defaults to 0", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.lastSeenVersion = 2.5;
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.strictEqual(data.lastSeenVersion, 0);
});

// ── lastSession (Continue Last Mode) ──────────────────────────────────────

test("lastSession defaults to null", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.lastSession, null);
});

test("recordLastSession with valid mode + hero persists across reload", () => {
  const s = fakeStore();
  Storage.recordLastSession(s, "arcade", "moses");
  const data = Storage.load(s);
  assert.ok(data.lastSession);
  assert.strictEqual(data.lastSession.mode, "arcade");
  assert.strictEqual(data.lastSession.playerHeroId, "moses");
  assert.ok(Number.isInteger(data.lastSession.timestamp));
  assert.ok(data.lastSession.timestamp > 0);
});

test("recordLastSession supports all four valid modes", () => {
  for (const mode of ["quick", "arcade", "endless", "study"]) {
    const s = fakeStore();
    Storage.recordLastSession(s, mode, "david");
    const data = Storage.load(s);
    assert.ok(data.lastSession, `mode ${mode} should produce a lastSession`);
    assert.strictEqual(data.lastSession.mode, mode);
    assert.strictEqual(data.lastSession.playerHeroId, "david");
  }
});

test("recordLastSession with unsupported mode is a silent no-op", () => {
  const s = fakeStore();
  // Seed a valid session first so we can tell the bad call didn't overwrite.
  Storage.recordLastSession(s, "quick", "moses");
  const before = Storage.load(s).lastSession;
  for (const bad of ["tournament", "spectator", "daily", "quiz", "", "nonsense", null, undefined]) {
    Storage.recordLastSession(s, bad, "moses");
    const after = Storage.load(s).lastSession;
    assert.deepStrictEqual(after, before, `mode ${String(bad)} should not change lastSession`);
  }
});

test("recordLastSession with invalid hero id is a silent no-op", () => {
  const s = fakeStore();
  Storage.recordLastSession(s, "quick", "moses");
  const before = Storage.load(s).lastSession;
  for (const bad of ["nobody", "", null, undefined, 42]) {
    Storage.recordLastSession(s, "quick", bad);
    const after = Storage.load(s).lastSession;
    assert.deepStrictEqual(after, before, `hero ${String(bad)} should not change lastSession`);
  }
});

test("load rejects lastSession with invalid mode", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.lastSession = { mode: "tournament", playerHeroId: "moses", timestamp: Date.now() };
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.strictEqual(data.lastSession, null);
});

test("load rejects lastSession with invalid hero id", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.lastSession = { mode: "quick", playerHeroId: "nobody", timestamp: Date.now() };
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.strictEqual(data.lastSession, null);
});

test("load rejects lastSession missing required fields", () => {
  const cases = [
    { mode: "quick" },                                     // no hero, no timestamp
    { mode: "quick", playerHeroId: "moses" },              // no timestamp
    { playerHeroId: "moses", timestamp: Date.now() },      // no mode
    { mode: "quick", timestamp: Date.now() }               // no hero
  ];
  for (const ls of cases) {
    const s = fakeStore();
    const corrupt = Storage.defaults();
    corrupt.lastSession = ls;
    s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
    const data = Storage.load(s);
    assert.strictEqual(data.lastSession, null, `should reject ${JSON.stringify(ls)}`);
  }
});

test("load rejects lastSession with wrong field types", () => {
  const cases = [
    { mode: 42,       playerHeroId: "moses", timestamp: Date.now() },  // mode not string
    { mode: "quick",  playerHeroId: 7,       timestamp: Date.now() },  // hero not string
    { mode: "quick",  playerHeroId: "moses", timestamp: "today" },     // timestamp not int
    { mode: "quick",  playerHeroId: "moses", timestamp: 0 },           // timestamp zero
    { mode: "quick",  playerHeroId: "moses", timestamp: -1 },          // timestamp negative
    { mode: "quick",  playerHeroId: "moses", timestamp: 1.5 }          // timestamp float
  ];
  for (const ls of cases) {
    const s = fakeStore();
    const corrupt = Storage.defaults();
    corrupt.lastSession = ls;
    s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
    const data = Storage.load(s);
    assert.strictEqual(data.lastSession, null, `should reject ${JSON.stringify(ls)}`);
  }
});

test("load rejects lastSession when it's not an object", () => {
  for (const bad of ["string", 42, true, [1, 2, 3]]) {
    const s = fakeStore();
    const corrupt = Storage.defaults();
    corrupt.lastSession = bad;
    s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
    const data = Storage.load(s);
    assert.strictEqual(data.lastSession, null, `should reject ${JSON.stringify(bad)}`);
  }
});

test("load round-trips a valid lastSession", () => {
  const s = fakeStore();
  const ts = 1700000000000;
  const seed = Storage.defaults();
  seed.lastSession = { mode: "endless", playerHeroId: "esther", timestamp: ts };
  s.setItem("heritageHeroes.save", JSON.stringify(seed));
  const data = Storage.load(s);
  assert.deepStrictEqual(data.lastSession, { mode: "endless", playerHeroId: "esther", timestamp: ts });
});

test("recordLastSession overwrites the previous session", () => {
  const s = fakeStore();
  Storage.recordLastSession(s, "quick", "moses");
  const firstTs = Storage.load(s).lastSession.timestamp;
  Storage.recordLastSession(s, "endless", "david");
  const data = Storage.load(s);
  assert.strictEqual(data.lastSession.mode, "endless");
  assert.strictEqual(data.lastSession.playerHeroId, "david");
  // The new timestamp must be >= the first (Date.now is monotonic-ish).
  assert.ok(data.lastSession.timestamp >= firstTs);
});

// ── Daily Quests ──────────────────────────────────────────────────────────

test("dailyQuests defaults to the expected shape", () => {
  const data = Storage.defaults();
  assert.ok(data.dailyQuests, "dailyQuests should exist");
  assert.strictEqual(data.dailyQuests.date, null);
  assert.deepStrictEqual(data.dailyQuests.quests, []);
  assert.strictEqual(data.dailyQuests.completedAll, false);
  assert.deepStrictEqual(data.dailyQuests.completedDates, []);
  assert.strictEqual(data.dailyQuests.currentStreak, 0);
  assert.strictEqual(data.dailyQuests.bestStreak, 0);
  assert.strictEqual(data.dailyQuests.lifetimeCompleted, 0);
});

test("generateDailyQuests is deterministic for the same date", () => {
  const a = Storage.generateDailyQuests("2026-05-17");
  const b = Storage.generateDailyQuests("2026-05-17");
  assert.deepStrictEqual(a, b);
});

test("generateDailyQuests returns different quests for different dates", () => {
  // Across a sample of 30 consecutive days, at least 5 unique
  // (type1,type2) tuples should appear — proves the seed actually varies.
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.UTC(2026, 0, 1));
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const quests = Storage.generateDailyQuests(iso);
    const key = quests.map(function (q) { return q.type; }).sort().join("|");
    seen.add(key);
  }
  assert.ok(seen.size >= 5, "expected at least 5 distinct quest-type pairings across 30 days, got " + seen.size);
});

test("generateDailyQuests always returns exactly 2 quests with valid types", () => {
  const validTypes = new Set(["winMatches", "winAsHero", "triviaCorrect", "quickFinish", "tryMode"]);
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.UTC(2026, 0, 1));
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const quests = Storage.generateDailyQuests(iso);
    assert.strictEqual(quests.length, 2, "day " + iso + " did not produce 2 quests");
    for (const q of quests) {
      assert.ok(validTypes.has(q.type), "invalid type " + q.type);
      assert.ok(Number.isInteger(q.target) && q.target >= 1);
      assert.strictEqual(q.progress, 0);
      assert.strictEqual(q.completed, false);
      assert.ok(typeof q.label === "string" && q.label.length > 0);
      assert.ok(typeof q.id === "string" && q.id.length > 0);
    }
    // No duplicate types per day.
    assert.notStrictEqual(quests[0].type, quests[1].type, "duplicate quest types on " + iso);
  }
});

test("generateDailyQuests rejects malformed date input", () => {
  assert.deepStrictEqual(Storage.generateDailyQuests("bad"), []);
  assert.deepStrictEqual(Storage.generateDailyQuests(null), []);
  assert.deepStrictEqual(Storage.generateDailyQuests(undefined), []);
});

// Helper: seed the store with a known set of quests so we can exercise
// recordQuestProgress deterministically (independent of which random quests
// the date happens to roll).
function seedQuests(store, dateIso, quests) {
  const data = Storage.load(store);
  data.dailyQuests.date = dateIso;
  data.dailyQuests.quests = quests;
  data.dailyQuests.completedAll = false;
  Storage.save(store, data);
}

test("recordQuestProgress matchEnd increments winMatches quest progress", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "winMatches", target: 2, progress: 0, completed: false, label: "Win 2 matches today" }
  ]);
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 15, mode: "quick" });
  let data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 1);
  assert.strictEqual(data.dailyQuests.quests[0].completed, false);
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "david", turnsTaken: 8, mode: "endless" });
  data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 2);
  assert.strictEqual(data.dailyQuests.quests[0].completed, true);
});

test("recordQuestProgress matchEnd does NOT count losses for winMatches", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false, label: "Win 1 match today" }
  ]);
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: false, heroId: "moses", turnsTaken: 12, mode: "quick" });
  const data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 0);
});

test("recordQuestProgress matchEnd with matching hero increments winAsHero", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "winAsHero", target: 1, progress: 0, completed: false, heroId: "esther", label: "Win as Esther" }
  ]);
  // Wrong hero — no progress.
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 9, mode: "quick" });
  let data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 0);
  // Correct hero, win — completes.
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "esther", turnsTaken: 14, mode: "quick" });
  data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 1);
  assert.strictEqual(data.dailyQuests.quests[0].completed, true);
});

test("recordQuestProgress matchEnd with too many turns does NOT count for quickFinish", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "quickFinish", target: 1, progress: 0, completed: false, turnsMax: 10, label: "Win in 10 turns or fewer" }
  ]);
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 15, mode: "quick" });
  let data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 0, "15 turns should not count");
  // Boundary: exactly 10 turns counts.
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 10, mode: "quick" });
  data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 1);
  assert.strictEqual(data.dailyQuests.quests[0].completed, true);
});

test("recordQuestProgress triviaAnswer wasCorrect increments triviaCorrect", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "triviaCorrect", target: 3, progress: 0, completed: false, label: "Answer 3 correctly" }
  ]);
  Storage.recordQuestProgress(s, "triviaAnswer", { wasCorrect: true });
  Storage.recordQuestProgress(s, "triviaAnswer", { wasCorrect: false });  // wrong — no count
  Storage.recordQuestProgress(s, "triviaAnswer", { wasCorrect: true });
  let data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].progress, 2);
  Storage.recordQuestProgress(s, "triviaAnswer", { wasCorrect: true });
  data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests[0].completed, true);
});

test("recordQuestProgress modeStart counts tryMode and matchEnd in matching mode also counts", () => {
  // tryMode quests should accept either a modeStart event or a matchEnd
  // event whose mode matches.
  const s1 = fakeStore();
  seedQuests(s1, "2026-05-17", [
    { id: "q1", type: "tryMode", target: 1, progress: 0, completed: false, modeId: "endless", label: "Play Endless" }
  ]);
  Storage.recordQuestProgress(s1, "modeStart", { mode: "endless" });
  assert.strictEqual(Storage.load(s1).dailyQuests.quests[0].completed, true);

  const s2 = fakeStore();
  seedQuests(s2, "2026-05-17", [
    { id: "q1", type: "tryMode", target: 1, progress: 0, completed: false, modeId: "endless", label: "Play Endless" }
  ]);
  Storage.recordQuestProgress(s2, "matchEnd", { playerWon: false, heroId: "moses", turnsTaken: 5, mode: "endless" });
  assert.strictEqual(Storage.load(s2).dailyQuests.quests[0].completed, true);

  // Wrong mode does NOT count.
  const s3 = fakeStore();
  seedQuests(s3, "2026-05-17", [
    { id: "q1", type: "tryMode", target: 1, progress: 0, completed: false, modeId: "endless", label: "Play Endless" }
  ]);
  Storage.recordQuestProgress(s3, "modeStart", { mode: "quick" });
  assert.strictEqual(Storage.load(s3).dailyQuests.quests[0].completed, false);
});

test("recordQuestProgress fires allJustCompleted=true when all quests complete in one event", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false, label: "Win 1 match" },
    { id: "q2", type: "winAsHero", target: 1, progress: 0, completed: false, heroId: "moses", label: "Win as Moses" }
  ]);
  // First event: complete only winMatches — allJustCompleted should be false.
  // We use a non-Moses hero to avoid completing both at once.
  // Wait — winMatches counts every win, and winAsHero(moses) only counts Moses
  // wins. So a win-as-david completes winMatches only.
  let result = Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "david", turnsTaken: 7, mode: "quick" });
  assert.strictEqual(result.newlyCompleted.length, 1);
  assert.strictEqual(result.allJustCompleted, false);
  // Second event: a Moses win completes the winAsHero quest, finishing the set.
  result = Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 9, mode: "quick" });
  assert.strictEqual(result.newlyCompleted.length, 1);
  assert.strictEqual(result.allJustCompleted, true);
  const data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.completedAll, true);
  assert.deepStrictEqual(data.dailyQuests.completedDates, ["2026-05-17"]);
  assert.strictEqual(data.dailyQuests.currentStreak, 1);
  assert.strictEqual(data.dailyQuests.bestStreak, 1);
  assert.strictEqual(data.dailyQuests.lifetimeCompleted, 2);
});

test("recordQuestProgress is a no-op when no quests are seeded", () => {
  const s = fakeStore();
  const result = Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 5, mode: "quick" });
  assert.deepStrictEqual(result, { newlyCompleted: [], allJustCompleted: false });
});

test("recordQuestProgress does not double-count completed quests", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false, label: "Win 1 match" }
  ]);
  Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 5, mode: "quick" });
  const lifetimeAfterFirst = Storage.load(s).dailyQuests.lifetimeCompleted;
  // A second win shouldn't bump lifetimeCompleted again — quest is done.
  const result = Storage.recordQuestProgress(s, "matchEnd", { playerWon: true, heroId: "moses", turnsTaken: 4, mode: "quick" });
  assert.deepStrictEqual(result.newlyCompleted, []);
  assert.strictEqual(Storage.load(s).dailyQuests.lifetimeCompleted, lifetimeAfterFirst);
});

test("refreshDailyQuests generates quests on first call and is idempotent on same day", () => {
  const s = fakeStore();
  const dq1 = Storage.refreshDailyQuests(s, "2026-05-17");
  assert.strictEqual(dq1.date, "2026-05-17");
  assert.strictEqual(dq1.quests.length, 2);
  // Touch some progress so we can prove idempotency doesn't clobber.
  const d = Storage.load(s);
  d.dailyQuests.quests[0].progress = 1;
  Storage.save(s, d);
  const dq2 = Storage.refreshDailyQuests(s, "2026-05-17");
  assert.strictEqual(dq2.quests[0].progress, 1, "same-day refresh must not reset progress");
});

test("refreshDailyQuests rolls over from yesterday correctly (preserves streak)", () => {
  const s = fakeStore();
  // Simulate yesterday: completed the set.
  Storage.refreshDailyQuests(s, "2026-05-16");
  // Force-complete yesterday's set to simulate a real completion.
  let d = Storage.load(s);
  d.dailyQuests.completedDates = ["2026-05-16"];
  d.dailyQuests.completedAll = true;
  d.dailyQuests.currentStreak = 1;
  d.dailyQuests.bestStreak = 1;
  Storage.save(s, d);
  // Roll over to today.
  Storage.refreshDailyQuests(s, "2026-05-17");
  d = Storage.load(s);
  assert.strictEqual(d.dailyQuests.date, "2026-05-17");
  assert.strictEqual(d.dailyQuests.completedAll, false, "fresh day should reset completedAll");
  assert.strictEqual(d.dailyQuests.currentStreak, 1, "streak should persist when yesterday was completed");
  assert.strictEqual(d.dailyQuests.bestStreak, 1);
});

test("refreshDailyQuests resets streak when a day was missed", () => {
  const s = fakeStore();
  // Day 1: completed.
  Storage.refreshDailyQuests(s, "2026-05-14");
  let d = Storage.load(s);
  d.dailyQuests.completedDates = ["2026-05-14"];
  d.dailyQuests.completedAll = true;
  d.dailyQuests.currentStreak = 1;
  d.dailyQuests.bestStreak = 1;
  Storage.save(s, d);
  // Skip a day and open on 2026-05-16 (yesterday = 05-15, which is NOT in the list).
  Storage.refreshDailyQuests(s, "2026-05-16");
  d = Storage.load(s);
  assert.strictEqual(d.dailyQuests.currentStreak, 0, "missing yesterday must break streak");
  assert.strictEqual(d.dailyQuests.bestStreak, 1, "bestStreak should be preserved");
});

test("refreshDailyQuests with no store returns defaults without throwing", () => {
  assert.doesNotThrow(function () { Storage.refreshDailyQuests(null, "2026-05-17"); });
  const dq = Storage.refreshDailyQuests(null, "2026-05-17");
  assert.ok(dq);
  assert.strictEqual(dq.date, null);
});

test("load handles malformed dailyQuests gracefully (missing fields, wrong types)", () => {
  const cases = [
    { dailyQuests: "string" },
    { dailyQuests: 42 },
    { dailyQuests: null },
    { dailyQuests: [] },  // array — not an object map
    { dailyQuests: { date: "not-iso", quests: "not-array", completedAll: "yes" } }
  ];
  for (const seed of cases) {
    const s = fakeStore();
    const corrupt = Object.assign(Storage.defaults(), seed);
    s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
    const data = Storage.load(s);
    assert.ok(data.dailyQuests, "should always have dailyQuests after load");
    assert.deepStrictEqual(data.dailyQuests.quests, [], "malformed quests should drop to []");
    assert.strictEqual(data.dailyQuests.completedAll, false);
    assert.strictEqual(data.dailyQuests.currentStreak, 0);
    assert.strictEqual(data.dailyQuests.bestStreak, 0);
    assert.strictEqual(data.dailyQuests.lifetimeCompleted, 0);
  }
});

test("load drops individual malformed quest entries but keeps valid ones", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.dailyQuests = {
    date: "2026-05-17",
    quests: [
      { id: "q1", type: "winMatches", target: 2, progress: 1, completed: false, label: "ok" },  // valid
      { id: "q2", type: "garbage",    target: 1, progress: 0, completed: false },               // bad type
      { id: "q3", type: "winAsHero",  target: -1, progress: 0, completed: false },              // bad target
      { id: "q4", type: "triviaCorrect", target: 5, progress: 1, completed: false, label: "also ok" },  // valid
      { /* missing id, type, etc. */ }
    ],
    completedAll: false,
    completedDates: ["2026-05-15", "bogus", "2026-05-15"],  // dup + bad
    currentStreak: 1,
    bestStreak: 2,
    lifetimeCompleted: 4
  };
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.strictEqual(data.dailyQuests.quests.length, 2);
  assert.strictEqual(data.dailyQuests.quests[0].id, "q1");
  assert.strictEqual(data.dailyQuests.quests[1].id, "q4");
  assert.deepStrictEqual(data.dailyQuests.completedDates, ["2026-05-15"]);
  assert.strictEqual(data.dailyQuests.currentStreak, 1);
  assert.strictEqual(data.dailyQuests.bestStreak, 2);
  assert.strictEqual(data.dailyQuests.lifetimeCompleted, 4);
});

test("load caps quests at 3 entries", () => {
  const s = fakeStore();
  const corrupt = Storage.defaults();
  corrupt.dailyQuests = {
    date: "2026-05-17",
    quests: [
      { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false },
      { id: "q2", type: "winMatches", target: 1, progress: 0, completed: false },
      { id: "q3", type: "winMatches", target: 1, progress: 0, completed: false },
      { id: "q4", type: "winMatches", target: 1, progress: 0, completed: false },
      { id: "q5", type: "winMatches", target: 1, progress: 0, completed: false }
    ],
    completedAll: false,
    completedDates: [],
    currentStreak: 0,
    bestStreak: 0,
    lifetimeCompleted: 0
  };
  s.setItem("heritageHeroes.save", JSON.stringify(corrupt));
  const data = Storage.load(s);
  assert.ok(data.dailyQuests.quests.length <= 3);
});

test("3 new quest achievement keys default to false and round-trip", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  assert.strictEqual(data.achievements.questFirst, false);
  assert.strictEqual(data.achievements.questTriple, false);
  assert.strictEqual(data.achievements.questStreak7, false);
  // Round-trip via unlockAchievement.
  Storage.unlockAchievement(s, "questFirst");
  Storage.unlockAchievement(s, "questTriple");
  const reloaded = Storage.load(s);
  assert.ok(reloaded.achievements.questFirst, "questFirst should persist after unlock");
  assert.ok(reloaded.achievements.questTriple);
  assert.strictEqual(reloaded.achievements.questStreak7, false);
});

test("recordQuestProgress with no event handler stays safe (unknown eventType)", () => {
  const s = fakeStore();
  seedQuests(s, "2026-05-17", [
    { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false, label: "Win 1 match" }
  ]);
  // Unknown event type — should not crash and should not advance progress.
  const result = Storage.recordQuestProgress(s, "weirdEvent", { foo: "bar" });
  assert.deepStrictEqual(result.newlyCompleted, []);
  assert.strictEqual(Storage.load(s).dailyQuests.quests[0].progress, 0);
});

// ── strategyHints (battle hints toggle) ───────────────────────────────────
test("strategyHints defaults to 'on'", () => {
  const data = Storage.load(fakeStore());
  assert.strictEqual(data.strategyHints, "on");
});

test("strategyHints round-trips 'on' / 'off' via save/load", () => {
  const s = fakeStore();
  for (const value of ["on", "off"]) {
    const data = Storage.load(s);
    data.strategyHints = value;
    Storage.save(s, data);
    const reloaded = Storage.load(s);
    assert.strictEqual(reloaded.strategyHints, value, `${value} should round-trip`);
  }
});

test("strategyHints rejects malformed values and falls back to 'on'", () => {
  const malformed = ["true", "false", "", "ON", "yes", null, 0, 1, true, false, [], {}];
  for (const bad of malformed) {
    const s = fakeStore();
    s.setItem("heritageHeroes.save", JSON.stringify({ strategyHints: bad }));
    const reloaded = Storage.load(s);
    assert.strictEqual(reloaded.strategyHints, "on",
      `malformed strategyHints ${JSON.stringify(bad)} should default to "on"`);
  }
});

// ── playerName / setPlayerName ───────────────────────────────────────────
test("playerName defaults to empty string", () => {
  const data = Storage.defaults();
  assert.strictEqual(data.playerName, "");
  const loaded = Storage.load(fakeStore());
  assert.strictEqual(loaded.playerName, "");
});

test("setPlayerName persists a valid name", () => {
  const s = fakeStore();
  Storage.setPlayerName(s, "Grandpa");
  assert.strictEqual(Storage.load(s).playerName, "Grandpa");
});

test("setPlayerName trims surrounding whitespace", () => {
  const s = fakeStore();
  Storage.setPlayerName(s, "   Sarah   ");
  assert.strictEqual(Storage.load(s).playerName, "Sarah");
});

test("setPlayerName caps length at 24 characters", () => {
  const s = fakeStore();
  const longName = "A".repeat(50);
  Storage.setPlayerName(s, longName);
  const loaded = Storage.load(s);
  assert.strictEqual(loaded.playerName.length, 24);
  assert.strictEqual(loaded.playerName, "A".repeat(24));
});

test("setPlayerName strips ASCII control characters", () => {
  const s = fakeStore();
  // Mix in NUL, BEL, BACKSPACE, ESC, and DEL among normal letters.
  const dirty = "Hi\x00\x07\x08there\x1B\x7F";
  Storage.setPlayerName(s, dirty);
  assert.strictEqual(Storage.load(s).playerName, "Hithere");
});

test("setPlayerName accepts emoji up to the length cap", () => {
  const s = fakeStore();
  // Note: JS .length counts UTF-16 code units, so a single emoji is 2 units.
  Storage.setPlayerName(s, "Grandpa \u{1F60E}");  // smiling face with sunglasses
  const loaded = Storage.load(s);
  assert.strictEqual(loaded.playerName, "Grandpa \u{1F60E}");
  assert.ok(loaded.playerName.length <= 24);
});

test("setPlayerName ignores non-string arguments (no-op)", () => {
  const s = fakeStore();
  Storage.setPlayerName(s, "Original");
  for (const bad of [null, undefined, 123, true, [], {}]) {
    Storage.setPlayerName(s, bad);
  }
  assert.strictEqual(Storage.load(s).playerName, "Original");
});

test("load rejects malformed playerName values and falls back to empty string", () => {
  const malformed = [null, undefined, 0, 1, true, false, [], {}, 42];
  for (const bad of malformed) {
    const s = fakeStore();
    s.setItem("heritageHeroes.save", JSON.stringify({ playerName: bad }));
    const loaded = Storage.load(s);
    assert.strictEqual(loaded.playerName, "",
      `malformed playerName ${JSON.stringify(bad)} should default to ""`);
  }
});

test("load truncates overly-long playerName from a hand-edited save", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", JSON.stringify({ playerName: "X".repeat(200) }));
  const loaded = Storage.load(s);
  assert.strictEqual(loaded.playerName.length, 24);
  assert.strictEqual(loaded.playerName, "X".repeat(24));
});

test("load sanitizes playerName from a corrupt save (trim + strip controls)", () => {
  const s = fakeStore();
  s.setItem("heritageHeroes.save", JSON.stringify({ playerName: "  Bad\x00Name  " }));
  const loaded = Storage.load(s);
  assert.strictEqual(loaded.playerName, "BadName");
});

test("playerName round-trips via save/load", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.playerName = "Esther";
  Storage.save(s, data);
  assert.strictEqual(Storage.load(s).playerName, "Esther");
});

test("setPlayerName accepts an empty string (clearing the name)", () => {
  const s = fakeStore();
  Storage.setPlayerName(s, "Grandpa");
  Storage.setPlayerName(s, "");
  assert.strictEqual(Storage.load(s).playerName, "");
});

test("setPlayerName preserves other save fields", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.arcade.moses = 5;
  data.tutorialSeen = true;
  Storage.save(s, data);
  Storage.setPlayerName(s, "Sarah");
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.playerName, "Sarah");
  assert.strictEqual(reloaded.arcade.moses, 5);
  assert.strictEqual(reloaded.tutorialSeen, true);
});
