// test/test-challenge.js
const test = require("node:test");
const assert = require("node:assert");
const Challenge = require("../src/challenge.js");

const ROSTER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

test("getDailyChallenge is deterministic for a given date", () => {
  assert.deepStrictEqual(
    Challenge.getDailyChallenge("2026-05-28"),
    Challenge.getDailyChallenge("2026-05-28")
  );
});

test("getDailyChallenge returns a valid, non-mirror matchup for any date", () => {
  for (const iso of ["2026-01-01", "2026-05-28", "2026-12-31", "2027-07-04", "2024-02-29"]) {
    const c = Challenge.getDailyChallenge(iso);
    assert.strictEqual(c.isoDate, iso);
    assert.ok(ROSTER.includes(c.playerHeroId), "player in roster: " + c.playerHeroId);
    assert.ok(ROSTER.includes(c.opponentHeroId), "opponent in roster: " + c.opponentHeroId);
    assert.notStrictEqual(c.playerHeroId, c.opponentHeroId, "no mirror match");
    assert.ok(c.difficulty === "normal" || c.difficulty === "hard", "valid difficulty");
  }
});

test("getDailyChallenge varies across dates (not a constant)", () => {
  const seen = new Set();
  for (let d = 1; d <= 28; d++) {
    const c = Challenge.getDailyChallenge("2026-02-" + String(d).padStart(2, "0"));
    seen.add(c.playerHeroId + "v" + c.opponentHeroId + ":" + c.difficulty);
  }
  assert.ok(seen.size > 1, "challenges should vary across dates");
});

test("parseChallengeParams: no valid share param -> null", () => {
  assert.strictEqual(Challenge.parseChallengeParams(""), null);
  assert.strictEqual(Challenge.parseChallengeParams("?foo=bar"), null);
  assert.strictEqual(Challenge.parseChallengeParams("?share=bogus"), null);
  assert.strictEqual(Challenge.parseChallengeParams(null), null);
});

test("parseChallengeParams: daily carries optional from", () => {
  assert.deepStrictEqual(Challenge.parseChallengeParams("?share=daily"), { type: "daily", from: null });
  assert.deepStrictEqual(Challenge.parseChallengeParams("?share=daily&from=Bubbe"), { type: "daily", from: "Bubbe" });
});

test("parseChallengeParams: quick validates heroes and rejects mirrors", () => {
  assert.deepStrictEqual(
    Challenge.parseChallengeParams("?share=quick&p=moses&o=david&d=hard"),
    { type: "quick", playerHeroId: "moses", opponentHeroId: "david", hard: true, from: null }
  );
  assert.strictEqual(Challenge.parseChallengeParams("?share=quick&p=moses&o=moses"), null, "mirror rejected");
  assert.strictEqual(Challenge.parseChallengeParams("?share=quick&p=bogus&o=david"), null, "invalid hero rejected");
  assert.strictEqual(Challenge.parseChallengeParams("?share=quick&p=golda&o=einstein").hard, false, "no d -> not hard");
});

test("parseChallengeParams: endless clamps streak to >= 0", () => {
  assert.deepStrictEqual(
    Challenge.parseChallengeParams("?share=endless&h=golda&s=7"),
    { type: "endless", heroId: "golda", streakToBeat: 7, from: null }
  );
  assert.strictEqual(Challenge.parseChallengeParams("?share=endless&h=golda").streakToBeat, 0);
  assert.strictEqual(Challenge.parseChallengeParams("?share=endless&h=golda&s=-5").streakToBeat, 0);
  assert.strictEqual(Challenge.parseChallengeParams("?share=endless&h=bogus"), null);
});

test("parseChallengeParams: arcade and tournament", () => {
  assert.deepStrictEqual(Challenge.parseChallengeParams("?share=arcade&h=esther"), { type: "arcade", heroId: "esther", from: null });
  assert.deepStrictEqual(Challenge.parseChallengeParams("?share=tournament&h=judah&from=Sam"), { type: "tournament", heroId: "judah", from: "Sam" });
  assert.strictEqual(Challenge.parseChallengeParams("?share=arcade&h=bogus"), null);
});

test("buildShareUrl appends the share type and skips null/empty params", () => {
  assert.strictEqual(Challenge.buildShareUrl("https://x.io/game/", "daily", {}), "https://x.io/game/?share=daily");
  const url = Challenge.buildShareUrl("https://x.io/", "quick", { p: "moses", o: "david", d: "hard" });
  const params = new URLSearchParams(url.split("?")[1]);
  assert.strictEqual(params.get("share"), "quick");
  assert.strictEqual(params.get("p"), "moses");
  assert.strictEqual(params.get("o"), "david");
  assert.strictEqual(params.get("d"), "hard");
  const url2 = Challenge.buildShareUrl("https://x.io/", "quick", { p: "moses", o: "david", d: "" });
  assert.strictEqual(new URLSearchParams(url2.split("?")[1]).has("d"), false, "empty param skipped");
});

test("a buildShareUrl quick link round-trips through parseChallengeParams", () => {
  const url = Challenge.buildShareUrl("https://x.io/game/", "quick", { p: "moses", o: "david", d: "hard" });
  const search = "?" + url.split("?")[1];
  assert.deepStrictEqual(
    Challenge.parseChallengeParams(search),
    { type: "quick", playerHeroId: "moses", opponentHeroId: "david", hard: true, from: null }
  );
});
