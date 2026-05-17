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
