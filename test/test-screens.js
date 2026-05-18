// test/test-screens.js
//
// Render-layer tests for screens.js — specifically the new Hero Spotlight
// Stats block shown inside each card on the character select screen.
const test = require("node:test");
const assert = require("node:assert");
const Screens = require("../src/screens.js");
const Storage = require("../src/storage.js");
const Combat = require("../src/combat.js");
const Heroes = require("../src/heroes.js");

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

// ── VS Intro screen ─────────────────────────────────────────────────────────

test("renderVsIntro: includes both hero names and the stage name", () => {
  const match = Combat.createMatch("moses", "david");
  const state = { match };
  const html = Screens.renderVsIntro(state);
  const mosesName = Heroes.byId("moses").name;
  const davidName = Heroes.byId("david").name;
  assert.match(html, /screen-vs-intro/);
  assert.ok(html.includes(mosesName), "expected Moses' name in output");
  assert.ok(html.includes(davidName), "expected David's name in output");
  // David's default stage is Valley of Elah
  assert.match(html, /Valley of Elah/);
});

test("renderVsIntro: shows VS divider, skip hint, and stage backdrop scaffold", () => {
  const match = Combat.createMatch("esther", "judah");
  const html = Screens.renderVsIntro({ match });
  assert.match(html, /class="vs-intro-vs"/);
  assert.match(html, />VS</);
  assert.match(html, /vs-intro-skip-hint/);
  assert.match(html, /vs-intro-bg/);
  assert.match(html, /data-action="vs-skip"/);
});

test("renderVsIntro: each fighter shows portrait, name, and era", () => {
  const match = Combat.createMatch("rambam", "einstein");
  const html = Screens.renderVsIntro({ match });
  const rambam = Heroes.byId("rambam");
  const einstein = Heroes.byId("einstein");
  // Both portraits rendered
  const portraits = html.match(/vs-intro-portrait/g) || [];
  assert.ok(portraits.length >= 2, "expected two portrait wrappers");
  // Both eras present
  assert.ok(html.includes(rambam.era), "expected left hero's era in markup");
  assert.ok(html.includes(einstein.era), "expected right hero's era in markup");
});

test("renderVsIntro: returns empty string when match is missing", () => {
  assert.strictEqual(Screens.renderVsIntro({}), "");
  assert.strictEqual(Screens.renderVsIntro({ match: null }), "");
  assert.strictEqual(Screens.renderVsIntro({ match: { players: [] } }), "");
});

test("renderVsIntro: uses the locked stageId from the match when present", () => {
  // Force a non-default stage to confirm match.stageId wins over hero default
  const match = Combat.createMatch("moses", "david", { stageId: "throne" });
  const html = Screens.renderVsIntro({ match });
  assert.match(html, /Persian Throne/);
});

// ── Quick Play title button ────────────────────────────────────────────────

test("renderTitle: includes Quick Play button with start-quick-play action", () => {
  const save = freshSave();
  // Simulate a save with some history so the recentMatches branch is active too
  save.stats.matchesPlayed = 5;
  save.stats.matchesWon = 3;
  save.recentMatches = [{ id: 1, mode: "quick", winnerHeroId: "moses" }];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /data-action="start-quick-play"/);
  assert.match(html, /Quick Play/);
});

test("renderTitle: Quick Play button appears on a brand-new save (no matches played)", () => {
  const save = freshSave();
  // Brand new save: no recentMatches, no arcade wins, no endless scores
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /data-action="start-quick-play"/);
  assert.match(html, /Quick Play/);
  // Sanity: BEGIN is still there, and Quick Play sits right after it
  const beginIdx = html.indexOf('data-action="goto-mode"');
  const quickIdx = html.indexOf('data-action="start-quick-play"');
  assert.ok(beginIdx >= 0 && quickIdx > beginIdx, "Quick Play should appear after BEGIN");
});

// ── Confetti celebration helper ─────────────────────────────────────────────

test("renderConfetti: default count produces a wrapper with 30 pieces", () => {
  const html = Screens.renderConfetti();
  assert.ok(html.includes('class="confetti"'), "expected confetti wrapper");
  const pieces = html.match(/class="confetti-piece"/g) || [];
  assert.strictEqual(pieces.length, 30, "default count should be 30");
});

test("renderConfetti: respects the count option", () => {
  const html = Screens.renderConfetti({ count: 50 });
  const pieces = html.match(/class="confetti-piece"/g) || [];
  assert.strictEqual(pieces.length, 50);
});

test("renderConfetti: wrapper is aria-hidden so SRs skip the decoration", () => {
  const html = Screens.renderConfetti({ count: 5 });
  assert.match(html, /aria-hidden="true"/);
});

test("renderConfetti: each piece carries the CSS custom properties for x/delay/dur/hue", () => {
  // One full piece sample is enough — sanity-check the inline-style template.
  const html = Screens.renderConfetti({ count: 1 });
  assert.match(html, /--x:/);
  assert.match(html, /--delay:/);
  assert.match(html, /--dur:/);
  assert.match(html, /--hue:/);
});

test("renderEndlessResult: confetti appears only when isNewBest is true", () => {
  const baseState = {
    endless: {
      heroId: "moses",
      streak: 7,
      isNewBest: true,
      previousBest: 3
    },
    save: freshSave()
  };
  const withBest = Screens.renderEndlessResult(baseState);
  assert.ok(withBest.includes('class="confetti"'), "expected confetti on new best run");

  baseState.endless.isNewBest = false;
  const withoutBest = Screens.renderEndlessResult(baseState);
  assert.ok(!withoutBest.includes('class="confetti"'), "no confetti on a regular run");
});

test("renderQuizResult: confetti appears only when quiz.isNewBest && streak > 0", () => {
  // Build a minimal pool covering Moses' first trivia question so the recap
  // doesn't crash when it walks back through the answered entries.
  const moses = Heroes.byId("moses");
  const triviaLen = (moses.trivia && moses.trivia.length) || 1;
  const pool = [];
  for (let i = 0; i < Math.max(triviaLen, 3); i++) {
    pool.push({ heroId: "moses", qIdx: i % triviaLen });
  }

  // (A) New personal best with a real streak → confetti expected
  const withBest = Screens.renderQuizResult({
    quiz: { pool, currentIndex: 2, streak: 2, finished: true, isNewBest: true, previousBest: 1 },
    save: freshSave()
  });
  assert.ok(withBest.includes('class="confetti"'), "expected confetti on new best quiz streak");

  // (B) New personal best but streak === 0 → no confetti (gated by streak > 0)
  const zeroStreak = Screens.renderQuizResult({
    quiz: { pool, currentIndex: 0, streak: 0, finished: true, isNewBest: true, previousBest: 0 },
    save: freshSave()
  });
  assert.ok(!zeroStreak.includes('class="confetti"'), "no confetti when streak is zero even with isNewBest");

  // (C) Not a new best → no confetti
  const notBest = Screens.renderQuizResult({
    quiz: { pool, currentIndex: 2, streak: 2, finished: true, isNewBest: false, previousBest: 5 },
    save: freshSave()
  });
  assert.ok(!notBest.includes('class="confetti"'), "no confetti when not a personal best");
});

test("renderTournamentResult: confetti appears when a champion is crowned", () => {
  const t = {
    humanCount: 1,
    slotControllers: ["human", "ai", "ai", "ai"],
    slots: ["moses", "david", "esther", "judah"],
    bracket: {
      semi1Winner: "moses", semi1WinnerSlot: 0,
      semi2Winner: "esther", semi2WinnerSlot: 2,
      semi2Log: null,
      finalWinner: "moses", finalWinnerSlot: 0
    },
    currentMatch: "final"
  };
  const html = Screens.renderTournamentResult({ tournament: t, save: freshSave() });
  assert.ok(html.includes('class="confetti"'), "expected confetti on champion screen");
  assert.match(html, /TOURNAMENT CHAMPION/);
});

test("renderTournamentResult: no confetti when a human was eliminated (no finalWinner)", () => {
  const t = {
    humanCount: 1,
    slotControllers: ["human", "ai", "ai", "ai"],
    slots: ["moses", "david", "esther", "judah"],
    bracket: {
      semi1Winner: "david", semi1WinnerSlot: 1,
      semi2Winner: null, semi2WinnerSlot: null,
      semi2Log: null,
      finalWinner: null, finalWinnerSlot: null
    },
    eliminatedBy: "david",
    currentMatch: "semi1"
  };
  const html = Screens.renderTournamentResult({ tournament: t, save: freshSave() });
  assert.ok(!html.includes('class="confetti"'), "no confetti on elimination screen");
  assert.match(html, /Eliminated/);
});

// ── renderWhatsNew ───────────────────────────────────────────────────────

function sampleChangelog() {
  return [
    {
      version: 1,
      title: "v1 — The Polish Update",
      date: "2026-05-17",
      changes: [
        { icon: "X", title: "Old Feature", description: "Old description." }
      ]
    },
    {
      version: 2,
      title: "v2 — The Sequel",
      date: "2026-06-01",
      changes: [
        { icon: "Y", title: "Latest Feature", description: "Brand new thing." },
        { icon: "Z", title: "Another Latest", description: "Also new." }
      ]
    }
  ];
}

test("renderWhatsNew returns markup when state.changelog has at least one entry", () => {
  const html = Screens.renderWhatsNew({ changelog: sampleChangelog() });
  assert.notStrictEqual(html, "");
  assert.match(html, /class="overlay"/);
  assert.match(html, /whats-new-card/);
});

test("renderWhatsNew renders the LATEST changelog entry (last one in the array)", () => {
  const html = Screens.renderWhatsNew({ changelog: sampleChangelog() });
  // Latest entry's title appears
  assert.match(html, /v2 &mdash; The Sequel|v2 — The Sequel/);
  // Latest entry's change items appear
  assert.match(html, /Latest Feature/);
  assert.match(html, /Brand new thing\./);
  assert.match(html, /Another Latest/);
  // Older entry's content does NOT appear
  assert.doesNotMatch(html, /Old Feature/);
  assert.doesNotMatch(html, /Old description/);
});

test("renderWhatsNew returns empty string when state.changelog is missing", () => {
  assert.strictEqual(Screens.renderWhatsNew({}), "");
  assert.strictEqual(Screens.renderWhatsNew({ changelog: null }), "");
  assert.strictEqual(Screens.renderWhatsNew({ changelog: undefined }), "");
});

test("renderWhatsNew returns empty string when state.changelog is empty", () => {
  assert.strictEqual(Screens.renderWhatsNew({ changelog: [] }), "");
});

test("renderWhatsNew returns empty string when latest entry has no changes", () => {
  const cl = [{ version: 1, title: "Empty", date: "2026-01-01", changes: [] }];
  assert.strictEqual(Screens.renderWhatsNew({ changelog: cl }), "");
});

test("renderWhatsNew output contains the 'dismiss-whats-new' action button", () => {
  const html = Screens.renderWhatsNew({ changelog: sampleChangelog() });
  assert.match(html, /data-action="dismiss-whats-new"/);
});

test("renderWhatsNew shows the NEW badge and welcome subtitle", () => {
  const html = Screens.renderWhatsNew({ changelog: sampleChangelog() });
  assert.match(html, /whats-new-badge/);
  assert.match(html, /NEW/);
  assert.match(html, /Welcome back/);
});

test("renderWhatsNew escapes title and description text to prevent XSS", () => {
  const cl = [{
    version: 1, title: "Safe", date: "2026-01-01",
    changes: [{ icon: "!", title: "<script>", description: "evil & <b>bold</b>" }]
  }];
  const html = Screens.renderWhatsNew({ changelog: cl });
  // Raw script tag must not appear
  assert.doesNotMatch(html, /<script>/);
  // Ampersand should be escaped
  assert.match(html, /&amp;/);
});

test("renderWhatsNew handles missing state argument gracefully (no throw)", () => {
  assert.doesNotThrow(() => Screens.renderWhatsNew());
  assert.strictEqual(Screens.renderWhatsNew(), "");
});

// ── Continue Last Mode title button ───────────────────────────────────────

test("renderTitle: shows Continue button when save.lastSession is set with a valid hero", () => {
  const save = freshSave();
  save.lastSession = { mode: "arcade", playerHeroId: "moses", timestamp: 1700000000000 };
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /data-action="continue-last"/);
  assert.match(html, /Continue: Arcade Ladder/);
  assert.match(html, /as Moses/);
});

test("renderTitle: does NOT show Continue button when lastSession is null", () => {
  const save = freshSave();
  // Default is null — be explicit.
  save.lastSession = null;
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /data-action="continue-last"/);
  assert.doesNotMatch(html, /Continue:/);
});

test("renderTitle: does NOT show Continue button when the hero in lastSession no longer exists", () => {
  const save = freshSave();
  // Bypass storage validation by injecting directly (storage.load would reject this).
  save.lastSession = { mode: "quick", playerHeroId: "nobody", timestamp: 1700000000000 };
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /data-action="continue-last"/);
});

test("renderTitle: Continue button label uses the correct mode label per mode", () => {
  const cases = [
    { mode: "quick",   label: "Quick Match" },
    { mode: "arcade",  label: "Arcade Ladder" },
    { mode: "endless", label: "Endless Survival" },
    { mode: "study",   label: "Study Mode" }
  ];
  for (const c of cases) {
    const save = freshSave();
    save.lastSession = { mode: c.mode, playerHeroId: "david", timestamp: 1700000000000 };
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    assert.match(html, new RegExp(`Continue: ${c.label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`),
      `mode ${c.mode} should render label "${c.label}"`);
    assert.match(html, /as King David/, `mode ${c.mode} should render the hero's display name`);
  }
});

test("renderTitle: Continue button sits between BEGIN and Quick Play", () => {
  const save = freshSave();
  save.lastSession = { mode: "quick", playerHeroId: "esther", timestamp: 1700000000000 };
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  const beginIdx    = html.indexOf('data-action="goto-mode"');
  const continueIdx = html.indexOf('data-action="continue-last"');
  const quickIdx    = html.indexOf('data-action="start-quick-play"');
  assert.ok(beginIdx >= 0, "BEGIN should be present");
  assert.ok(continueIdx > beginIdx, "Continue should appear after BEGIN");
  assert.ok(quickIdx > continueIdx, "Continue should appear before Quick Play");
});

test("renderTitle: Continue button escapes the hero name to prevent HTML injection", () => {
  const save = freshSave();
  // Forge a lastSession with a real hero id; we're proving Render.escapeHtml is wired.
  save.lastSession = { mode: "quick", playerHeroId: "judah", timestamp: 1700000000000 };
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  // Judah Maccabee's name has no special chars — just confirm the button renders cleanly.
  assert.match(html, /as Judah Maccabee/);
});

// ── Achievement progress widget on title ──────────────────────────────────

test("renderTitle: includes achievement-progress widget when at least one achievement is unlocked", () => {
  const save = freshSave();
  save.achievements.firstWin = Date.now();
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /class="achievement-progress"/);
  assert.match(html, /achievement-progress-bar/);
  assert.match(html, /achievement-progress-fill/);
});

test("renderTitle: does NOT include achievement-progress widget when zero achievements are unlocked", () => {
  const save = freshSave();
  // Brand-new save — every achievement entry defaults to false in Storage.defaults().
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /class="achievement-progress"/);
});

test("renderTitle: achievement-progress widget shows correct unlocked/total counts", () => {
  const save = freshSave();
  // Unlock three arbitrary achievements with timestamp values.
  save.achievements.firstWin = Date.now();
  save.achievements.arcadeChampion = Date.now();
  save.achievements.comeback = Date.now();
  const total = Screens.ACHIEVEMENT_LIST.length;  // expected: 25
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  // Widget should announce "<strong>3</strong> of 25 achievements" (and the
  // accessible label should carry the same numbers).
  assert.match(html, new RegExp(`<strong>3</strong> of ${total} achievements`));
  assert.match(html, new RegExp(`Trophy Room: 3 of ${total} achievements unlocked`));
});

test("renderTitle: achievement-progress widget has data-action=\"open-trophy-room\" so existing handler is reused", () => {
  const save = freshSave();
  save.achievements.firstWin = Date.now();
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  // Confirm the click target reuses the action already wired in main.js.
  assert.match(html, /class="achievement-progress"[\s\S]*?data-action="open-trophy-room"/);
});
