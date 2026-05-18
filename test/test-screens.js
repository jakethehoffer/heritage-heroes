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
