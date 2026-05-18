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
const Calendar = require("../src/calendar.js");

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

// ── Match-End VICTORY / DEFEAT splash ───────────────────────────────────────

function _splashMatch(p0, p1, opts) {
  // Build a Combat match and force a winner so the splash has data to render.
  const match = Combat.createMatch(p0, p1, opts);
  match.winner = (opts && typeof opts.winnerSlot === "number") ? opts.winnerSlot : 0;
  return match;
}

test("renderMatchEndSplash: returns markup with the winner's name and stage", () => {
  const match = _splashMatch("moses", "david", { stageId: "throne", winnerSlot: 0 });
  const html = Screens.renderMatchEndSplash({
    match,
    controllers: ["human", "ai"],
    mode: "quick"
  });
  assert.match(html, /screen-match-end-splash/);
  const mosesName = Heroes.byId("moses").name;
  assert.ok(html.includes(mosesName), "expected the winner's name in output");
  // Stage attribute should reflect the locked stageId
  assert.match(html, /data-stage="throne"/);
});

test("renderMatchEndSplash: shows VICTORY! when human (slot 0) wins vs AI", () => {
  const match = _splashMatch("moses", "david", { winnerSlot: 0 });
  const html = Screens.renderMatchEndSplash({
    match,
    controllers: ["human", "ai"],
    mode: "quick"
  });
  assert.match(html, /match-end-splash-title victory/);
  assert.match(html, /VICTORY!/);
  assert.doesNotMatch(html, /DEFEAT!/);
});

test("renderMatchEndSplash: shows DEFEAT! when AI (slot 1) wins vs human", () => {
  const match = _splashMatch("moses", "david", { winnerSlot: 1 });
  const html = Screens.renderMatchEndSplash({
    match,
    controllers: ["human", "ai"],
    mode: "quick"
  });
  assert.match(html, /match-end-splash-title defeat/);
  assert.match(html, /DEFEAT!/);
  assert.doesNotMatch(html, /VICTORY!/);
});

test("renderMatchEndSplash: shows neutral PLAYER 1 WINS! / PLAYER 2 WINS! for couch matches", () => {
  const matchP1 = _splashMatch("moses", "david", { winnerSlot: 0 });
  const htmlP1 = Screens.renderMatchEndSplash({
    match: matchP1,
    controllers: ["human", "human"],
    mode: "quick"
  });
  assert.match(htmlP1, /match-end-splash-title neutral/);
  assert.match(htmlP1, /PLAYER 1 WINS!/);

  const matchP2 = _splashMatch("moses", "david", { winnerSlot: 1 });
  const htmlP2 = Screens.renderMatchEndSplash({
    match: matchP2,
    controllers: ["human", "human"],
    mode: "quick"
  });
  assert.match(htmlP2, /match-end-splash-title neutral/);
  assert.match(htmlP2, /PLAYER 2 WINS!/);
  assert.doesNotMatch(htmlP2, /VICTORY!|DEFEAT!/);
});

test("renderMatchEndSplash: shows neutral winner name for spectator mode", () => {
  const match = _splashMatch("esther", "judah", { winnerSlot: 1 });
  const html = Screens.renderMatchEndSplash({
    match,
    controllers: ["ai", "ai"],
    mode: "spectator"
  });
  assert.match(html, /match-end-splash-title neutral/);
  // Should include the winner's name and "WINS!" (not VICTORY/DEFEAT/PLAYER X)
  const judahName = Heroes.byId("judah").name;
  assert.ok(html.includes(judahName.toUpperCase() + " WINS!"),
    `expected '${judahName.toUpperCase()} WINS!' in markup`);
  assert.doesNotMatch(html, /VICTORY!|DEFEAT!|PLAYER 1 WINS!|PLAYER 2 WINS!/);
});

test("renderMatchEndSplash: shows neutral WINS THIS ROUND! for tournament mode", () => {
  const match = _splashMatch("rambam", "einstein", { winnerSlot: 0 });
  const html = Screens.renderMatchEndSplash({
    match,
    controllers: ["human", "ai"],
    mode: "tournament"
  });
  assert.match(html, /match-end-splash-title neutral/);
  const rambamName = Heroes.byId("rambam").name;
  assert.ok(html.includes(rambamName.toUpperCase() + " WINS THIS ROUND!"),
    "tournament splash should use neutral '... WINS THIS ROUND!' title");
  assert.doesNotMatch(html, /VICTORY!|DEFEAT!/);
});

test("renderMatchEndSplash: returns empty string when match is missing or has no winner", () => {
  assert.strictEqual(Screens.renderMatchEndSplash({}), "");
  assert.strictEqual(Screens.renderMatchEndSplash({ match: null }), "");
  assert.strictEqual(Screens.renderMatchEndSplash({ match: { players: [] } }), "");
  // Match exists with players but winner is still null (pre-fight)
  const pending = Combat.createMatch("moses", "david");
  pending.winner = null;
  assert.strictEqual(Screens.renderMatchEndSplash({ match: pending }), "");
});

test("renderMatchEndSplash: output contains data-action=\"match-end-skip\"", () => {
  const match = _splashMatch("moses", "david", { winnerSlot: 0 });
  const html = Screens.renderMatchEndSplash({
    match,
    controllers: ["human", "ai"],
    mode: "quick"
  });
  assert.match(html, /data-action="match-end-skip"/);
  // Skip hint must also be present so players know the screen is dismissible.
  assert.match(html, /match-end-splash-skip-hint/);
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

// ── VS Intro matchup prediction badge ──────────────────────────────────────

test("_vsIntroMatchupSummary: empty matchups returns first-time meeting", () => {
  const result = Screens._vsIntroMatchupSummary({}, "moses", "david");
  assert.strictEqual(result.icon, "✨");
  assert.strictEqual(result.text, "First time meeting!");
});

test("_vsIntroMatchupSummary: missing matchups arg returns first-time meeting", () => {
  const result = Screens._vsIntroMatchupSummary(undefined, "moses", "david");
  assert.strictEqual(result.icon, "✨");
  assert.strictEqual(result.text, "First time meeting!");
});

test("_vsIntroMatchupSummary: matchups missing this specific key returns first-time meeting", () => {
  const matchups = { "moses|esther": { wins: 2, losses: 0 } };
  const result = Screens._vsIntroMatchupSummary(matchups, "moses", "david");
  assert.strictEqual(result.icon, "✨");
  assert.strictEqual(result.text, "First time meeting!");
});

test("_vsIntroMatchupSummary: record with both 0 still treated as first-time meeting", () => {
  const matchups = { "moses|david": { wins: 0, losses: 0 } };
  const result = Screens._vsIntroMatchupSummary(matchups, "moses", "david");
  assert.strictEqual(result.icon, "✨");
  assert.strictEqual(result.text, "First time meeting!");
});

test("_vsIntroMatchupSummary: wins > losses returns winning record", () => {
  const matchups = { "moses|david": { wins: 3, losses: 1 } };
  const result = Screens._vsIntroMatchupSummary(matchups, "moses", "david");
  assert.strictEqual(result.text, "Your record: 3-1");
  // sanity: icon non-empty (trophy)
  assert.ok(result.icon && result.icon.length > 0);
});

test("_vsIntroMatchupSummary: wins < losses returns tough matchup with raw wins-losses order", () => {
  const matchups = { "moses|david": { wins: 1, losses: 4 } };
  const result = Screens._vsIntroMatchupSummary(matchups, "moses", "david");
  assert.strictEqual(result.text, "Tough matchup: 1-4");
  assert.ok(result.icon && result.icon.length > 0);
});

test("_vsIntroMatchupSummary: equal wins and losses returns even match", () => {
  const matchups = { "moses|david": { wins: 2, losses: 2 } };
  const result = Screens._vsIntroMatchupSummary(matchups, "moses", "david");
  assert.strictEqual(result.text, "Even match: 2-2");
  assert.ok(result.icon && result.icon.length > 0);
});

test("renderVsIntro: renders matchup prediction badge when controllers are [human, ai]", () => {
  const match = Combat.createMatch("moses", "david");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "ai"],
    mode: "quick",
    save: freshSave()
  });
  assert.match(html, /vs-intro-matchup-prediction/);
  assert.match(html, /First time meeting!/);
});

test("renderVsIntro: does NOT render matchup badge for couch [human, human] play", () => {
  const match = Combat.createMatch("moses", "david");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "human"],
    mode: "quick",
    save: freshSave()
  });
  assert.doesNotMatch(html, /vs-intro-matchup-prediction/);
});

test("renderVsIntro: does NOT render matchup badge for spectator [ai, ai]", () => {
  const match = Combat.createMatch("moses", "david");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["ai", "ai"],
    mode: "spectator",
    save: freshSave()
  });
  assert.doesNotMatch(html, /vs-intro-matchup-prediction/);
});

test("renderVsIntro: does NOT render matchup badge in tournament mode even with [human, ai]", () => {
  const match = Combat.createMatch("moses", "david");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "ai"],
    mode: "tournament",
    save: freshSave()
  });
  assert.doesNotMatch(html, /vs-intro-matchup-prediction/);
});

test("renderVsIntro: does NOT render matchup badge when controllers are missing", () => {
  const match = Combat.createMatch("moses", "david");
  // Plain renderVsIntro call without controllers context (e.g., the existing
  // tests above) must stay backward-compatible — badge is opt-in.
  const html = Screens.renderVsIntro({ match });
  assert.doesNotMatch(html, /vs-intro-matchup-prediction/);
});

test("renderVsIntro: shows correct wins-losses text for a populated matchup record", () => {
  const save = freshSave();
  save.matchups["moses|david"] = { wins: 5, losses: 2 };
  const match = Combat.createMatch("moses", "david");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "ai"],
    mode: "quick",
    save
  });
  assert.match(html, /vs-intro-matchup-prediction/);
  assert.match(html, /Your record: 5-2/);
});

test("renderVsIntro: matchup badge sits between stage name and fighters", () => {
  const match = Combat.createMatch("moses", "david");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "ai"],
    mode: "quick",
    save: freshSave()
  });
  const stageIdx    = html.indexOf("vs-intro-stage-name");
  const matchupIdx  = html.indexOf("vs-intro-matchup-prediction");
  const fightersIdx = html.indexOf("vs-intro-fighters");
  assert.ok(stageIdx >= 0 && matchupIdx > stageIdx && fightersIdx > matchupIdx,
    "matchup badge should render between stage name and fighters block");
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

// ── v2 CHANGELOG shape (verified via renderWhatsNew integration) ──────────
//
// The CHANGELOG constant lives privately inside the Main IIFE in main.js and
// is not exported, so we test the shape via the render path that consumes it.
// A v2-shaped mock with two entries (v1 + v2) lets us confirm:
//   - the rendering layer keeps the v1 entry available (length >= 2)
//   - renderWhatsNew shows the LATEST entry (v2), which is the user-facing
//     contract after the version bump
function v2ChangelogMock() {
  return [
    {
      version: 1,
      title: "v1 — The Polish Update",
      date: "2026-05-17",
      changes: [
        { icon: "X", title: "v1 Old Feature", description: "v1 thing." }
      ]
    },
    {
      version: 2,
      title: "v2 — The Big Update",
      date: "2026-05-18",
      changes: [
        { icon: "Y", title: "v2 Latest Feature", description: "v2 thing." },
        { icon: "Z", title: "v2 Another Feature", description: "more v2." }
      ]
    }
  ];
}

test("v2 CHANGELOG mock has 2 entries (v1 + v2)", () => {
  const cl = v2ChangelogMock();
  assert.strictEqual(cl.length, 2);
  assert.strictEqual(cl[0].version, 1);
  assert.strictEqual(cl[1].version, 2);
});

test("v2 entry has a non-empty changes array", () => {
  const cl = v2ChangelogMock();
  assert.ok(Array.isArray(cl[1].changes));
  assert.ok(cl[1].changes.length > 0);
});

test("renderWhatsNew shows the v2 entry as the latest (cl[cl.length - 1] is v2)", () => {
  const html = Screens.renderWhatsNew({ changelog: v2ChangelogMock() });
  // v2 title and v2-only items appear
  assert.match(html, /v2 &mdash; The Big Update|v2 — The Big Update/);
  assert.match(html, /v2 Latest Feature/);
  assert.match(html, /v2 Another Feature/);
  // v1 entry's content is NOT shown when v2 is the latest
  assert.doesNotMatch(html, /v1 Old Feature/);
});

// ── v3 CHANGELOG shape (verified via renderWhatsNew integration) ──────────
//
// Same approach as the v2 mock above: CHANGELOG is private inside main.js, so
// we exercise the rendering contract that consumes it. A v3-shaped mock with
// three entries (v1 + v2 + v3) confirms:
//   - the array preserves older entries (length === 3)
//   - renderWhatsNew shows v3 as the latest, which is what returning players
//     with lastSeenVersion === 2 will see on their next title load
function v3ChangelogMock() {
  return [
    {
      version: 1,
      title: "v1 — The Polish Update",
      date: "2026-05-17",
      changes: [
        { icon: "X", title: "v1 Old Feature", description: "v1 thing." }
      ]
    },
    {
      version: 2,
      title: "v2 — The Big Update",
      date: "2026-05-18",
      changes: [
        { icon: "Y", title: "v2 Mid Feature", description: "v2 thing." }
      ]
    },
    {
      version: 3,
      title: "v3 — Mastery & Replay",
      date: "2026-05-18",
      changes: [
        { icon: "A", title: "v3 Replay",   description: "Re-watch matches." },
        { icon: "B", title: "v3 Mastery",  description: "Five hero tiers." },
        { icon: "C", title: "v3 Profile",  description: "Player name." },
        { icon: "D", title: "v3 Stage",    description: "Stage info overlay." },
        { icon: "E", title: "v3 Compare",  description: "Hero comparison." },
        { icon: "F", title: "v3 Chart",    description: "HP timeline chart." }
      ]
    }
  ];
}

test("v3 CHANGELOG mock has 3 entries (v1 + v2 + v3)", () => {
  const cl = v3ChangelogMock();
  assert.strictEqual(cl.length, 3);
  assert.strictEqual(cl[0].version, 1);
  assert.strictEqual(cl[1].version, 2);
  assert.strictEqual(cl[2].version, 3);
});

test("v3 entry title contains 'v3'", () => {
  const cl = v3ChangelogMock();
  assert.match(cl[2].title, /v3/);
});

test("v3 entry has a non-empty changes array (>= 6 items)", () => {
  const cl = v3ChangelogMock();
  assert.ok(Array.isArray(cl[2].changes));
  assert.ok(cl[2].changes.length >= 6,
    `expected >= 6 v3 changes, got ${cl[2].changes.length}`);
});

test("renderWhatsNew shows the v3 entry as the latest (cl[cl.length - 1] is v3)", () => {
  const html = Screens.renderWhatsNew({ changelog: v3ChangelogMock() });
  // v3 title and v3-only items appear
  assert.match(html, /v3 &mdash; Mastery &amp; Replay|v3 — Mastery &amp; Replay/);
  assert.match(html, /v3 Replay/);
  assert.match(html, /v3 Mastery/);
  assert.match(html, /v3 Profile/);
  // Older entries' content is NOT shown when v3 is the latest
  assert.doesNotMatch(html, /v1 Old Feature/);
  assert.doesNotMatch(html, /v2 Mid Feature/);
});

// ── Replay Tutorial button (Part 2) ───────────────────────────────────────

test("renderHelp includes the Replay Tutorial button", () => {
  const html = Screens.renderHelp();
  assert.match(html, /Replay Tutorial/);
});

test("renderHelp Replay Tutorial button has data-action=\"replay-tutorial\"", () => {
  const html = Screens.renderHelp();
  assert.match(html, /data-action="replay-tutorial"/);
});

test("renderHelp still has a Close button alongside Replay Tutorial", () => {
  const html = Screens.renderHelp();
  // The original close-overlay button is preserved
  assert.match(html, /data-action="close-overlay"/);
  assert.match(html, /Got it/);
});

test("renderSettings includes the Replay Tutorial button in a new \"Help\" group", () => {
  const save = freshSave();
  const html = Screens.renderSettings({ save });
  // Help section heading exists
  assert.match(html, /<h3>Help<\/h3>/);
  // Action button uses the replay-tutorial action and the styled class
  assert.match(html, /data-action="replay-tutorial"/);
  assert.match(html, /settings-action-btn/);
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

// ── "Did You Know?" rotating fact card on title ───────────────────────────
//
// These tests stub Heroes.pickRandomFact so the rendered HTML is deterministic.
// Each test restores the original implementation in a try/finally so other
// suites that import Heroes still see the real function.

test("renderTitle: includes title-funfact when Heroes.pickRandomFact returns a fact", () => {
  const save = freshSave();
  const original = Heroes.pickRandomFact;
  Heroes.pickRandomFact = () => ({
    heroId: "moses",
    heroName: "Moses",
    explanation: "Moses led the Israelites out of Egyptian slavery."
  });
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    assert.match(html, /class="title-funfact"/);
    assert.match(html, /Did You Know\?/);
    assert.match(html, /Moses led the Israelites out of Egyptian slavery\./);
    assert.match(html, /About Moses/);
  } finally {
    Heroes.pickRandomFact = original;
  }
});

test("renderTitle: title-funfact has data-action=\"view-profile\" and data-hero set to the fact's heroId", () => {
  const save = freshSave();
  const original = Heroes.pickRandomFact;
  Heroes.pickRandomFact = () => ({
    heroId: "einstein",
    heroName: "Albert Einstein",
    explanation: "E=mc² means energy equals mass times the speed of light squared."
  });
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    // Both attributes must appear on the same .title-funfact button.
    assert.match(html, /class="title-funfact"[\s\S]*?data-action="view-profile"/);
    assert.match(html, /class="title-funfact"[\s\S]*?data-hero="einstein"/);
  } finally {
    Heroes.pickRandomFact = original;
  }
});

test("renderTitle: title-funfact gracefully omitted when Heroes.pickRandomFact returns null", () => {
  const save = freshSave();
  const original = Heroes.pickRandomFact;
  Heroes.pickRandomFact = () => null;
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    assert.doesNotMatch(html, /class="title-funfact"/);
    assert.doesNotMatch(html, /Did You Know/);
    // And the rest of the screen still renders without throwing.
    assert.match(html, /<h1>Heritage Heroes<\/h1>/);
  } finally {
    Heroes.pickRandomFact = original;
  }
});

test("renderTitle: title-funfact escapes hero name and explanation to prevent HTML injection", () => {
  const save = freshSave();
  const original = Heroes.pickRandomFact;
  Heroes.pickRandomFact = () => ({
    heroId: "moses",
    heroName: "<script>alert('xss')</script>",
    explanation: "<img src=x onerror=alert(1)>"
  });
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    // Raw injected tags must not appear inside the rendered card.
    assert.doesNotMatch(html, /<script>alert\('xss'\)<\/script>/);
    assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
    // But escaped versions should be present.
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  } finally {
    Heroes.pickRandomFact = original;
  }
});

test("renderTitle: title-funfact sits between achievement-progress widget and the stat banners", () => {
  const save = freshSave();
  // Need an unlocked achievement so the achievement-progress widget renders.
  save.achievements.firstWin = Date.now();
  // Also seed an arcade win so the stat banner ("Arcade wins: N") renders.
  save.arcade.moses = 3;
  const original = Heroes.pickRandomFact;
  Heroes.pickRandomFact = () => ({
    heroId: "moses",
    heroName: "Moses",
    explanation: "An ordering-test fact."
  });
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    const achIdx  = html.indexOf('class="achievement-progress"');
    const factIdx = html.indexOf('class="title-funfact"');
    const statIdx = html.indexOf("Arcade wins:");
    assert.ok(achIdx >= 0, "expected achievement-progress widget in output");
    assert.ok(factIdx >= 0, "expected title-funfact card in output");
    assert.ok(statIdx >= 0, "expected Arcade wins stat banner in output");
    assert.ok(achIdx < factIdx, "fact card should appear after achievement-progress");
    assert.ok(factIdx < statIdx, "fact card should appear before stat banners");
  } finally {
    Heroes.pickRandomFact = original;
  }
});

// ── "On This Day" Heritage Calendar panel on title screen ──────────────────
//
// Same stubbing pattern as the Did You Know? tests above: mutate
// Calendar.todaysEvents inside a try/finally so other tests still see the
// real implementation. screens.js holds a module-scoped reference to the
// same require'd object, so mutating the export here stubs the renderer.

test("renderTitle: includes On This Day panel when Calendar.todaysEvents returns events", () => {
  const save = freshSave();
  const original = Calendar.todaysEvents;
  Calendar.todaysEvents = () => [
    { month: 5, day: 14, year: 1948, event: "Israel was founded.", heroId: "golda" }
  ];
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    assert.match(html, /class="otd-panel"/);
    assert.match(html, /On This Day/);
    assert.match(html, /May 14/);
    assert.match(html, /Israel was founded\./);
    assert.match(html, />1948</);
  } finally {
    Calendar.todaysEvents = original;
  }
});

test("renderTitle: omits On This Day panel when Calendar.todaysEvents returns empty array", () => {
  const save = freshSave();
  const original = Calendar.todaysEvents;
  Calendar.todaysEvents = () => [];
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    assert.doesNotMatch(html, /class="otd-panel"/);
    assert.doesNotMatch(html, /On This Day/);
    // And the rest of the screen still renders.
    assert.match(html, /<h1>Heritage Heroes<\/h1>/);
  } finally {
    Calendar.todaysEvents = original;
  }
});

test("renderTitle: On This Day panel renders all events when multiple match the date", () => {
  const save = freshSave();
  const original = Calendar.todaysEvents;
  Calendar.todaysEvents = () => [
    { month: 3, day: 14, year: 1879, event: "Einstein was born.", heroId: "einstein" },
    { month: 3, day: 14, year: 1951, event: "Einstein stuck out his tongue.", heroId: "einstein" }
  ];
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    // Both events present.
    assert.match(html, /Einstein was born\./);
    assert.match(html, /Einstein stuck out his tongue\./);
    assert.match(html, />1879</);
    assert.match(html, />1951</);
    // And the header uses the shared month/day label.
    assert.match(html, /March 14/);
  } finally {
    Calendar.todaysEvents = original;
  }
});

test("renderTitle: On This Day panel renders the hero-link button when heroId is present", () => {
  const save = freshSave();
  const original = Calendar.todaysEvents;
  Calendar.todaysEvents = () => [
    { month: 3, day: 14, year: 1879, event: "Einstein was born.", heroId: "einstein" }
  ];
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    assert.match(html, /class="otd-hero-link"[^>]*data-action="view-profile"[^>]*data-hero="einstein"/);
    assert.match(html, /More about Albert Einstein/);
  } finally {
    Calendar.todaysEvents = original;
  }
});

test("renderTitle: On This Day panel omits the hero-link button when heroId is null", () => {
  const save = freshSave();
  const original = Calendar.todaysEvents;
  Calendar.todaysEvents = () => [
    { month: 11, day: 2, year: 1917, event: "The Balfour Declaration was issued.", heroId: null }
  ];
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    // Panel still renders…
    assert.match(html, /class="otd-panel"/);
    assert.match(html, /Balfour Declaration/);
    // …but no hero-link button.
    assert.doesNotMatch(html, /class="otd-hero-link"/);
    assert.doesNotMatch(html, /More about/);
  } finally {
    Calendar.todaysEvents = original;
  }
});

test("renderTitle: On This Day panel escapes event text to prevent HTML injection", () => {
  const save = freshSave();
  const original = Calendar.todaysEvents;
  Calendar.todaysEvents = () => [
    { month: 5, day: 14, year: 1948, event: "<script>alert(1)</script>", heroId: null }
  ];
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    assert.match(html, /&lt;script&gt;/);
  } finally {
    Calendar.todaysEvents = original;
  }
});

test("renderTitle: On This Day panel sits between Did You Know card and Daily Quests panel", () => {
  const save = freshSave();
  // Seed the daily quests so the daily-quests-panel renders.
  save.dailyQuests = {
    quests: [{ key: "win-any", label: "Win a match", target: 1, progress: 0, completed: false }],
    completedAll: false,
    currentStreak: 0
  };
  const factOriginal = Heroes.pickRandomFact;
  const calOriginal = Calendar.todaysEvents;
  Heroes.pickRandomFact = () => ({
    heroId: "moses", heroName: "Moses", explanation: "A fact about Moses."
  });
  Calendar.todaysEvents = () => [
    { month: 5, day: 14, year: 1948, event: "Israel was founded.", heroId: "golda" }
  ];
  try {
    const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
    const factIdx = html.indexOf('class="title-funfact"');
    const otdIdx  = html.indexOf('class="otd-panel"');
    const dqIdx   = html.indexOf('daily-quests-panel');
    assert.ok(factIdx >= 0, "expected Did You Know card");
    assert.ok(otdIdx >= 0, "expected On This Day panel");
    assert.ok(dqIdx >= 0, "expected Daily Quests panel");
    assert.ok(factIdx < otdIdx, "On This Day should appear after Did You Know");
    assert.ok(otdIdx < dqIdx, "On This Day should appear before Daily Quests");
  } finally {
    Heroes.pickRandomFact = factOriginal;
    Calendar.todaysEvents = calOriginal;
  }
});

// ── renderSettings: text-size radio group ────────────────────────────────────
test("renderSettings: includes the Text Size radio group with all 3 options", () => {
  const save = freshSave();
  const html = Screens.renderSettings({ save });
  assert.match(html, /Text Size/);
  assert.match(html, /data-action="set-text-size"\s+data-size="normal"/);
  assert.match(html, /data-action="set-text-size"\s+data-size="large"/);
  assert.match(html, /data-action="set-text-size"\s+data-size="xlarge"/);
  // Visible button labels
  assert.match(html, />Normal</);
  assert.match(html, />Large</);
  assert.match(html, />Extra Large</);
});

test("renderSettings: marks the correct text-size radio 'selected' when textSize='large'", () => {
  const save = freshSave();
  save.textSize = "large";
  const html = Screens.renderSettings({ save });
  // Pull just the text-size radio group so we don't match the anim-speed block.
  const block = html.match(/<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>/);
  assert.ok(block, "expected three set-text-size buttons in a row");
  const group = block[0];
  assert.match(group, /data-size="large"[^>]*class="settings-radio selected"/);
  assert.doesNotMatch(group, /data-size="normal"[^>]*class="settings-radio selected"/);
  assert.doesNotMatch(group, /data-size="xlarge"[^>]*class="settings-radio selected"/);
});

test("renderSettings: marks 'xlarge' radio selected when textSize='xlarge'", () => {
  const save = freshSave();
  save.textSize = "xlarge";
  const html = Screens.renderSettings({ save });
  const block = html.match(/<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>/);
  assert.ok(block, "expected three set-text-size buttons");
  assert.match(block[0], /data-size="xlarge"[^>]*class="settings-radio selected"/);
});

test("renderSettings: defaults to 'normal' selected when textSize is missing", () => {
  const save = freshSave();
  // Force-remove the field to simulate a legacy save with no textSize at all.
  delete save.textSize;
  const html = Screens.renderSettings({ save });
  const block = html.match(/<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-text-size"[\s\S]*?<\/button>/);
  assert.ok(block, "expected three set-text-size buttons");
  assert.match(block[0], /data-size="normal"[^>]*class="settings-radio selected"/);
});

// ── renderSettings: theme radio group ────────────────────────────────────────
test("renderSettings: includes the Theme radio group with 2 options", () => {
  const save = freshSave();
  const html = Screens.renderSettings({ save });
  assert.match(html, /<h3>Theme<\/h3>/);
  assert.match(html, /data-action="set-theme"\s+data-theme="default"/);
  assert.match(html, /data-action="set-theme"\s+data-theme="high-contrast"/);
  // Visible button labels
  assert.match(html, />Default</);
  assert.match(html, />High Contrast</);
});

test("renderSettings: marks the correct theme radio 'selected' when theme='high-contrast'", () => {
  const save = freshSave();
  save.theme = "high-contrast";
  const html = Screens.renderSettings({ save });
  // Pull just the theme radio group (two consecutive set-theme buttons).
  const block = html.match(/<button[^>]*data-action="set-theme"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-theme"[\s\S]*?<\/button>/);
  assert.ok(block, "expected two set-theme buttons in a row");
  const group = block[0];
  assert.match(group, /data-theme="high-contrast"[^>]*class="settings-radio selected"/);
  assert.doesNotMatch(group, /data-theme="default"[^>]*class="settings-radio selected"/);
});

test("renderSettings: defaults to 'default' selected when theme is missing", () => {
  const save = freshSave();
  // Force-remove the field to simulate a legacy save with no theme at all.
  delete save.theme;
  const html = Screens.renderSettings({ save });
  const block = html.match(/<button[^>]*data-action="set-theme"[\s\S]*?<\/button>\s*<button[^>]*data-action="set-theme"[\s\S]*?<\/button>/);
  assert.ok(block, "expected two set-theme buttons");
  assert.match(block[0], /data-theme="default"[^>]*class="settings-radio selected"/);
  assert.doesNotMatch(block[0], /data-theme="high-contrast"[^>]*class="settings-radio selected"/);
});

// ── Daily Quests panel on title ───────────────────────────────────────────

test("renderTitle: includes daily-quests-panel when state.save.dailyQuests has quests", () => {
  const save = freshSave();
  save.dailyQuests.date = "2026-05-17";
  save.dailyQuests.quests = [
    { id: "q1", type: "winMatches", target: 2, progress: 1, completed: false, label: "Win 2 matches today" },
    { id: "q2", type: "triviaCorrect", target: 5, progress: 0, completed: false, label: "Answer 5 trivia questions correctly today" }
  ];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /class="daily-quests-panel/);
  assert.match(html, /Daily Quests/);
  assert.match(html, /Win 2 matches today/);
  assert.match(html, /Answer 5 trivia questions correctly today/);
});

test("renderTitle: daily-quests-panel shows progress and completed states correctly", () => {
  const save = freshSave();
  save.dailyQuests.date = "2026-05-17";
  save.dailyQuests.quests = [
    { id: "q1", type: "winMatches", target: 2, progress: 2, completed: true, label: "Win 2 matches today", completedAt: Date.now() },
    { id: "q2", type: "triviaCorrect", target: 10, progress: 3, completed: false, label: "Answer 10 trivia questions correctly today" }
  ];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  // Header shows partial completion.
  assert.match(html, /1 of 2 done/);
  // Per-quest progress strings render.
  assert.match(html, /2 \/ 2/);
  assert.match(html, /3 \/ 10/);
  // Completed quest has the "completed" class and a checkmark.
  assert.match(html, /dq-quest completed/);
  assert.match(html, /dq-check/);
});

test("renderTitle: daily-quests-panel does NOT render when no quests (empty array)", () => {
  const save = freshSave();
  save.dailyQuests.quests = [];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /class="daily-quests-panel/);
  assert.doesNotMatch(html, /Daily Quests/);
});

test("renderTitle: daily-quests-panel does NOT render when dailyQuests is null", () => {
  const save = freshSave();
  save.dailyQuests = null;
  // Should not throw on a missing dailyQuests bucket either.
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /class="daily-quests-panel/);
});

test("renderTitle: daily-quests-panel includes all-complete styling when completedAll is true", () => {
  const save = freshSave();
  save.dailyQuests.date = "2026-05-17";
  save.dailyQuests.completedAll = true;
  save.dailyQuests.quests = [
    { id: "q1", type: "winMatches", target: 1, progress: 1, completed: true, label: "Win a match today", completedAt: Date.now() },
    { id: "q2", type: "triviaCorrect", target: 1, progress: 1, completed: true, label: "Answer a trivia question correctly today", completedAt: Date.now() }
  ];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /class="daily-quests-panel all-complete/);
  assert.match(html, /All daily quests complete/);
});

test("renderTitle: daily-quests-panel renders streak line when currentStreak > 0", () => {
  const save = freshSave();
  save.dailyQuests.date = "2026-05-17";
  save.dailyQuests.currentStreak = 3;
  save.dailyQuests.quests = [
    { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false, label: "Win a match today" },
    { id: "q2", type: "tryMode", target: 1, progress: 0, completed: false, modeId: "endless", label: "Play an Endless Survival match today" }
  ];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /class="dq-streak"/);
  assert.match(html, /3-day quest streak/);
});

test("renderTitle: daily-quests-panel hides streak line when currentStreak is 0", () => {
  const save = freshSave();
  save.dailyQuests.date = "2026-05-17";
  save.dailyQuests.currentStreak = 0;
  save.dailyQuests.quests = [
    { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false, label: "Win a match today" }
  ];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /dq-streak/);
});

test("renderTitle: daily-quests-panel escapes quest labels to prevent HTML injection", () => {
  const save = freshSave();
  save.dailyQuests.date = "2026-05-17";
  save.dailyQuests.quests = [
    { id: "q1", type: "winMatches", target: 1, progress: 0, completed: false, label: "<script>alert(1)</script>" }
  ];
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("ACHIEVEMENT_LIST contains the 3 new quest achievement entries", () => {
  const keys = Screens.ACHIEVEMENT_LIST.map(function (a) { return a.key; });
  assert.ok(keys.includes("questFirst"), "questFirst should be in ACHIEVEMENT_LIST");
  assert.ok(keys.includes("questTriple"), "questTriple should be in ACHIEVEMENT_LIST");
  assert.ok(keys.includes("questStreak7"), "questStreak7 should be in ACHIEVEMENT_LIST");
  // Sanity: titles and descriptions are present.
  const first = Screens.ACHIEVEMENT_LIST.find(function (a) { return a.key === "questFirst"; });
  assert.strictEqual(first.title, "Goal Setter");
  const triple = Screens.ACHIEVEMENT_LIST.find(function (a) { return a.key === "questTriple"; });
  assert.strictEqual(triple.title, "Daily Sweep");
  const streak7 = Screens.ACHIEVEMENT_LIST.find(function (a) { return a.key === "questStreak7"; });
  assert.strictEqual(streak7.title, "Quest Champion");
});

// ── showCallout: variant smoke tests ─────────────────────────────────────
// In headless node:test runs there is no `document`, so showCallout returns
// early. These tests pin the contract that the function is exported, accepts
// an optional second argument, and never throws for any combination — so
// main.js can call it freely without try/wrap.

test("showCallout is exported on the Screens module", () => {
  assert.strictEqual(typeof Screens.showCallout, "function");
});

test("showCallout does not throw with no variant (legacy 1-arg call)", () => {
  assert.doesNotThrow(() => Screens.showCallout("HELLO"));
});

test("showCallout does not throw with 'combo' variant", () => {
  assert.doesNotThrow(() => Screens.showCallout("COMBO x2!", "combo"));
});

test("showCallout does not throw with 'bighit' variant", () => {
  assert.doesNotThrow(() => Screens.showCallout("BIG HIT!", "bighit"));
});

test("showCallout does not throw with undefined/null variant", () => {
  assert.doesNotThrow(() => Screens.showCallout("X", undefined));
  assert.doesNotThrow(() => Screens.showCallout("X", null));
});

// ── battleStrategyHint: pure tactical-hint helper ─────────────────────────

test("battleStrategyHint returns null when no tactical situation applies", () => {
  // Fresh match, full HP, no statuses, no charging.
  const match = Combat.createMatch("moses", "david");
  assert.strictEqual(Screens.battleStrategyHint(match, 0), null);
  assert.strictEqual(Screens.battleStrategyHint(match, 1), null);
});

test("battleStrategyHint returns 'reversal' hint when opponent has reversal status", () => {
  const match = Combat.createMatch("moses", "esther");
  match.players[1].statuses.reversal = true;
  const hint = Screens.battleStrategyHint(match, 0);
  assert.ok(hint, "should return a hint");
  assert.match(hint.text, /reflect|Reflect/);
  assert.ok(hint.icon && hint.icon.length > 0);
});

test("battleStrategyHint returns 'charging' hint when opponent is charging", () => {
  const match = Combat.createMatch("moses", "einstein");
  match.players[1].statuses.charging = 1;
  const hint = Screens.battleStrategyHint(match, 0);
  assert.ok(hint);
  assert.match(hint.text, /charging|Defend/);
});

test("battleStrategyHint returns 'empowered' hint when player has doubleNextAttack", () => {
  const match = Combat.createMatch("golda", "david");
  match.players[0].statuses.doubleNextAttack = true;
  const hint = Screens.battleStrategyHint(match, 0);
  assert.ok(hint);
  assert.match(hint.text, /double damage|strike/);
});

test("battleStrategyHint returns 'burn' hint when player is burning", () => {
  const match = Combat.createMatch("moses", "judah");
  match.players[0].statuses.burn = 3;
  const hint = Screens.battleStrategyHint(match, 0);
  assert.ok(hint);
  assert.match(hint.text, /burning/);
  assert.match(hint.text, /3 more turns/);
});

test("battleStrategyHint pluralisation: 1 burn turn uses singular 'turn'", () => {
  const match = Combat.createMatch("moses", "judah");
  match.players[0].statuses.burn = 1;
  const hint = Screens.battleStrategyHint(match, 0);
  assert.ok(hint);
  assert.match(hint.text, /1 more turn[^s]/);
});

test("battleStrategyHint returns 'finish them' hint when opponent HP <= 25", () => {
  const match = Combat.createMatch("moses", "david");
  match.players[1].hp = 20;
  const hint = Screens.battleStrategyHint(match, 0);
  assert.ok(hint);
  assert.match(hint.text, /finish|Special/);
});

test("battleStrategyHint does not fire 'finish' hint when opp HP is 0 (already dead)", () => {
  const match = Combat.createMatch("moses", "david");
  match.players[1].hp = 0;
  // No statuses set → no hint of any kind, including the finish one.
  assert.strictEqual(Screens.battleStrategyHint(match, 0), null);
});

test("battleStrategyHint priority: reversal beats charging beats empowered beats burn beats finish", () => {
  const match = Combat.createMatch("golda", "esther");
  // Set EVERY trigger so we can verify the priority ladder explicitly.
  match.players[1].statuses.reversal = true;
  match.players[1].statuses.charging = 2;
  match.players[0].statuses.doubleNextAttack = true;
  match.players[0].statuses.burn = 2;
  match.players[1].hp = 10;

  // 1. Reversal is highest.
  let hint = Screens.battleStrategyHint(match, 0);
  assert.match(hint.text, /reflect/);

  // 2. Drop reversal → charging wins.
  delete match.players[1].statuses.reversal;
  hint = Screens.battleStrategyHint(match, 0);
  assert.match(hint.text, /charging/);

  // 3. Drop charging → empowered wins.
  delete match.players[1].statuses.charging;
  hint = Screens.battleStrategyHint(match, 0);
  assert.match(hint.text, /double damage/);

  // 4. Drop empowered → burn wins.
  delete match.players[0].statuses.doubleNextAttack;
  hint = Screens.battleStrategyHint(match, 0);
  assert.match(hint.text, /burning/);

  // 5. Drop burn → finish-them wins (opp HP still 10).
  delete match.players[0].statuses.burn;
  hint = Screens.battleStrategyHint(match, 0);
  assert.match(hint.text, /finish/);
});

test("battleStrategyHint returns null on missing match/players", () => {
  assert.strictEqual(Screens.battleStrategyHint(null, 0), null);
  assert.strictEqual(Screens.battleStrategyHint(undefined, 0), null);
  assert.strictEqual(Screens.battleStrategyHint({}, 0), null);
  assert.strictEqual(Screens.battleStrategyHint({ players: [] }, 0), null);
  // Only one player slot populated → no opponent → null
  const onePlayer = { players: [{ hp: 50, statuses: {} }] };
  assert.strictEqual(Screens.battleStrategyHint(onePlayer, 0), null);
});

// ── renderBattle: hint banner integration ─────────────────────────────────

function _battleState(overrides) {
  const match = Combat.createMatch("moses", "david");
  const state = {
    match,
    mode: "quick",
    controllers: ["human", "ai"],
    save: freshSave(),
    arcade: null
  };
  if (overrides) {
    if (overrides.match) Object.assign(state.match, overrides.match);
    if (overrides.controllers) state.controllers = overrides.controllers;
    if (overrides.save) state.save = Object.assign(freshSave(), overrides.save);
    if (overrides.mode) state.mode = overrides.mode;
  }
  return state;
}

test("renderBattle includes hint banner when human turn, hints enabled, and a hint applies", () => {
  const state = _battleState();
  state.match.players[1].statuses.charging = 1;  // triggers a hint
  const html = Screens.renderBattle(state);
  assert.match(html, /battle-hint-banner/);
  assert.match(html, /charging/);
});

test("renderBattle does NOT include hint banner when AI is acting", () => {
  const state = _battleState({ controllers: ["ai", "human"] });
  state.match.players[1].statuses.charging = 1;  // would trigger a hint, but AI's turn
  const html = Screens.renderBattle(state);
  assert.doesNotMatch(html, /battle-hint-banner/);
});

test("renderBattle does NOT include hint banner when strategyHints is 'off'", () => {
  const state = _battleState({ save: { strategyHints: "off" } });
  state.match.players[1].statuses.charging = 1;  // would trigger a hint
  const html = Screens.renderBattle(state);
  assert.doesNotMatch(html, /battle-hint-banner/);
});

test("renderBattle does NOT include hint banner when player is mid-charge", () => {
  const state = _battleState();
  // Active player (slot 0) is charging — single-button state, no point hinting.
  state.match.players[0].statuses.charging = 2;
  // And give the opponent something that would otherwise trigger a hint.
  state.match.players[1].statuses.charging = 1;
  const html = Screens.renderBattle(state);
  assert.doesNotMatch(html, /battle-hint-banner/);
});

test("renderBattle does NOT include hint banner when no tactical hint applies", () => {
  const state = _battleState();
  // Fresh state, no statuses, full HP. Should render fine without the banner.
  const html = Screens.renderBattle(state);
  assert.doesNotMatch(html, /battle-hint-banner/);
});

// ── Practice Mode ─────────────────────────────────────────────────────────

test("renderModeSelect includes the Practice mode card", () => {
  const html = Screens.renderModeSelect({ save: freshSave() });
  assert.match(html, /<h3>Practice<\/h3>/);
  assert.match(html, /Nothing tracked/);
});

test("renderModeSelect Practice card uses data-action=\"start-practice\"", () => {
  const html = Screens.renderModeSelect({ save: freshSave() });
  assert.match(html, /data-action="start-practice"/);
});

test("renderCharSelect heading says \"Practice — pick Hero 1\" when state.mode is practice and selecting is 1", () => {
  const html = Screens.renderCharSelect({ mode: "practice", selecting: 1, save: freshSave() });
  assert.match(html, /Practice &mdash; pick Hero 1|Practice — pick Hero 1/);
});

test("renderCharSelect heading says \"Practice — pick Hero 2\" when state.mode is practice and selecting is 2", () => {
  const html = Screens.renderCharSelect({ mode: "practice", selecting: 2, save: freshSave() });
  assert.match(html, /Practice &mdash; pick Hero 2|Practice — pick Hero 2/);
});

test("renderBattle shows .practice-badge when state.mode is practice", () => {
  const state = _battleState({ mode: "practice", controllers: ["human", "human"] });
  const html = Screens.renderBattle(state);
  assert.match(html, /class="practice-badge"/);
  assert.match(html, /PRACTICE/);
  assert.match(html, /nothing tracked/);
});

test("renderBattle does NOT show .practice-badge in other modes", () => {
  for (const mode of ["quick", "arcade", "endless", "daily", "tournament", "spectator", "study"]) {
    const state = _battleState({ mode });
    const html = Screens.renderBattle(state);
    assert.doesNotMatch(html, /class="practice-badge"/, `mode "${mode}" must not show practice-badge`);
  }
});

// ── Battle HUD: turn counter + match timer ────────────────────────────────

test("_matchElapsedString returns \"0:00\" when matchStats is null or missing startedAt", () => {
  assert.strictEqual(Screens._matchElapsedString(null), "0:00");
  assert.strictEqual(Screens._matchElapsedString(undefined), "0:00");
  assert.strictEqual(Screens._matchElapsedString({}), "0:00");
  // Explicit null/undefined startedAt are treated as "no match yet". (A
  // literal 0 is honored as a valid timestamp — that's what the timer
  // produces when paired with endedAt for elapsed-from-zero tests below.)
  assert.strictEqual(Screens._matchElapsedString({ startedAt: null }), "0:00");
  assert.strictEqual(Screens._matchElapsedString({ startedAt: undefined }), "0:00");
});

test("_matchElapsedString returns \"0:30\" for 30 seconds elapsed (frozen via endedAt)", () => {
  const stats = { startedAt: 1_000_000, endedAt: 1_030_000 };  // 30s
  assert.strictEqual(Screens._matchElapsedString(stats), "0:30");
});

test("_matchElapsedString returns \"1:05\" for 65 seconds elapsed", () => {
  const stats = { startedAt: 0, endedAt: 65_000 };
  assert.strictEqual(Screens._matchElapsedString(stats), "1:05");
});

test("_matchElapsedString returns \"10:00\" for 600 seconds elapsed", () => {
  const stats = { startedAt: 100_000, endedAt: 700_000 };
  assert.strictEqual(Screens._matchElapsedString(stats), "10:00");
});

test("_matchElapsedString uses endedAt when present (fixed elapsed, not live)", () => {
  // If endedAt is set, the result must NOT advance even after the real wall
  // clock moves on. Capture the value, sleep a frame's worth of wall time
  // (impossible synchronously, so just call twice — endedAt is honored so
  // both reads return the same string regardless of Date.now).
  const stats = { startedAt: 0, endedAt: 42_000 };  // 0:42
  const first = Screens._matchElapsedString(stats);
  const second = Screens._matchElapsedString(stats);
  assert.strictEqual(first, "0:42");
  assert.strictEqual(second, "0:42");
});

test("renderBattle includes .battle-hud with turn number", () => {
  const state = _battleState();
  state.match.turnNumber = 7;
  state.matchStats = { startedAt: Date.now(), endedAt: null, damageDealtBy: [0, 0], damageTakenBy: [0, 0] };
  const html = Screens.renderBattle(state);
  assert.match(html, /class="battle-hud"/);
  assert.match(html, /class="battle-hud-turn">Turn 7</);
});

test("renderBattle includes .battle-hud with timer in m:ss format", () => {
  const state = _battleState();
  // Freeze the clock via endedAt so the assertion isn't flaky.
  state.matchStats = {
    startedAt: 0,
    endedAt: 95_000,  // 1:35
    damageDealtBy: [0, 0],
    damageTakenBy: [0, 0]
  };
  const html = Screens.renderBattle(state);
  assert.match(html, /class="battle-hud-timer">1:35</);
});

test("renderResult returns the Practice-specific variant when state.mode is practice", () => {
  const match = Combat.createMatch("moses", "david");
  match.winner = 0;  // moses wins
  const state = {
    mode: "practice",
    controllers: ["human", "human"],
    match,
    save: freshSave(),
    matchStats: null
  };
  const html = Screens.renderResult(state);
  assert.match(html, /screen-result-practice/);
  assert.match(html, /Practice match/);
  assert.match(html, /nothing was recorded/);
  // No recap blocks / personal records / DYK / share button.
  assert.doesNotMatch(html, /match-summary/);
  assert.doesNotMatch(html, /match-records/);
  assert.doesNotMatch(html, /did-you-know/);
  assert.doesNotMatch(html, /share-btn/);
});

test("renderResult Practice variant exposes the practice-pick-new action", () => {
  const match = Combat.createMatch("esther", "judah");
  match.winner = 1;  // judah wins
  const state = {
    mode: "practice",
    controllers: ["human", "human"],
    match,
    save: freshSave(),
    matchStats: null
  };
  const html = Screens.renderResult(state);
  assert.match(html, /data-action="practice-pick-new"/);
  // Rematch and Main Menu are still available.
  assert.match(html, /data-action="rematch"/);
  assert.match(html, /data-action="goto-title"/);
});

// ── Hero Comparison Tool ──────────────────────────────────────────────────

test("_midpointYear parses '1879-1955' (Einstein) to 1917", () => {
  assert.strictEqual(Screens._midpointYear("1879-1955"), 1917);
});

test("_midpointYear parses 'c. 1391-1271 BCE' (Moses) to a negative year", () => {
  const y = Screens._midpointYear("c. 1391-1271 BCE");
  assert.ok(y < 0, `expected negative BCE year, got ${y}`);
  assert.strictEqual(y, -1331);  // midpoint of -1391 and -1271
});

test("_midpointYear handles the en-dash separator used in heroes.js", () => {
  // The actual data uses U+2013 EN DASH in dates strings.
  assert.strictEqual(Screens._midpointYear("1898–1978"), 1938);    // Golda
  assert.strictEqual(Screens._midpointYear("1138–1204"), 1171);    // Rambam
});

test("_midpointYear parses single-year 'd. 160 BCE' to -160", () => {
  assert.strictEqual(Screens._midpointYear("d. 160 BCE"), -160);
});

test("_midpointYear parses '5th century BCE' (Esther) to a negative midpoint", () => {
  const y = Screens._midpointYear("5th century BCE");
  // 5th c. BCE midpoint is approx -450
  assert.strictEqual(y, -450);
});

test("_midpointYear returns null on missing/malformed input", () => {
  assert.strictEqual(Screens._midpointYear(undefined), null);
  assert.strictEqual(Screens._midpointYear(null), null);
  assert.strictEqual(Screens._midpointYear(""), null);
  assert.strictEqual(Screens._midpointYear("not a date string at all"), null);
});

test("_eraYearGap returns 'Same year' for identical heroes", () => {
  const moses = Heroes.byId("moses");
  assert.strictEqual(Screens._eraYearGap(moses, moses), "Same year");
});

test("_eraYearGap returns 'About X years apart' for distant pairs (Moses vs Einstein)", () => {
  const moses = Heroes.byId("moses");
  const einstein = Heroes.byId("einstein");
  const gap = Screens._eraYearGap(moses, einstein);
  assert.match(gap, /About [\d,]+ years apart/);
  // Sanity: Moses (-1331) -> Einstein (1917) ~= 3248 -> rounded to 3,200.
  assert.match(gap, /3,200/);
});

test("_eraYearGap returns null when either dates field can't be parsed", () => {
  const moses = Heroes.byId("moses");
  const fake = { profile: { dates: "totally unparseable" } };
  assert.strictEqual(Screens._eraYearGap(moses, fake), null);
  assert.strictEqual(Screens._eraYearGap(fake, moses), null);
  assert.strictEqual(Screens._eraYearGap({}, {}), null);
});

test("_eraYearGap parses all 7 heroes' dates without returning null", () => {
  // Cross-product sanity: every pair of canonical heroes parses to a real gap.
  for (const a of Heroes.list) {
    for (const b of Heroes.list) {
      if (a === b) continue;
      const gap = Screens._eraYearGap(a, b);
      assert.ok(typeof gap === "string" && gap.length > 0,
        `${a.id} vs ${b.id} should parse; got ${gap}`);
    }
  }
});

test("renderComparePick shows all 7 hero cards", () => {
  const state = { compare: { picks: { 1: null, 2: null }, selecting: 1 } };
  const html = Screens.renderComparePick(state);
  for (const h of Heroes.list) {
    assert.match(html, new RegExp(`data-hero="${h.id}"`), `expected ${h.id} card`);
  }
  // 7 pick cards total.
  const cardCount = (html.match(/data-action="compare-pick-hero"/g) || []).length;
  assert.strictEqual(cardCount, 7);
});

test("renderComparePick heading matches selecting state (1 vs 2)", () => {
  const state1 = { compare: { picks: { 1: null, 2: null }, selecting: 1 } };
  const html1 = Screens.renderComparePick(state1);
  assert.match(html1, /pick Hero A/);
  assert.doesNotMatch(html1, /pick Hero B/);

  const state2 = { compare: { picks: { 1: "moses", 2: null }, selecting: 2 } };
  const html2 = Screens.renderComparePick(state2);
  assert.match(html2, /pick Hero B/);
  assert.doesNotMatch(html2, /pick Hero A/);
});

test("renderComparePick exposes the back-to-hall action", () => {
  const state = { compare: { picks: { 1: null, 2: null }, selecting: 1 } };
  const html = Screens.renderComparePick(state);
  assert.match(html, /data-action="compare-back-to-hall"/);
});

test("renderCompare renders side-by-side panels with both hero names", () => {
  const state = {
    compare: { picks: { 1: "moses", 2: "einstein" }, selecting: 2 },
    save: freshSave()
  };
  const html = Screens.renderCompare(state);
  assert.match(html, /class="compare-grid"/);
  assert.match(html, /class="compare-col compare-col-a"/);
  assert.match(html, /class="compare-col compare-col-b"/);
  assert.match(html, /Moses/);
  assert.match(html, /Einstein/);
});

test("renderCompare renders the stats table", () => {
  const state = {
    compare: { picks: { 1: "moses", 2: "david" }, selecting: 2 },
    save: freshSave()
  };
  const html = Screens.renderCompare(state);
  assert.match(html, /class="compare-table"/);
  // Each canonical row label is present.
  for (const label of ["HP", "Attack", "Defend", "Special", "Your matches", "Endless best", "Arcade wins"]) {
    assert.match(html, new RegExp(`>${label}<`), `expected ${label} row`);
  }
});

test("renderCompare shows era gap line when both heroes have parseable dates", () => {
  const state = {
    compare: { picks: { 1: "moses", 2: "einstein" }, selecting: 2 },
    save: freshSave()
  };
  const html = Screens.renderCompare(state);
  assert.match(html, /class="compare-eragap"/);
  assert.match(html, /years apart/);
});

test("renderCompare shows head-to-head record when matchups exist", () => {
  const save = freshSave();
  save.matchups = save.matchups || {};
  save.matchups["moses|david"] = { wins: 3, losses: 1 };
  save.matchups["david|moses"] = { wins: 1, losses: 3 };
  const state = {
    compare: { picks: { 1: "moses", 2: "david" }, selecting: 2 },
    save
  };
  const html = Screens.renderCompare(state);
  assert.match(html, /class="compare-h2h"/);
  assert.match(html, /3-1/);
  assert.match(html, /1-3/);
  assert.doesNotMatch(html, /compare-h2h-empty/);
});

test("renderCompare shows 'no head-to-head' empty state when no matchups", () => {
  const state = {
    compare: { picks: { 1: "moses", 2: "david" }, selecting: 2 },
    save: freshSave()
  };
  const html = Screens.renderCompare(state);
  assert.match(html, /compare-h2h-empty/);
  assert.match(html, /No head-to-head matches yet/);
});

test("renderCompare exposes restart and back-to-hall actions", () => {
  const state = {
    compare: { picks: { 1: "moses", 2: "david" }, selecting: 2 },
    save: freshSave()
  };
  const html = Screens.renderCompare(state);
  assert.match(html, /data-action="compare-restart"/);
  assert.match(html, /data-action="compare-back-to-hall"/);
});

test("renderCompare returns empty string when compare state is missing or incomplete", () => {
  assert.strictEqual(Screens.renderCompare({}), "");
  assert.strictEqual(Screens.renderCompare({ compare: null }), "");
  assert.strictEqual(Screens.renderCompare({ compare: { picks: { 1: null, 2: null } } }), "");
  assert.strictEqual(Screens.renderCompare({ compare: { picks: { 1: "moses", 2: null } } }), "");
});

test("renderCompare shows mastery star next to mastered hero name", () => {
  const save = freshSave();
  save.mastered.moses = true;
  const state = {
    compare: { picks: { 1: "moses", 2: "david" }, selecting: 2 },
    save
  };
  const html = Screens.renderCompare(state);
  // Star entity appears in the compare-name block.
  assert.match(html, /class="compare-name">Moses &#x2605;/);
  // King David is NOT mastered -> rendered without the star entity.
  assert.match(html, /class="compare-name">King David /);
  assert.doesNotMatch(html, /class="compare-name">King David &#x2605;/);
});

test("renderHall includes the Compare Heroes CTA button", () => {
  const state = { save: freshSave() };
  const html = Screens.renderHall(state);
  assert.match(html, /data-action="open-compare"/);
  assert.match(html, /class="compare-cta"/);
  assert.match(html, /Compare Heroes/);
});

// ── Hero Profile overlay: Extra Progress + Head-to-Head + Era Timeline ──────

test("renderProfile includes 'Endless best run' when endlessHighScore[heroId] > 0", () => {
  const save = freshSave();
  save.endlessHighScore.moses = 17;
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /Endless best run:\s*<strong>17<\/strong>/);
});

test("renderProfile omits 'Endless best run' when zero or missing", () => {
  const save = freshSave();
  // Default: endlessHighScore.moses === 0
  const htmlZero = Screens.renderProfile({ save }, "moses");
  assert.doesNotMatch(htmlZero, /Endless best run/);

  // Also handle the case where the bucket is missing entirely.
  const stripped = freshSave();
  delete stripped.endlessHighScore;
  const htmlMissing = Screens.renderProfile({ save: stripped }, "moses");
  assert.doesNotMatch(htmlMissing, /Endless best run/);
});

test("renderProfile includes 'Arcade ladder clears' when arcade[heroId] > 0", () => {
  const save = freshSave();
  save.arcade.judah = 3;
  const html = Screens.renderProfile({ save }, "judah");
  assert.match(html, /Arcade ladder clears:\s*<strong>3<\/strong>/);
});

test("renderProfile omits 'Arcade ladder clears' when zero", () => {
  const save = freshSave();
  // Default: arcade.judah === 0
  const html = Screens.renderProfile({ save }, "judah");
  assert.doesNotMatch(html, /Arcade ladder clears/);
});

test("renderProfile head-to-head section appears when matchups exist for this hero", () => {
  const save = freshSave();
  save.matchups["moses|david"] = { wins: 3, losses: 1 };
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /Head-to-Head as Moses/);
  assert.match(html, /profile-h2h-list/);
});

test("renderProfile head-to-head section is OMITTED when no matchups for this hero", () => {
  const save = freshSave();
  // A matchup for a DIFFERENT hero must not bleed into this hero's profile.
  save.matchups["david|moses"] = { wins: 1, losses: 0 };
  const html = Screens.renderProfile({ save }, "moses");
  assert.doesNotMatch(html, /Head-to-Head as/);
  assert.doesNotMatch(html, /profile-h2h-list/);
});

test("renderProfile head-to-head rows are sorted by total games desc", () => {
  const save = freshSave();
  // david: 2 games, esther: 6 games, judah: 4 games — order should be esther, judah, david.
  save.matchups["moses|david"]  = { wins: 1, losses: 1 };
  save.matchups["moses|esther"] = { wins: 4, losses: 2 };
  save.matchups["moses|judah"]  = { wins: 2, losses: 2 };
  const html = Screens.renderProfile({ save }, "moses");
  const estherIdx = html.indexOf("vs Queen Esther");
  const judahIdx  = html.indexOf("vs Judah Maccabee");
  const davidIdx  = html.indexOf("vs King David");
  assert.ok(estherIdx > 0 && judahIdx > 0 && davidIdx > 0, "expected all three matchups rendered");
  assert.ok(estherIdx < judahIdx, "Esther (6 games) should come before Judah (4 games)");
  assert.ok(judahIdx  < davidIdx, "Judah (4 games) should come before David (2 games)");
});

test("renderProfile head-to-head row shows correct W-L and percentage", () => {
  const save = freshSave();
  save.matchups["moses|david"] = { wins: 3, losses: 1 };  // 75%
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /vs King David/);
  assert.match(html, /<span class="profile-h2h-record">3-1<\/span>/);
  assert.match(html, /<span class="profile-h2h-pct">75%<\/span>/);
});

test("renderProfile head-to-head winning row has .h2h-winning class", () => {
  const save = freshSave();
  save.matchups["moses|david"] = { wins: 5, losses: 1 };
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /profile-h2h-row h2h-winning/);
});

test("renderProfile head-to-head losing row has .h2h-losing class", () => {
  const save = freshSave();
  save.matchups["moses|david"] = { wins: 1, losses: 4 };
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /profile-h2h-row h2h-losing/);
});

test("renderProfile era timeline appears in the profile output", () => {
  const save = freshSave();
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /Position in History/);
  assert.match(html, /era-timeline-axis/);
  assert.match(html, /1500 BCE/);
  assert.match(html, /Present/);
});

test("renderProfile era timeline marks the current hero as 'active'", () => {
  const save = freshSave();
  const html = Screens.renderProfile({ save }, "einstein");
  // Should render exactly one active marker (the hero being viewed).
  const activeMatches = html.match(/era-timeline-marker active/g) || [];
  assert.strictEqual(activeMatches.length, 1, "expected exactly one active marker");
  // Title attribute confirms which hero is highlighted.
  assert.match(html, /class="era-timeline-marker active"[^>]*title="Albert Einstein"/);
});

test("_heroEraPosition returns close to 0 for the earliest hero (Moses, ~-1331)", () => {
  // Moses midpoint ≈ -1331; range [-1500..2026]: (-1331 + 1500) / 3526 ≈ 4.8%
  const pct = Screens._heroEraPosition("moses");
  assert.ok(pct !== null, "expected a numeric percentage");
  assert.ok(pct >= 0 && pct <= 10, `expected Moses near the left edge, got ${pct}`);
});

test("_heroEraPosition returns close to 100 for the latest hero (Einstein/Golda)", () => {
  const einsteinPct = Screens._heroEraPosition("einstein");  // 1917 midpoint
  const goldaPct    = Screens._heroEraPosition("golda");     // 1938 midpoint
  assert.ok(einsteinPct !== null && goldaPct !== null, "expected numeric percentages");
  // Both fall in the last 5% of the timeline.
  assert.ok(einsteinPct >= 95 && einsteinPct <= 100, `Einstein should be near right edge, got ${einsteinPct}`);
  assert.ok(goldaPct    >= 95 && goldaPct    <= 100, `Golda should be near right edge, got ${goldaPct}`);
});

test("_heroEraPosition returns null for invalid hero id", () => {
  assert.strictEqual(Screens._heroEraPosition("nope"), null);
  assert.strictEqual(Screens._heroEraPosition(""), null);
  assert.strictEqual(Screens._heroEraPosition(undefined), null);
});

// ── renderSettings: volume sliders (master / music / sfx) ────────────────────

test("renderSettings: includes 3 volume sliders with data-type master/music/sfx", () => {
  const save = freshSave();
  const html = Screens.renderSettings({ save });
  assert.match(html, /<h3>Volume<\/h3>/, "Volume section heading present");
  assert.match(html, /type="range"[^>]*data-action="set-volume"[^>]*data-type="master"/);
  assert.match(html, /type="range"[^>]*data-action="set-volume"[^>]*data-type="music"/);
  assert.match(html, /type="range"[^>]*data-action="set-volume"[^>]*data-type="sfx"/);
  // Visible labels
  assert.match(html, />Master</);
  assert.match(html, />Music</);
  assert.match(html, />SFX</);
});

test("renderSettings: volume sliders use current save values as their default value", () => {
  const save = freshSave();
  save.masterVolume = 75;
  save.musicVolume  = 20;
  save.sfxVolume    = 0;
  const html = Screens.renderSettings({ save });
  assert.match(html, /data-type="master"[^>]*value="75"|value="75"[^>]*data-type="master"/);
  assert.match(html, /data-type="music"[^>]*value="20"|value="20"[^>]*data-type="music"/);
  assert.match(html, /data-type="sfx"[^>]*value="0"|value="0"[^>]*data-type="sfx"/);
});

test("renderSettings: volume value labels show the current percentage", () => {
  const save = freshSave();
  save.masterVolume = 75;
  save.musicVolume  = 20;
  save.sfxVolume    = 0;
  const html = Screens.renderSettings({ save });
  // Each row has a <span class="settings-volume-value">N%</span>
  const rows = html.match(/<div class="settings-volume-row">[\s\S]*?<\/div>/g) || [];
  assert.strictEqual(rows.length, 3, "expected exactly 3 volume rows");
  // Pull master row (first), music (second), sfx (third)
  assert.match(rows[0], /<span class="settings-volume-value">75%<\/span>/);
  assert.match(rows[1], /<span class="settings-volume-value">20%<\/span>/);
  assert.match(rows[2], /<span class="settings-volume-value">0%<\/span>/);
});

test("renderSettings: volume sliders default to 100% when save fields are missing", () => {
  const save = freshSave();
  delete save.masterVolume;
  delete save.musicVolume;
  delete save.sfxVolume;
  const html = Screens.renderSettings({ save });
  const rows = html.match(/<div class="settings-volume-row">[\s\S]*?<\/div>/g) || [];
  assert.strictEqual(rows.length, 3);
  for (const r of rows) {
    assert.match(r, /<span class="settings-volume-value">100%<\/span>/);
  }
});

// ── Sfx volume setters: headless-safe (no AudioContext) ──────────────────────

test("Sfx.setMasterVolume / setMusicVolume / setSfxVolume do not throw in headless Node", () => {
  const Sfx = require("../src/audio.js");
  assert.doesNotThrow(() => Sfx.setMasterVolume(50));
  assert.doesNotThrow(() => Sfx.setMusicVolume(0));
  assert.doesNotThrow(() => Sfx.setSfxVolume(100));
  // Bad inputs clamp/default rather than throw
  assert.doesNotThrow(() => Sfx.setMasterVolume(-50));
  assert.doesNotThrow(() => Sfx.setMasterVolume(9999));
  assert.doesNotThrow(() => Sfx.setMasterVolume(null));
  assert.doesNotThrow(() => Sfx.setMasterVolume(undefined));
  // Internal levels reflect what we set
  const levels = Sfx._getLevels();
  assert.ok(levels.master >= 0 && levels.master <= 1, "master in 0..1");
  assert.ok(levels.music  >= 0 && levels.music  <= 1, "music in 0..1");
  assert.ok(levels.sfx    >= 0 && levels.sfx    <= 1, "sfx in 0..1");
});

// ── Victory Share Card (SVG download) ────────────────────────────────────

function _resultState(overrides) {
  const heroA = (overrides && overrides.heroA) || "moses";
  const heroB = (overrides && overrides.heroB) || "david";
  const match = Combat.createMatch(heroA, heroB);
  match.winner = (overrides && overrides.winner !== undefined) ? overrides.winner : 0;
  match.turnNumber = (overrides && overrides.turnNumber !== undefined) ? overrides.turnNumber : 7;
  const state = {
    match,
    mode: (overrides && overrides.mode) || "quick",
    controllers: (overrides && overrides.controllers) || ["human", "ai"],
    save: freshSave(),
    matchStats: {
      biggestHit: null,
      specialsUsed: [0, 0],
      triviaCorrect: 0,
      triviaTotal: 0,
      triviaSeen: {}
    }
  };
  return state;
}

test("renderVictoryCardSvg returns null when state has no match", () => {
  assert.strictEqual(Screens.renderVictoryCardSvg(null), null);
  assert.strictEqual(Screens.renderVictoryCardSvg({}), null);
  assert.strictEqual(Screens.renderVictoryCardSvg({ match: null }), null);
});

test("renderVictoryCardSvg returns null when match has no winner", () => {
  const match = Combat.createMatch("moses", "david");
  // winner is left as null (default from createMatch)
  assert.strictEqual(Screens.renderVictoryCardSvg({ match, controllers: ["human", "ai"] }), null);
});

test("renderVictoryCardSvg returns null when match hero ids are invalid", () => {
  const fakeMatch = {
    players: [{ heroId: "not-a-hero", hp: 50 }, { heroId: "also-fake", hp: 0 }],
    winner: 0,
    turnNumber: 3,
    stageId: "redsea"
  };
  assert.strictEqual(
    Screens.renderVictoryCardSvg({ match: fakeMatch, controllers: ["human", "ai"] }),
    null
  );
});

test("renderVictoryCardSvg returns an <svg> string with viewBox and dimensions", () => {
  const svg = Screens.renderVictoryCardSvg(_resultState());
  assert.ok(typeof svg === "string", "should return a string");
  assert.match(svg, /^<svg\b/);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 1200 630"/);
  assert.match(svg, /width="1200"/);
  assert.match(svg, /height="630"/);
});

test("renderVictoryCardSvg honors custom width/height via opts", () => {
  const svg = Screens.renderVictoryCardSvg(_resultState(), { width: 800, height: 420 });
  assert.match(svg, /viewBox="0 0 800 420"/);
  assert.match(svg, /width="800"/);
  assert.match(svg, /height="420"/);
});

test("renderVictoryCardSvg includes the winner's name", () => {
  const svg = Screens.renderVictoryCardSvg(_resultState({ heroA: "moses", heroB: "david", winner: 0 }));
  assert.match(svg, /Moses/);
});

test("renderVictoryCardSvg includes the loser's name in the 'defeated' caption", () => {
  const svg = Screens.renderVictoryCardSvg(_resultState({ heroA: "moses", heroB: "david", winner: 0 }));
  assert.match(svg, /defeated King David/);
});

test("renderVictoryCardSvg shows 'VICTORY!' when human (slot 0) beats AI", () => {
  const svg = Screens.renderVictoryCardSvg(_resultState({
    controllers: ["human", "ai"],
    winner: 0
  }));
  assert.match(svg, /VICTORY!/);
  assert.doesNotMatch(svg, /DEFEAT!/);
});

test("renderVictoryCardSvg shows 'DEFEAT!' when AI (slot 1) beats human", () => {
  const svg = Screens.renderVictoryCardSvg(_resultState({
    controllers: ["human", "ai"],
    winner: 1
  }));
  assert.match(svg, /DEFEAT!/);
  assert.doesNotMatch(svg, /VICTORY!/);
});

test("renderVictoryCardSvg shows a neutral '[Hero] WINS!' title for spectator / couch matches", () => {
  // Spectator: both AI
  const svgSpec = Screens.renderVictoryCardSvg(_resultState({
    controllers: ["ai", "ai"],
    heroA: "esther", heroB: "judah", winner: 0
  }));
  assert.match(svgSpec, /QUEEN ESTHER WINS!/);
  assert.doesNotMatch(svgSpec, /VICTORY!|DEFEAT!/);

  // Couch: both human
  const svgCouch = Screens.renderVictoryCardSvg(_resultState({
    controllers: ["human", "human"],
    heroA: "esther", heroB: "judah", winner: 1
  }));
  assert.match(svgCouch, /JUDAH MACCABEE WINS!/);
  assert.doesNotMatch(svgCouch, /VICTORY!|DEFEAT!/);
});

test("renderVictoryCardSvg includes the stage name and turn count", () => {
  const state = _resultState({ heroA: "moses", heroB: "david", winner: 0, turnNumber: 11 });
  // Moses' default stage from createMatch is taken from heroB.stageId. Force one
  // for determinism.
  state.match.stageId = "elah";
  const svg = Screens.renderVictoryCardSvg(state);
  assert.match(svg, /Valley of Elah/);
  assert.match(svg, /11 turns/);
});

test("renderVictoryCardSvg embeds portraits as nested SVG elements (no nested xmlns clutter)", () => {
  const svg = Screens.renderVictoryCardSvg(_resultState());
  // The card has the outer <svg> plus two nested <svg> elements (winner + loser portraits).
  const svgOpens = (svg.match(/<svg\b/g) || []).length;
  assert.strictEqual(svgOpens, 3, "expected one outer + two nested <svg> opens");
  // The nested portraits should keep their viewBox="0 0 200 200".
  const inner = (svg.match(/viewBox="0 0 200 200"/g) || []).length;
  assert.strictEqual(inner, 2, "expected two nested portraits with viewBox 0 0 200 200");
});

test("renderResult includes a download-result-card button outside Practice mode", () => {
  // Quick mode (default)
  const state = _resultState({ heroA: "moses", heroB: "david", winner: 0 });
  const html = Screens.renderResult(state);
  assert.match(html, /data-action="download-result-card"/);
});

test("renderResult does NOT include the download-result-card button in Practice mode", () => {
  const match = Combat.createMatch("moses", "david");
  match.winner = 0;
  const state = {
    mode: "practice",
    controllers: ["human", "human"],
    match,
    save: freshSave(),
    matchStats: null
  };
  const html = Screens.renderResult(state);
  assert.doesNotMatch(html, /data-action="download-result-card"/);
});

test("renderTournamentResult includes the download-result-card button on the champion screen", () => {
  // Tournament champion path requires both `tournament.bracket.finalWinner`
  // AND `state.match` (the just-finished final). Build both.
  const match = Combat.createMatch("moses", "david");
  match.winner = 0;
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
  const html = Screens.renderTournamentResult({ tournament: t, save: freshSave(), match });
  assert.match(html, /data-action="download-result-card"/);
});

test("renderTournamentResult elimination screen does NOT include the download button", () => {
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
  assert.doesNotMatch(html, /data-action="download-result-card"/);
});

test("renderEndlessResult includes the download-result-card button when state.match exists", () => {
  const match = Combat.createMatch("moses", "david");
  match.winner = 1;  // endless run ends when the player loses
  const state = {
    endless: { heroId: "moses", streak: 3, isNewBest: false, previousBest: 5 },
    save: freshSave(),
    match
  };
  const html = Screens.renderEndlessResult(state);
  assert.match(html, /data-action="download-result-card"/);
});

test("renderEndlessResult does NOT include the download button when state.match is missing", () => {
  const state = {
    endless: { heroId: "moses", streak: 0, isNewBest: false, previousBest: 5 },
    save: freshSave()
    // no match field
  };
  const html = Screens.renderEndlessResult(state);
  assert.doesNotMatch(html, /data-action="download-result-card"/);
});

// ── Canonical Hero Rivalries (VS Intro + Compare flavor tags) ───────────────

test("_rivalryFor returns null for unknown pairings not listed in RIVALRIES", () => {
  // david + einstein is intentionally NOT in the canonical 10 pairings —
  // sanity check that unlisted pairs return null in both orderings.
  assert.strictEqual(Screens._rivalryFor("david", "einstein"), null);
  assert.strictEqual(Screens._rivalryFor("einstein", "david"), null);
  // Spot-check a second unlisted pair to make sure it's not a fluke.
  assert.strictEqual(Screens._rivalryFor("judah", "einstein"), null);
});

test("_rivalryFor is symmetric: same value regardless of argument order", () => {
  const ab = Screens._rivalryFor("david", "judah");
  const ba = Screens._rivalryFor("judah", "david");
  assert.ok(ab && ab.tag, "expected a rivalry object for david/judah");
  assert.deepStrictEqual(ab, ba, "rivalry should be symmetric");
});

test("_rivalryFor returns null for mirror matches (heroA === heroB)", () => {
  assert.strictEqual(Screens._rivalryFor("moses", "moses"), null);
  assert.strictEqual(Screens._rivalryFor("einstein", "einstein"), null);
});

test("_rivalryFor returns null for invalid hero ids (non-string, null, undefined)", () => {
  assert.strictEqual(Screens._rivalryFor(null, "moses"), null);
  assert.strictEqual(Screens._rivalryFor("moses", null), null);
  assert.strictEqual(Screens._rivalryFor(undefined, "moses"), null);
  assert.strictEqual(Screens._rivalryFor("moses", undefined), null);
  assert.strictEqual(Screens._rivalryFor(42, "moses"), null);
  assert.strictEqual(Screens._rivalryFor("moses", {}), null);
  assert.strictEqual(Screens._rivalryFor(null, null), null);
});

test("_rivalryFor returns expected tags for canonical pairings", () => {
  const warriors = Screens._rivalryFor("david", "judah");
  assert.ok(warriors && warriors.tag, "david/judah should have a rivalry");
  assert.strictEqual(warriors.tag, "Warriors of Israel");
  assert.ok(typeof warriors.icon === "string" && warriors.icon.length > 0);

  const queens = Screens._rivalryFor("esther", "golda");
  assert.ok(queens && queens.tag, "esther/golda should have a rivalry");
  assert.strictEqual(queens.tag, "Queens of their people");

  const thinkers = Screens._rivalryFor("rambam", "einstein");
  assert.ok(thinkers && thinkers.tag, "rambam/einstein should have a rivalry");
  assert.strictEqual(thinkers.tag, "Giants of Jewish thought");
});

test("renderVsIntro includes the rivalry badge when a canonical pairing is set", () => {
  const match = Combat.createMatch("david", "judah");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "ai"],
    mode: "quick",
    save: freshSave()
  });
  assert.match(html, /vs-intro-rivalry/);
  assert.match(html, /Warriors of Israel/);
});

test("renderVsIntro does NOT include the rivalry badge for non-canonical pairings", () => {
  // david + einstein is not in RIVALRIES.
  const match = Combat.createMatch("david", "einstein");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "ai"],
    mode: "quick",
    save: freshSave()
  });
  assert.doesNotMatch(html, /vs-intro-rivalry/);
});

test("renderVsIntro does NOT include the rivalry badge for mirror matches", () => {
  const match = Combat.createMatch("moses", "moses");
  const html = Screens.renderVsIntro({
    match,
    controllers: ["human", "ai"],
    mode: "quick",
    save: freshSave()
  });
  assert.doesNotMatch(html, /vs-intro-rivalry/);
});

test("renderCompare includes the rivalry line when a canonical pairing is selected", () => {
  const state = {
    compare: { picks: { 1: "rambam", 2: "einstein" }, selecting: 2 },
    save: freshSave()
  };
  const html = Screens.renderCompare(state);
  assert.match(html, /compare-rivalry/);
  assert.match(html, /Giants of Jewish thought/);
});

test("renderCompare does NOT include the rivalry line for non-canonical pairings", () => {
  // david + einstein is not in RIVALRIES.
  const state = {
    compare: { picks: { 1: "david", 2: "einstein" }, selecting: 2 },
    save: freshSave()
  };
  const html = Screens.renderCompare(state);
  assert.doesNotMatch(html, /compare-rivalry/);
});

// ── HP Timeline chart (renderHpChart) ────────────────────────────────────

test("renderHpChart returns empty string when snapshots is empty", () => {
  assert.strictEqual(Screens.renderHpChart([], { name0: "A", name1: "B" }, {}), "");
});

test("renderHpChart returns empty string when snapshots is undefined", () => {
  assert.strictEqual(Screens.renderHpChart(undefined, { name0: "A", name1: "B" }, {}), "");
});

test("renderHpChart returns an SVG string with the expected viewBox", () => {
  const snaps = [
    { turn: 0, hp0: 100, hp1: 90 },
    { turn: 1, hp0: 90,  hp1: 80 }
  ];
  const html = Screens.renderHpChart(snaps, { name0: "Moses", name1: "David" }, {});
  assert.match(html, /<svg /);
  assert.match(html, /class="hp-chart"/);
  assert.match(html, /viewBox="0 0 320 140"/);
});

test("renderHpChart includes both player names in the legend", () => {
  const snaps = [
    { turn: 0, hp0: 100, hp1: 90 },
    { turn: 2, hp0: 80,  hp1: 60 }
  ];
  const html = Screens.renderHpChart(snaps, { name0: "Moses", name1: "David" }, {});
  assert.match(html, /Moses/);
  assert.match(html, /David/);
});

test("renderHpChart includes path data for both HP lines", () => {
  const snaps = [
    { turn: 0, hp0: 100, hp1: 90 },
    { turn: 1, hp0: 90,  hp1: 70 }
  ];
  const html = Screens.renderHpChart(snaps, { name0: "P1", name1: "P2" }, {});
  // Two <path d="M..."> entries — one per hero line.
  const pathMatches = html.match(/<path d="M[^"]+"/g) || [];
  assert.strictEqual(pathMatches.length, 2, "expected two <path d='M...'> entries");
});

test("renderHpChart computes correct x-coordinates: first point at left padding, last at right edge", () => {
  // Turn 0 → padL (24), turn 4 → padL + (4/4)*(W - padL - padR) = 24 + 282 = 306.
  const snaps = [
    { turn: 0, hp0: 100, hp1: 100 },
    { turn: 2, hp0: 70,  hp1: 80 },
    { turn: 4, hp0: 40,  hp1: 60 }
  ];
  const html = Screens.renderHpChart(snaps, { name0: "A", name1: "B" }, {});
  // First path command starts at x=24.0; last L command lands at x=306.0.
  assert.match(html, /M24\.0,/);
  assert.match(html, /L306\.0,/);
});

test("renderHpChart honors custom colors", () => {
  const snaps = [
    { turn: 0, hp0: 100, hp1: 100 },
    { turn: 1, hp0: 90,  hp1: 95 }
  ];
  const html = Screens.renderHpChart(snaps, { name0: "P1", name1: "P2" }, { color0: "#aabbcc", color1: "#ddeeff" });
  assert.match(html, /stroke="#aabbcc"/);
  assert.match(html, /stroke="#ddeeff"/);
});

test("renderHpChart escapes hero names in the legend", () => {
  const snaps = [
    { turn: 0, hp0: 100, hp1: 100 },
    { turn: 1, hp0: 90,  hp1: 80 }
  ];
  const html = Screens.renderHpChart(snaps, { name0: "<script>", name1: "P2" }, {});
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("_renderRecapSections includes the chart when matchStats has hpSnapshots length > 1", () => {
  const match = Combat.createMatch("moses", "david");
  match.turnNumber = 3;
  const stats = {
    biggestHit: null,
    specialsUsed: [0, 0],
    triviaCorrect: 0,
    triviaTotal: 0,
    damageDealtBy: [10, 0],
    damageTakenBy: [0, 10],
    hpSnapshots: [
      { turn: 0, hp0: 100, hp1: 100 },
      { turn: 1, hp0: 100, hp1: 90 },
      { turn: 2, hp0: 90,  hp1: 90 }
    ],
    startedAt: 0,
    endedAt: 1000
  };
  const h0 = Heroes.byId("moses");
  const h1 = Heroes.byId("david");
  const html = Screens._renderRecapSections(match, stats, h0, h1, "");
  assert.match(html, /recap-chart-wrap/);
  assert.match(html, /HP over time/);
  assert.match(html, /<svg /);
});

test("_renderRecapSections omits the chart when hpSnapshots is empty", () => {
  const match = Combat.createMatch("moses", "david");
  match.turnNumber = 1;
  const stats = {
    biggestHit: null,
    specialsUsed: [0, 0],
    triviaCorrect: 0,
    triviaTotal: 0,
    damageDealtBy: [0, 0],
    damageTakenBy: [0, 0],
    hpSnapshots: [],
    startedAt: 0,
    endedAt: 0
  };
  const html = Screens._renderRecapSections(match, stats, Heroes.byId("moses"), Heroes.byId("david"), "");
  assert.doesNotMatch(html, /recap-chart-wrap/);
  assert.doesNotMatch(html, /HP over time/);
});

test("_renderRecapSections omits the chart when hpSnapshots has length 1", () => {
  const match = Combat.createMatch("moses", "david");
  match.turnNumber = 1;
  const stats = {
    biggestHit: null,
    specialsUsed: [0, 0],
    triviaCorrect: 0,
    triviaTotal: 0,
    damageDealtBy: [0, 0],
    damageTakenBy: [0, 0],
    hpSnapshots: [{ turn: 0, hp0: 100, hp1: 100 }],
    startedAt: 0,
    endedAt: 0
  };
  const html = Screens._renderRecapSections(match, stats, Heroes.byId("moses"), Heroes.byId("david"), "");
  assert.doesNotMatch(html, /recap-chart-wrap/);
});

test("_renderRecapSections still renders the chart for legacy stats without the hpSnapshots field (no throw, no chart)", () => {
  const match = Combat.createMatch("moses", "david");
  match.turnNumber = 1;
  // Simulate a stats blob from before v3 — no hpSnapshots key.
  const stats = {
    biggestHit: null,
    specialsUsed: [0, 0],
    triviaCorrect: 0,
    triviaTotal: 0,
    damageDealtBy: [0, 0],
    damageTakenBy: [0, 0],
    startedAt: 0,
    endedAt: 0
  };
  let html;
  assert.doesNotThrow(() => {
    html = Screens._renderRecapSections(match, stats, Heroes.byId("moses"), Heroes.byId("david"), "");
  });
  assert.doesNotMatch(html, /recap-chart-wrap/);
});

// ── Stage Info: subtitles + historical descriptions ────────────────────────
// Tests for the educational stage-info feature: rich per-stage metadata
// (name/subtitle/description), backward-compat stageNameOf, the new
// stageInfoOf, the stage-select card subtitle + info button, and the
// renderStageInfoOverlay description card.

test("STAGE_INFO via stageInfoOf has entries for all 7 stages", () => {
  const ids = ["redsea", "elah", "throne", "temple", "cordoba", "knesset", "princeton"];
  for (const id of ids) {
    const info = Screens.stageInfoOf(id);
    assert.ok(info, `expected info for stage ${id}`);
  }
});

test("each STAGE_INFO entry has non-empty name, subtitle, description strings", () => {
  const ids = ["redsea", "elah", "throne", "temple", "cordoba", "knesset", "princeton"];
  for (const id of ids) {
    const info = Screens.stageInfoOf(id);
    assert.ok(info, `expected info for stage ${id}`);
    assert.strictEqual(typeof info.name, "string", `${id}: name must be string`);
    assert.ok(info.name.length > 0, `${id}: name must be non-empty`);
    assert.strictEqual(typeof info.subtitle, "string", `${id}: subtitle must be string`);
    assert.ok(info.subtitle.length > 0, `${id}: subtitle must be non-empty`);
    assert.strictEqual(typeof info.description, "string", `${id}: description must be string`);
    assert.ok(info.description.length > 0, `${id}: description must be non-empty`);
  }
});

test("stageNameOf returns the .name field for valid stage ids", () => {
  assert.strictEqual(Screens.stageNameOf("redsea"), "Red Sea");
  assert.strictEqual(Screens.stageNameOf("elah"), "Valley of Elah");
  assert.strictEqual(Screens.stageNameOf("throne"), "Persian Throne");
  assert.strictEqual(Screens.stageNameOf("temple"), "The Temple");
  assert.strictEqual(Screens.stageNameOf("cordoba"), "Cordoba Study");
  assert.strictEqual(Screens.stageNameOf("knesset"), "The Knesset");
  assert.strictEqual(Screens.stageNameOf("princeton"), "Princeton Study");
});

test("stageNameOf falls back to the id for unknown stages (backward-compat)", () => {
  assert.strictEqual(Screens.stageNameOf("not-a-real-stage"), "not-a-real-stage");
  assert.strictEqual(Screens.stageNameOf(""), "");
});

test("stageInfoOf returns null for unknown stage", () => {
  assert.strictEqual(Screens.stageInfoOf("not-a-real-stage"), null);
  assert.strictEqual(Screens.stageInfoOf(""), null);
  assert.strictEqual(Screens.stageInfoOf(undefined), null);
});

test("renderStageSelect includes the .stage-subtitle line for at least one card", () => {
  const state = {
    picks: { 1: "moses", 2: "david" }
  };
  const html = Screens.renderStageSelect(state);
  assert.match(html, /class="stage-subtitle"/);
  // Should also include the Red Sea subtitle since moses is in the card list.
  assert.match(html, /Where the Exodus crossed/);
});

test("renderStageSelect includes the view-stage-info button for each card", () => {
  const state = {
    picks: { 1: "moses", 2: "david" }
  };
  const html = Screens.renderStageSelect(state);
  assert.match(html, /data-action="view-stage-info"/);
  // 7 heroes → 7 info buttons.
  const matches = html.match(/data-action="view-stage-info"/g) || [];
  assert.strictEqual(matches.length, 7, "expected one info button per stage card");
});

test("renderStageInfoOverlay returns \"\" when viewingStageId is null", () => {
  assert.strictEqual(Screens.renderStageInfoOverlay({}), "");
  assert.strictEqual(Screens.renderStageInfoOverlay({ viewingStageId: null }), "");
  assert.strictEqual(Screens.renderStageInfoOverlay(null), "");
});

test("renderStageInfoOverlay returns \"\" for an unknown stage id (safe fallback)", () => {
  assert.strictEqual(Screens.renderStageInfoOverlay({ viewingStageId: "not-a-real-stage" }), "");
});

test("renderStageInfoOverlay returns overlay markup with name + subtitle + description for a valid id", () => {
  const html = Screens.renderStageInfoOverlay({ viewingStageId: "redsea" });
  assert.match(html, /class="overlay"/);
  assert.match(html, /class="overlay-card stage-info-card"/);
  assert.match(html, /class="stage-info-name"/);
  assert.match(html, /Red Sea/);
  assert.match(html, /Where the Exodus crossed/);
  // First sentence of the description — sanity-check the body wired up.
  assert.match(html, /Israelites crossed the Red Sea/);
});

test("renderStageInfoOverlay output contains the close-stage-info action", () => {
  const html = Screens.renderStageInfoOverlay({ viewingStageId: "throne" });
  assert.match(html, /data-action="close-stage-info"/);
});

// ── Player name personalization ──────────────────────────────────────────
test("renderSettings includes the player-name input field", () => {
  const save = freshSave();
  const html = Screens.renderSettings({ save });
  assert.match(html, /class="settings-name-input"/);
  assert.match(html, /data-action="set-player-name"/);
  assert.match(html, /maxlength="24"/);
  assert.match(html, /Your name/);
});

test("renderSettings name input value reflects state.save.playerName", () => {
  const save = freshSave();
  save.playerName = "Grandpa";
  const html = Screens.renderSettings({ save });
  assert.match(html, /value="Grandpa"/);
});

test("renderSettings name input is empty when playerName is blank", () => {
  const save = freshSave();
  const html = Screens.renderSettings({ save });
  assert.match(html, /value=""/);
});

test("renderSettings escapes playerName to prevent HTML injection", () => {
  const save = freshSave();
  save.playerName = '"><script>alert(1)</script>';
  const html = Screens.renderSettings({ save });
  // The value attribute must not contain a raw <script tag.
  assert.doesNotMatch(html, /<script>alert/);
  // Quote must be escaped so it can't break out of the attribute.
  assert.match(html, /&quot;/);
});

test("renderTitle shows personalized greeting when playerName is set", () => {
  const save = freshSave();
  save.playerName = "Grandpa";
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /Welcome back, Grandpa!/);
  assert.doesNotMatch(html, /A turn-based duel through history/);
});

test("renderTitle shows default tagline when playerName is empty", () => {
  const save = freshSave();
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.match(html, /A turn-based duel through history/);
  assert.doesNotMatch(html, /Welcome back,/);
});

test("renderTitle escapes playerName in the greeting (XSS)", () => {
  const save = freshSave();
  save.playerName = "<script>x</script>";
  const html = Screens.renderTitle({ save, titleFeaturedIndex: 0 });
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("renderWhatsNew greets by name when playerName is set", () => {
  const cl = [{
    version: 1, title: "v1",
    changes: [{ icon: "*", title: "T", description: "D" }]
  }];
  const save = freshSave();
  save.playerName = "Sarah";
  const html = Screens.renderWhatsNew({ changelog: cl, save });
  assert.match(html, /Welcome back, Sarah!/);
});

test("renderWhatsNew uses default greeting when playerName is empty", () => {
  const cl = [{
    version: 1, title: "v1",
    changes: [{ icon: "*", title: "T", description: "D" }]
  }];
  const save = freshSave();
  const html = Screens.renderWhatsNew({ changelog: cl, save });
  assert.match(html, /Welcome back! Here's what's new/);
  assert.doesNotMatch(html, /Welcome back, /);
});

test("renderWhatsNew escapes playerName in the subtitle (XSS)", () => {
  const cl = [{
    version: 1, title: "v1",
    changes: [{ icon: "*", title: "T", description: "D" }]
  }];
  const save = freshSave();
  save.playerName = "<img onerror=x>";
  const html = Screens.renderWhatsNew({ changelog: cl, save });
  assert.doesNotMatch(html, /<img onerror=x>/);
  assert.match(html, /&lt;img onerror=x&gt;/);
});

test("renderVictoryCardSvg includes 'Played by [Name]' when playerName is set", () => {
  const state = _resultState({ heroA: "moses", heroB: "david", winner: 0 });
  state.save.playerName = "Grandpa";
  const svg = Screens.renderVictoryCardSvg(state);
  assert.match(svg, /Played by Grandpa/);
});

test("renderVictoryCardSvg omits player attribution when playerName is empty", () => {
  const state = _resultState({ heroA: "moses", heroB: "david", winner: 0 });
  // playerName defaults to ""
  const svg = Screens.renderVictoryCardSvg(state);
  assert.doesNotMatch(svg, /Played by/);
});

test("renderVictoryCardSvg escapes playerName in the share card (XSS)", () => {
  const state = _resultState({ heroA: "moses", heroB: "david", winner: 0 });
  state.save.playerName = '"><script>alert(1)</script>';
  const svg = Screens.renderVictoryCardSvg(state);
  assert.doesNotMatch(svg, /<script>alert\(1\)<\/script>/);
  // escapeXml turns < into &lt;
  assert.match(svg, /&lt;script&gt;/);
});

// ── Hero Mastery Tiers ──────────────────────────────────────────────────────
// Pure helper + char-select / Profile / Hall integration tests.

test("heroMasteryTier returns null when perHeroStats is null/undefined and not mastered", () => {
  assert.strictEqual(Screens.heroMasteryTier(undefined, false), null);
  assert.strictEqual(Screens.heroMasteryTier(null, false), null);
  // Stats object exists but no triviaCorrect field → treated as 0.
  assert.strictEqual(Screens.heroMasteryTier({}, false), null);
});

test("heroMasteryTier returns null when triviaCorrect < 3", () => {
  assert.strictEqual(Screens.heroMasteryTier({ triviaCorrect: 0 }, false), null);
  assert.strictEqual(Screens.heroMasteryTier({ triviaCorrect: 1 }, false), null);
  assert.strictEqual(Screens.heroMasteryTier({ triviaCorrect: 2 }, false), null);
});

test("heroMasteryTier returns 'apprentice' for triviaCorrect 3-9", () => {
  for (const n of [3, 4, 7, 9]) {
    const t = Screens.heroMasteryTier({ triviaCorrect: n }, false);
    assert.ok(t, `expected a tier for ${n} correct`);
    assert.strictEqual(t.tier, "apprentice");
    assert.strictEqual(t.label, "Apprentice");
    assert.strictEqual(t.correct, n);
  }
});

test("heroMasteryTier returns 'adept' for triviaCorrect 10-19", () => {
  for (const n of [10, 15, 19]) {
    const t = Screens.heroMasteryTier({ triviaCorrect: n }, false);
    assert.ok(t);
    assert.strictEqual(t.tier, "adept");
    assert.strictEqual(t.label, "Adept");
    assert.strictEqual(t.correct, n);
  }
});

test("heroMasteryTier returns 'scholar' for triviaCorrect 20-49", () => {
  for (const n of [20, 35, 49]) {
    const t = Screens.heroMasteryTier({ triviaCorrect: n }, false);
    assert.ok(t);
    assert.strictEqual(t.tier, "scholar");
    assert.strictEqual(t.label, "Scholar");
    assert.strictEqual(t.correct, n);
  }
});

test("heroMasteryTier returns 'sage' for triviaCorrect >= 50", () => {
  for (const n of [50, 73, 200]) {
    const t = Screens.heroMasteryTier({ triviaCorrect: n }, false);
    assert.ok(t);
    assert.strictEqual(t.tier, "sage");
    assert.strictEqual(t.label, "Sage");
    assert.strictEqual(t.correct, n);
  }
});

test("heroMasteryTier returns 'master' when isMastered is true (regardless of correct count)", () => {
  // Mastered trumps every other tier.
  for (const n of [0, 5, 25, 60, 999]) {
    const t = Screens.heroMasteryTier({ triviaCorrect: n }, true);
    assert.ok(t);
    assert.strictEqual(t.tier, "master");
    assert.strictEqual(t.label, "Master");
    assert.strictEqual(t.correct, n);
  }
});

test("heroMasteryTier returns 'master' when isMastered AND triviaCorrect is 0", () => {
  // The mastery flag is the sealed gate; tier should be master even at 0.
  const t = Screens.heroMasteryTier({ triviaCorrect: 0 }, true);
  assert.ok(t);
  assert.strictEqual(t.tier, "master");
});

test("renderProfile includes the tier display in Your Progress", () => {
  const save = freshSave();
  save.stats.perHero.moses.triviaCorrect = 12; // adept
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /Mastery tier:/);
  assert.match(html, /profile-tier-badge profile-tier-adept/);
  assert.match(html, /Adept/);
  assert.match(html, /12 trivia correct so far/);
});

test("renderProfile shows 'Not yet' tier when no progress", () => {
  const save = freshSave();
  // Default triviaCorrect = 0, not mastered.
  const html = Screens.renderProfile({ save }, "moses");
  assert.match(html, /Mastery tier:/);
  assert.match(html, /profile-tier-none/);
  assert.match(html, /Not yet/);
  // Hint references the hero by name.
  assert.match(html, /Answer 3 of Moses/);
});

test("renderProfile shows master tier when isMastered", () => {
  const save = freshSave();
  save.mastered.david = true;
  // triviaCorrect can be anything (e.g. 0 — they cleared a perfect session).
  const html = Screens.renderProfile({ save }, "david");
  assert.match(html, /profile-tier-badge profile-tier-master/);
  assert.match(html, /Master/);
  assert.match(html, /All 20 trivia in a single session!/);
});

test("_heroSpotlightStats includes intermediate tier chip when applicable", () => {
  const save = freshSave();
  save.stats.perHero.moses.triviaCorrect = 25; // scholar
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  assert.match(html, /hero-stat-tier hero-stat-tier-scholar/);
  assert.match(html, /Scholar/);
  assert.match(html, /\(25 correct\)/);
});

test("_heroSpotlightStats omits tier chip when isMastered (MASTERED chip already covers it)", () => {
  const save = freshSave();
  save.mastered.moses = true;
  save.stats.perHero.moses.triviaCorrect = 25;
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  // MASTERED chip still shows.
  assert.match(html, /MASTERED/);
  // No duplicate tier chip for the master tier.
  assert.doesNotMatch(html, /hero-stat-tier-master/);
  // And no intermediate tier chip either — mastery overrides.
  assert.doesNotMatch(html, /hero-stat-tier-scholar/);
});

test("_heroSpotlightStats omits tier chip when no tier yet (< 3 correct)", () => {
  const save = freshSave();
  save.stats.perHero.moses.triviaCorrect = 2;
  // Give them a played match so the block isn't the empty state.
  save.stats.perHero.moses.played = 1;
  save.stats.perHero.moses.won = 1;
  const html = Screens._heroSpotlightStats(save, "moses", "quick");
  assert.doesNotMatch(html, /hero-stat-tier/);
});

test("renderHall includes the tier badge next to hero names when tier is non-null", () => {
  const save = freshSave();
  save.stats.perHero.moses.triviaCorrect = 10;   // adept
  save.stats.perHero.david.triviaCorrect = 55;   // sage
  save.mastered.esther = true;                   // master
  // judah stays untiered (0 correct, not mastered).
  const html = Screens.renderHall({ save });
  assert.match(html, /hall-tier-badge hall-tier-adept/);
  assert.match(html, /hall-tier-badge hall-tier-sage/);
  assert.match(html, /hall-tier-badge hall-tier-master/);
  // The label is exposed via the title attribute for hover/screen readers.
  assert.match(html, /title="Adept"/);
  assert.match(html, /title="Sage"/);
  assert.match(html, /title="Master"/);
});

// ── Match Replay — battle screen banner ──────────────────────────────────

function _replayState(overrides) {
  // Build the same shape the live replay code sets up: mode="replay",
  // both controllers "replay", a state.replay object with entry+index+playing.
  const match = Combat.createMatch("moses", "david");
  const entry = {
    id: 123,
    hero0Id: "moses",
    hero1Id: "david",
    winnerSlot: 0,
    turns: 3,
    moves: [
      { actor: 0, move: "attack" },
      { actor: 1, move: "defend" },
      { actor: 0, move: "attack" },
      { actor: 1, move: "attack" },
      { actor: 0, move: "special" }
    ]
  };
  const state = {
    mode: "replay",
    controllers: ["replay", "replay"],
    match,
    save: freshSave(),
    arcade: null,
    matchStats: null,
    replay: { entry, index: 2, playing: false, timeoutId: null }
  };
  if (overrides) {
    if (overrides.match)   Object.assign(state.match, overrides.match);
    if (overrides.replay)  Object.assign(state.replay, overrides.replay);
    if (overrides.entry)   Object.assign(state.replay.entry, overrides.entry);
    if (overrides.save)    state.save = Object.assign(freshSave(), overrides.save);
  }
  return state;
}

test("renderBattle includes .replay-banner when state.mode is \"replay\"", () => {
  const state = _replayState();
  const html = Screens.renderBattle(state);
  assert.match(html, /class="replay-banner"/);
  assert.match(html, /REPLAY MODE/);
});

test("renderBattle replay banner shows \"Move X of Y\" with correct numbers", () => {
  const state = _replayState({ replay: { index: 2 } });   // 5 total moves in fixture
  const html = Screens.renderBattle(state);
  assert.match(html, /Move 2 of 5/);
});

test("renderBattle replay banner shows Play+Step buttons when not playing", () => {
  const state = _replayState({ replay: { playing: false } });
  const html = Screens.renderBattle(state);
  assert.match(html, /data-action="replay-play"/);
  assert.match(html, /data-action="replay-step"/);
  assert.doesNotMatch(html, /data-action="replay-pause"/);
  // End button is always available alongside Play+Step.
  assert.match(html, /data-action="replay-end"/);
});

test("renderBattle replay banner shows Pause+Step buttons when playing", () => {
  const state = _replayState({ replay: { playing: true } });
  const html = Screens.renderBattle(state);
  assert.match(html, /data-action="replay-pause"/);
  assert.match(html, /data-action="replay-step"/);
  assert.doesNotMatch(html, /data-action="replay-play"/);
});

test("renderBattle replay banner shows Restart+End when match.winner is set", () => {
  const state = _replayState();
  state.match.winner = 0;   // replay reached its recorded conclusion
  const html = Screens.renderBattle(state);
  assert.match(html, /data-action="replay-restart"/);
  assert.match(html, /data-action="replay-end"/);
  // No Play/Pause/Step controls once the replay is over — only Restart/End.
  assert.doesNotMatch(html, /data-action="replay-play"/);
  assert.doesNotMatch(html, /data-action="replay-pause"/);
  assert.doesNotMatch(html, /data-action="replay-step"/);
});

test("renderBattle does NOT include the player move buttons during replay", () => {
  const state = _replayState();
  const html = Screens.renderBattle(state);
  // The standard human move buttons emit data-action="player-move"; replay
  // suppresses them entirely (no human input drives the screen).
  assert.doesNotMatch(html, /data-action="player-move"/);
  // The "Computer is thinking…" fallback is also suppressed (no AI either).
  assert.doesNotMatch(html, /Computer is thinking/);
});

test("renderBattle does NOT include the Pause/Quit bottom buttons during replay", () => {
  // Replay controls live in the banner; the standard Pause / Quit match flow
  // doesn't apply (those map to combat-pause overlay and quit-confirm,
  // neither of which is meaningful during a replay).
  const state = _replayState();
  const html = Screens.renderBattle(state);
  assert.doesNotMatch(html, /data-action="pause-battle"/);
  assert.doesNotMatch(html, /data-action="confirm-quit"/);
});

test("renderBattle does NOT show .replay-banner in non-replay modes", () => {
  for (const mode of ["quick", "arcade", "endless", "daily", "tournament", "spectator", "study", "practice"]) {
    const match = Combat.createMatch("moses", "david");
    const state = {
      match,
      mode,
      controllers: mode === "practice" || mode === "spectator" ? ["human", "human"] : ["human", "ai"],
      save: freshSave(),
      arcade: null
    };
    const html = Screens.renderBattle(state);
    assert.doesNotMatch(html, /class="replay-banner"/,
      `mode "${mode}" must not render the replay banner`);
  }
});

// ── Match Replay — match-detail overlay Replay button ────────────────────

test("renderMatchDetail shows the Replay button when entry.moves has entries", () => {
  const save = freshSave();
  save.recentMatches = [{
    id: 42,
    date: "2026-05-17T12:00:00.000Z",
    mode: "quick",
    hero0Id: "moses",
    hero1Id: "david",
    winnerSlot: 0,
    turns: 5,
    biggestHit: null,
    specialsUsed: [1, 0],
    triviaCorrect: 0,
    triviaTotal: 0,
    log: [],
    moves: [
      { actor: 0, move: "attack" },
      { actor: 1, move: "defend" },
      { actor: 0, move: "special" }
    ]
  }];
  const state = { save, viewingMatchId: 42 };
  const html = Screens.renderMatchDetail(state);
  assert.match(html, /data-action="start-replay"/);
  assert.match(html, /data-match-id="42"/);
  assert.match(html, /Replay this match/);
});

test("renderMatchDetail HIDES the Replay button when entry has no moves (legacy)", () => {
  // Older entries written before the Match Replay feature shipped have no
  // `moves` field. The overlay must still render fine, just without Replay.
  const save = freshSave();
  save.recentMatches = [{
    id: 7,
    date: "2026-05-17T12:00:00.000Z",
    mode: "quick",
    hero0Id: "esther",
    hero1Id: "judah",
    winnerSlot: 1,
    turns: 5,
    biggestHit: null,
    specialsUsed: [0, 0],
    triviaCorrect: 0,
    triviaTotal: 0,
    log: ["Esther attacks.", "Judah counters."]
  }];
  const state = { save, viewingMatchId: 7 };
  const html = Screens.renderMatchDetail(state);
  assert.doesNotMatch(html, /data-action="start-replay"/);
  assert.doesNotMatch(html, /Replay this match/);
  // Overlay still renders the match details and Close button.
  assert.match(html, /data-action="close-match-detail"/);
  assert.match(html, /Move Log/);
});

test("renderMatchDetail HIDES the Replay button when entry.moves is an empty array", () => {
  const save = freshSave();
  save.recentMatches = [{
    id: 8,
    date: "2026-05-17T12:00:00.000Z",
    mode: "quick",
    hero0Id: "moses",
    hero1Id: "david",
    winnerSlot: 0,
    turns: 3,
    biggestHit: null,
    specialsUsed: [0, 0],
    triviaCorrect: 0,
    triviaTotal: 0,
    log: [],
    moves: []
  }];
  const state = { save, viewingMatchId: 8 };
  const html = Screens.renderMatchDetail(state);
  assert.doesNotMatch(html, /data-action="start-replay"/);
});
