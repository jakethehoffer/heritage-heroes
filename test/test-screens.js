// test/test-screens.js
//
// Render-layer tests for screens.js — specifically the new Hero Spotlight
// Stats block shown inside each card on the character select screen.
const test = require("node:test");
const assert = require("node:assert");
const Screens = require("../src/screens.js");
const Storage = require("../src/storage.js");

function freshSave() {
  return Storage.defaults();
}

test("_heroSpotlightStats: brand-new hero (no data) returns empty-state markup", () => {
  const save = freshSave();
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  assert.match(html, /hero-stats empty/);
  assert.match(html, /New/);
  assert.match(html, /never played/);
});

test("_heroSpotlightStats: missing save / missing perHero is treated as empty (no throw)", () => {
  assert.doesNotThrow(() => Screens._heroSpotlightStats(undefined, "moses", "quick"));
  assert.doesNotThrow(() => Screens._heroSpotlightStats({}, "moses", "quick"));
  assert.doesNotThrow(() => Screens._heroSpotlightStats({ stats: {} }, "moses", "quick"));
  const html = Screens._heroSpotlightStats({}, "moses", "quick");
  assert.match(html, /hero-stats empty/);
});

test("_heroSpotlightStats: shows W/L and percentage when played > 0", () => {
  const save = freshSave();
  save.stats.perHero.moses = { played: 10, won: 7, triviaCorrect: 0, triviaTotal: 0 };
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  assert.doesNotMatch(html, /hero-stats empty/);
  assert.match(html, /7-3/);
  assert.match(html, /\(70%\)/);
});

test("_heroSpotlightStats: shows ★ MASTERED when mastered flag is true", () => {
  const save = freshSave();
  save.mastered.david = true;
  const html = Screens._heroSpotlightStats(save, "david", "study");
  assert.match(html, /MASTERED/);
});

test("_heroSpotlightStats: endless mode surfaces best run when > 0", () => {
  const save = freshSave();
  save.endlessHighScore.moses = 12;
  const html = Screens._heroSpotlightStats(save, "moses", "endless");
  assert.match(html, /Best run: 12/);
});

test("_heroSpotlightStats: endless best is hidden in non-endless modes", () => {
  const save = freshSave();
  save.endlessHighScore.moses = 12;
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  assert.doesNotMatch(html, /Best run/);
});

test("_heroSpotlightStats: arcade mode surfaces arcade wins when > 0", () => {
  const save = freshSave();
  save.arcade.judah = 4;
  const html = Screens._heroSpotlightStats(save, "judah", "arcade");
  assert.match(html, /Arcade wins: 4/);
});

test("_heroSpotlightStats: arcade wins hidden in non-arcade modes", () => {
  const save = freshSave();
  save.arcade.judah = 4;
  const html = Screens._heroSpotlightStats(save, "judah", "endless");
  assert.doesNotMatch(html, /Arcade wins/);
});

test("_heroSpotlightStats: spectator/tournament show only universal stats (no mode-specific extras)", () => {
  const save = freshSave();
  save.stats.perHero.moses = { played: 5, won: 3, triviaCorrect: 0, triviaTotal: 0 };
  save.endlessHighScore.moses = 9;
  save.arcade.moses = 2;
  for (const mode of ["spectator", "tournament"]) {
    const html = Screens._heroSpotlightStats(save, "moses", mode);
    assert.match(html, /3-2/, `${mode}: should show W/L`);
    assert.doesNotMatch(html, /Best run/, `${mode}: must hide endless best`);
    assert.doesNotMatch(html, /Arcade wins/, `${mode}: must hide arcade wins`);
  }
});

test("_heroSpotlightStats: rounds win% to nearest integer", () => {
  const save = freshSave();
  save.stats.perHero.moses = { played: 3, won: 2, triviaCorrect: 0, triviaTotal: 0 };
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  assert.match(html, /2-1/);
  assert.match(html, /\(67%\)/);  // 2/3 = 66.66… → 67
});

test("_heroSpotlightStats: losses never go negative if data is malformed (won > played)", () => {
  const save = freshSave();
  // Defensive: even if storage somehow ended up with won>played, don't render "-1"
  save.stats.perHero.moses = { played: 2, won: 5, triviaCorrect: 0, triviaTotal: 0 };
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  assert.doesNotMatch(html, /-1|--/);
});

test("_heroSpotlightStats: combined stacks W/L + MASTERED + Best run for endless mode", () => {
  const save = freshSave();
  save.stats.perHero.moses = { played: 10, won: 7, triviaCorrect: 18, triviaTotal: 20 };
  save.mastered.moses = true;
  save.endlessHighScore.moses = 12;
  const html = Screens._heroSpotlightStats(save, "moses", "endless");
  assert.match(html, /7-3/);
  assert.match(html, /\(70%\)/);
  assert.match(html, /MASTERED/);
  assert.match(html, /Best run: 12/);
  assert.doesNotMatch(html, /hero-stats empty/);
});

test("renderCharSelect: populated save surfaces W/L, MASTERED, endless best for the chosen hero", () => {
  const save = freshSave();
  save.stats.perHero.moses = { played: 10, won: 7, triviaCorrect: 18, triviaTotal: 20 };
  save.mastered.moses = true;
  save.endlessHighScore.moses = 12;
  const html = Screens.renderCharSelect({ mode: "endless", selecting: 1, save });
  assert.match(html, /hero-stats/);
  assert.match(html, /7-3/);
  assert.match(html, /\(70%\)/);
  assert.match(html, /MASTERED/);
  assert.match(html, /Best run: 12/);
});

test("renderCharSelect: a fresh save renders the empty-state line for every hero card", () => {
  const save = freshSave();
  const html = Screens.renderCharSelect({ mode: "quick", selecting: 1, save });
  const emptyMatches = html.match(/hero-stats empty/g) || [];
  assert.strictEqual(emptyMatches.length, 7, "expected the empty state on all 7 hero cards");
  assert.match(html, /never played/);
});

test("renderCharSelect: arcade mode shows arcade wins on the relevant card", () => {
  const save = freshSave();
  save.arcade.esther = 3;
  save.stats.perHero.esther = { played: 6, won: 3, triviaCorrect: 0, triviaTotal: 0 };
  const html = Screens.renderCharSelect({ mode: "arcade", selecting: 1, save });
  assert.match(html, /3-3/);
  assert.match(html, /\(50%\)/);
  assert.match(html, /Arcade wins: 3/);
});

test("renderCharSelect: hero-stats block sits between bio and moves in each card", () => {
  const save = freshSave();
  save.stats.perHero.moses = { played: 4, won: 3, triviaCorrect: 0, triviaTotal: 0 };
  const html = Screens.renderCharSelect({ mode: "quick", selecting: 1, save });
  // For Moses' card the order must be: bio paragraph → hero-stats div → moves list.
  // Pull just Moses' card so we don't accidentally match a different hero's snippet.
  const mosesCardMatch = html.match(/data-hero="moses"[\s\S]*?<\/button>/);
  assert.ok(mosesCardMatch, "could not find Moses' hero-card");
  const card = mosesCardMatch[0];
  const bioIdx = card.indexOf('class="bio"');
  const statsIdx = card.indexOf('class="hero-stats"');
  const movesIdx = card.indexOf('class="moves"');
  assert.ok(bioIdx > 0 && statsIdx > 0 && movesIdx > 0, "expected bio/stats/moves all present");
  assert.ok(bioIdx < statsIdx, "bio should appear before hero-stats");
  assert.ok(statsIdx < movesIdx, "hero-stats should appear before moves");
});

test("renderCharSelect: does not throw when save is missing entirely", () => {
  assert.doesNotThrow(() =>
    Screens.renderCharSelect({ mode: "quick", selecting: 1 })
  );
  assert.doesNotThrow(() =>
    Screens.renderCharSelect({ mode: "quick", selecting: 1, save: {} })
  );
});
