var Main = (function () {
  const state = {
    screen: "title",        // title | mode | opponent | charselect | difficulty | battle | result | study | study-result | stats | hall
    overlay: null,          // null | 'tutorial' | 'help' | 'quit' | 'trivia' | 'reset-stats' | 'profile'
    profileHeroId: null,
    tutorialStep: 0,
    mode: null,             // 'quick' | 'arcade' | 'study'
    difficulty: "normal",   // 'normal' | 'hard'
    selecting: 1,           // 1 or 2 (which player is picking)
    controllers: ["human", "ai"], // index 0 = P1 controller; index 1 = P2 or AI
    picks: { 1: null, 2: null },  // hero ids
    match: null,            // Combat state
    arcade: null,           // { playerHeroId, defeated: [], remaining: [], firstClear: bool }
    save: null,
    trivia: null,           // { heroId, question, options, correctIndex, explanation, phase: 'question'|'result', chosenIndex? } when active
    triviaUsed: { moses: [], david: [], esther: [], judah: [], rambam: [], golda: [], einstein: [] },
    study: null,            // { heroId, questionOrder: [], currentIndex, answers: [], lastChoice, justMastered }
    // Achievement tracking (in-memory per session/match)
    triviaStreak: 0,        // consecutive correct trivia answers
    currentMatchLowHp: { 0: false, 1: false },  // per-match low-HP flag per player slot
    bossIntroShown: false   // reset at start of each arcade run
  };

  // Stable ordering for AI's random hero pick in Quick vs AI mode
  const HERO_ORDER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  // Fisher-Yates shuffle of [0..n-1]
  function shuffleIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── Achievement check ─────────────────────────────────────────────────────
  // Returns an array of newly-unlocked achievement keys (not yet in save.achievements).
  function checkAchievements() {
    const save   = state.save;
    const stats  = save.stats;
    const ach    = save.achievements;
    const newKeys = [];

    function tryUnlock(key, condition) {
      if (!ach[key] && condition) newKeys.push(key);
    }

    tryUnlock("firstWin",         stats.matchesWon >= 1);
    tryUnlock("arcadeChampion",   Object.values(save.arcade).some(n => n >= 1));
    tryUnlock("hardChampion",     !!save.hardCleared);
    tryUnlock("heroOfThePeople",  Object.values(stats.perHero).every(ph => ph.won >= 1));
    tryUnlock("triviaApprentice", stats.triviaCorrect >= 10);
    tryUnlock("triviaScholar",    stats.triviaCorrect >= 50);
    tryUnlock("triviaSage",       stats.triviaCorrect >= 150);
    tryUnlock("heritageScholar",  Object.values(save.mastered).every(Boolean));
    tryUnlock("streakOf5",        state.triviaStreak >= 5);
    tryUnlock("streakOf10",       state.triviaStreak >= 10);
    tryUnlock("centurion",        stats.matchesPlayed >= 100);
    // "comeback" and "bossSlayer" are handled explicitly in onMatchEnd

    return newKeys;
  }

  // Unlock achievements, save, and fire toasts.
  function applyAchievements(keys) {
    const store = getStore();
    if (!store) return;
    for (const key of keys) {
      Storage.unlockAchievement(store, key);
      state.save.achievements[key] = true;
      if (typeof Screens !== "undefined" && Screens.queueAchievementToast) {
        Screens.queueAchievementToast(key);
        Sfx.play("achievement");
      }
    }
  }

  function boot() {
    const store = (typeof localStorage !== "undefined") ? localStorage : { getItem: () => null, setItem: () => {} };
    state.save = Storage.load(store);
    Sfx.setMuted(!state.save.sound);
    Sfx.preload();
    if (!state.save.tutorialSeen) state.overlay = "tutorial";
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    render();
  }

  function getStore() {
    return (typeof localStorage !== "undefined") ? localStorage : null;
  }

  function render() {
    const root = document.getElementById("root");
    let body;
    if (state.screen === "title")       body = Screens.renderTitle(state);
    else if (state.screen === "mode")   body = Screens.renderModeSelect(state);
    else if (state.screen === "opponent") body = Screens.renderOpponentSelect(state);
    else if (state.screen === "difficulty") body = Screens.renderDifficultySelect(state);
    else if (state.screen === "charselect") body = Screens.renderCharSelect(state);
    else if (state.screen === "battle") body = Screens.renderBattle(state);
    else if (state.screen === "result") body = Screens.renderResult(state);
    else if (state.screen === "study") body = Screens.renderStudySession(state);
    else if (state.screen === "study-result") body = Screens.renderStudyResult(state);
    else if (state.screen === "stats") body = Screens.renderStats(state);
    else if (state.screen === "boss-intro") body = Screens.renderBossIntro(state);
    else if (state.screen === "hall") body = Screens.renderHall(state);

    let overlay = "";
    if (state.overlay === "tutorial")    overlay = Screens.renderTutorial(state.tutorialStep);
    if (state.overlay === "help")        overlay = Screens.renderHelp();
    if (state.overlay === "quit")        overlay = Screens.renderQuitConfirm(state);
    if (state.overlay === "trivia")      overlay = Screens.renderTriviaOverlay(state, state.trivia);
    if (state.overlay === "reset-stats") overlay = Screens.renderResetStatsConfirm();
    if (state.overlay === "profile")     overlay = Screens.renderProfile(state, state.profileHeroId);

    const help = state.screen !== "title" ? Screens.renderHelpButton() : "";

    root.innerHTML = body + overlay + help;
  }

  function onClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    handleAction(action, target, e);
  }

  function onKey(e) {
    if (state.screen !== "battle" || state.overlay) return;
    if (e.key === "1") dispatchMove("attack");
    else if (e.key === "2") dispatchMove("defend");
    else if (e.key === "3") dispatchMove("special");
  }

  function dispatchMove(move) {
    const ctl = state.controllers[state.match.activePlayer];
    if (ctl !== "human") return;
    playerMove(move);
  }

  function handleAction(action, target, e) {
    switch (action) {
      case "goto-title":   state.screen = "title"; state.overlay = null; render(); return;
      case "goto-mode":    state.screen = "mode"; render(); return;
      case "open-hall":    state.screen = "hall"; render(); return;
      case "view-profile": {
        e.stopPropagation();
        state.profileHeroId = target.dataset.hero;
        state.overlay = "profile";
        render();
        return;
      }
      case "close-profile":
        state.overlay = null;
        state.profileHeroId = null;
        render();
        return;
      case "start-boss-battle": startBossBattle(); return;
      case "start-quick":  startQuick(); return;
      case "start-arcade": startArcade(); return;
      case "set-opponent": setOpponent(target.dataset.opp); return;
      case "pick-hero":    pickHero(target.dataset.hero); return;
      case "player-move":  playerMove(target.dataset.move); return;
      case "ai-step":      aiStep(); return;
      case "rematch":      rematch(); return;
      case "arcade-next":  arcadeNext(); return;
      case "arcade-retry": startArcade(); return;
      case "confirm-quit":       state.overlay = "quit"; render(); return;
      case "cancel-quit":        state.overlay = null; render(); return;
      case "quit-to-title":      quitToTitle(); return;
      case "quit-to-charselect": quitToCharSelect(); return;
      case "set-difficulty":
        state.difficulty = target.dataset.difficulty === "hard" ? "hard" : "normal";
        state.screen = "charselect";
        render();
        return;
      case "show-help":    state.overlay = "help"; render(); return;
      case "close-overlay": state.overlay = null; render(); return;
      case "tutorial-next": state.tutorialStep += 1; render(); return;
      case "tutorial-prev": state.tutorialStep = Math.max(0, state.tutorialStep - 1); render(); return;
      case "tutorial-skip":
      case "tutorial-done":
        state.overlay = null;
        state.tutorialStep = 0;
        state.save.tutorialSeen = true;
        Storage.save(getStore(), state.save);
        render();
        return;
      case "view-stats":
        state.screen = "stats";
        render();
        return;

      case "confirm-reset-stats":
        state.overlay = "reset-stats";
        render();
        return;

      case "cancel-reset-stats":
        state.overlay = null;
        render();
        return;

      case "do-reset-stats": {
        const fresh = Storage.defaults();
        state.save.stats        = fresh.stats;
        state.save.achievements = fresh.achievements;
        state.save.hardCleared  = false;
        Storage.save(getStore(), state.save);
        state.save = Storage.load(getStore());
        state.overlay = null;
        render();
        return;
      }

      case "toggle-sound":
        state.save.sound = !state.save.sound;
        Sfx.setMuted(!state.save.sound);
        Storage.save(getStore(), state.save);
        render();
        return;

      case "trivia-answer": {
        if (!state.trivia) return;
        const chosenIdx = parseInt(target.dataset.index, 10);
        const isCorrect = chosenIdx === state.trivia.correctIndex;
        state.trivia.phase = "result";
        state.trivia.chosenIndex = chosenIdx;

        // Record trivia stat and update streak
        const tStore = getStore();
        if (tStore) {
          Storage.recordTrivia(tStore, state.trivia.heroId, isCorrect);
          state.save = Storage.load(tStore);
        }
        if (isCorrect) {
          state.triviaStreak += 1;
          Sfx.play("triviaCorrect");
        } else {
          state.triviaStreak = 0;
          Sfx.play("triviaWrong");
        }

        // Check achievements after trivia
        const triviaAch = checkAchievements();
        applyAchievements(triviaAch);

        render();
        return;
      }

      case "trivia-close": {
        const wasCorrect = state.trivia
          && state.trivia.phase === "result"
          && state.trivia.chosenIndex !== undefined
          && state.trivia.chosenIndex === state.trivia.correctIndex;
        const triviaHeroId = state.trivia ? state.trivia.heroId : null;
        state.overlay = null;
        state.trivia = null;
        if (wasCorrect) {
          // Correct answer — fire the Special
          resolveMove("special");
        } else {
          // Wrong answer — fumble: consume the turn with no effect
          _fumbleTurn(triviaHeroId);
        }
        return;
      }

      case "trivia-skip": {
        // Skip resets streak
        state.triviaStreak = 0;
        const skipHeroId = state.trivia ? state.trivia.heroId : null;
        state.overlay = null;
        state.trivia = null;
        _fumbleTurn(skipHeroId);
        return;
      }

      case "start-study":
        state.mode = "study";
        state.controllers = ["human", "human"];
        state.screen = "charselect";
        render();
        return;

      case "study-answer": {
        if (!state.study || state.study.lastChoice !== null) return;
        const chosenIdx = parseInt(target.dataset.index, 10);
        state.study.lastChoice = chosenIdx;
        state.study.answers.push(chosenIdx);
        render();
        return;
      }

      case "study-next":
        if (!state.study) return;
        state.study.currentIndex += 1;
        state.study.lastChoice = null;
        render();
        return;

      case "study-finish": {
        if (!state.study) return;
        const hero = Heroes.byId(state.study.heroId);
        const studyScore = state.study.answers.reduce((acc, chosen, i) => {
          const qIdx = state.study.questionOrder[i];
          return acc + (chosen === hero.trivia[qIdx].correctIndex ? 1 : 0);
        }, 0);
        if (studyScore === 20 && !state.save.mastered[state.study.heroId]) {
          state.study.justMastered = true;
          state.save.mastered[state.study.heroId] = true;
          Storage.markMastered(getStore(), state.study.heroId);
          state.save = Storage.load(getStore());
        }
        state.screen = "study-result";
        render();
        return;
      }

      case "study-restart": {
        if (!state.study) return;
        const restartHeroId = state.study.heroId;
        state.study = {
          heroId: restartHeroId,
          questionOrder: shuffleIndices(20),
          currentIndex: 0,
          answers: [],
          lastChoice: null,
          justMastered: false
        };
        state.screen = "study";
        render();
        return;
      }

      case "study-another":
        state.study = null;
        state.mode = "study";
        state.screen = "charselect";
        render();
        return;
    }
  }

  function startQuick() {
    state.mode = "quick";
    state.controllers = ["human", "ai"]; // overridden by setOpponent
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.screen = "opponent";
    render();
  }

  function setOpponent(opp) {
    state.controllers = ["human", opp === "human" ? "human" : "ai"];
    state.screen = "charselect";
    render();
  }

  function startArcade() {
    state.mode = "arcade";
    state.controllers = ["human", "ai"];
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.arcade = null;
    state.bossIntroShown = false;
    if (state.save && state.save.hardUnlocked) {
      // Show difficulty selection before char select
      state.screen = "difficulty";
    } else {
      state.difficulty = "normal";
      state.screen = "charselect";
    }
    render();
  }

  function pickHero(heroId) {
    state.picks[state.selecting] = heroId;

    if (state.mode === "study") {
      state.study = {
        heroId,
        questionOrder: shuffleIndices(20),
        currentIndex: 0,
        answers: [],
        lastChoice: null,
        justMastered: false
      };
      state.screen = "study";
      render();
      return;
    }

    if (state.mode === "arcade") {
      state.arcade = {
        playerHeroId: heroId,
        defeated: [],
        remaining: Combat.arcadeOrder(heroId).slice()
      };
      startNextArcadeMatch();
      return;
    }

    if (state.selecting === 1) {
      // If P2 is AI, auto-pick a random hero (not P1's choice) and start
      if (state.controllers[1] === "ai") {
        const choices = HERO_ORDER.filter(id => id !== heroId);
        state.picks[2] = choices[Math.floor(Math.random() * choices.length)];
        state.currentMatchLowHp = { 0: false, 1: false };
        state.match = Combat.createMatch(state.picks[1], state.picks[2]);
        state.screen = "battle";
        render();
        return;
      }
      state.selecting = 2;
      render();
      return;
    }
    // Both human and both picked → begin
    state.currentMatchLowHp = { 0: false, 1: false };
    state.match = Combat.createMatch(state.picks[1], state.picks[2]);
    state.screen = "battle";
    render();
  }

  function startNextArcadeMatch() {
    const isBossFight = state.arcade.remaining.length === 1;
    // Show boss intro screen once per run, before the final fight
    if (isBossFight && !state.bossIntroShown) {
      state.bossIntroShown = true;
      state.screen = "boss-intro";
      render();
      return;
    }
    _launchArcadeMatch();
  }

  function _launchArcadeMatch() {
    const isBossFight = state.arcade.remaining.length === 1;
    const opponent = state.arcade.remaining[0];
    const hardMode = state.difficulty === "hard";
    state.currentMatchLowHp = { 0: false, 1: false };
    const opts = { hardMode, hardOpponentSlot: 1 };
    if (isBossFight) opts.bossSlot = 1;
    state.match = Combat.createMatch(
      state.arcade.playerHeroId,
      opponent,
      opts
    );
    state.screen = "battle";
    render();
  }

  function startBossBattle() {
    _launchArcadeMatch();
  }

  function playerMove(move) {
    if (!state.match || state.match.winner !== null) return;
    if (state.controllers[state.match.activePlayer] !== "human") return;

    // Trivia gate: every Special attempt by a human player opens the quiz
    if (move === "special") {
      const activeHeroId = state.match.players[state.match.activePlayer].heroId;
      // Check cooldown first — if on cooldown, fall through to resolveMove which will reject it
      const playerState = state.match.players[state.match.activePlayer];
      if (playerState.specialCooldown <= 0) {
        const usedIndices = (state.triviaUsed && state.triviaUsed[activeHeroId]) || [];
        const result = Heroes.pickTrivia(activeHeroId, usedIndices);
        if (result) {
          // Track the used index and handle cycle reset
          if (!state.triviaUsed[activeHeroId]) state.triviaUsed[activeHeroId] = [];
          state.triviaUsed[activeHeroId].push(result.index);
          if (result.exhausted) {
            // Reset after this turn so the next pick has access to all questions again
            window.setTimeout(() => { state.triviaUsed[activeHeroId] = []; }, 0);
          }
          state.trivia = {
            heroId: activeHeroId,
            question: result.trivia.question,
            options: result.trivia.options,
            correctIndex: result.trivia.correctIndex,
            explanation: result.trivia.explanation,
            phase: "question"
          };
          state.overlay = "trivia";
          render();
          return;
        }
      }
    }

    resolveMove(move);
  }

  function aiStep() {
    if (!state.match || state.match.winner !== null) return;
    const idx = state.match.activePlayer;
    if (state.controllers[idx] !== "ai" && !Combat.isCharging(state.match, idx)) return;
    const move = Combat.chooseAIMove(state.match, idx, null, state.difficulty);
    resolveMove(move);
  }

  function resolveMove(move) {
    const idx = state.match.activePlayer;
    const activeHeroId = state.match.players[idx].heroId;
    const wasSpecialOrCharge = (move === "special" || move === "charge");

    // Snapshot HP before applying move so we can compute damage deltas
    const hpBefore = state.match.players.map(p => p.hp);

    try {
      Combat.applyMove(state.match, move);
    } catch (err) {
      console.warn(err);
      return;
    }

    const lastLog = state.match.log[state.match.log.length - 1] || "";
    const kind = wasSpecialOrCharge ? "special" : move;
    const isUnleash = wasSpecialOrCharge && lastLog.toLowerCase().includes("unleash");
    const isChargeTick = wasSpecialOrCharge && !isUnleash && move === "charge";

    // Compute HP deltas BEFORE re-rendering (so we use the pre/post snapshot)
    const deltas = state.match.players.map((p, i) => hpBefore[i] - p.hp);

    // CRITICAL: render BEFORE applying animations. render() does
    // root.innerHTML = ... which destroys every existing DOM node, so any
    // animation class or FX overlay applied before render() gets wiped out
    // before it can paint. Render first → fresh DOM → then animate.
    render();

    // Now apply visual feedback to the freshly-rendered DOM.
    // Note: the move name appears in the bottom move-log via renderBattle;
    // no center-of-arena callout is rendered.
    Screens.animateAction(idx, kind);
    Sfx.play(move === "attack" ? "attack" : move === "defend" ? "defend" : activeHeroId);

    if (move === "special" || isUnleash) {
      Screens.playSpecialFx(idx, activeHeroId);
    } else if (isChargeTick && activeHeroId === "einstein") {
      Screens.playChargeFx(idx);
      Sfx.play("chargeTick");
    }

    deltas.forEach((delta, pIdx) => {
      if (delta > 0) {
        // This player took damage
        Screens.flashHit(pIdx);
        Screens.showDamageNumber(pIdx, delta, "damage");
        Sfx.play("hit");
        // Play attack slash FX on the hit target for basic attacks
        if (move === "attack") {
          Screens.playAttackFx(pIdx, activeHeroId);
        }
        // Track low-HP flag for comeback achievement
        const newHp = state.match.players[pIdx].hp;
        if (newHp < 20 && !state.currentMatchLowHp[pIdx]) {
          state.currentMatchLowHp[pIdx] = true;
        }
      } else if (delta < 0) {
        // This player was healed (negative delta = HP gained)
        Screens.showDamageNumber(pIdx, Math.abs(delta), "heal");
      }
    });

    if (move === "defend") {
      Screens.playDefendFx(idx, activeHeroId);
    }

    if (state.match.winner !== null) {
      window.setTimeout(onMatchEnd, 1500);
      return;
    }

    // Auto-trigger AI on next tick if it's their turn
    // Delays account for the full animation budget
    if (state.controllers[state.match.activePlayer] === "ai") {
      let delay;
      if (move === "special" || isUnleash) delay = 2200;
      else if (move === "defend") delay = 1500;
      else delay = 1800;
      window.setTimeout(aiStep, delay);
    }
  }

  function onMatchEnd() {
    Sfx.play("victory");
    const store = getStore();

    const winnerIdx  = state.match.winner;
    const winnerHero = state.match.players[winnerIdx].heroId;
    const loserHero  = state.match.players[1 - winnerIdx].heroId;
    const newAchKeys = [];

    if (state.mode === "arcade") {
      const playerSlot = state.match.players.findIndex(p => p.heroId === state.arcade.playerHeroId);
      const playerWon  = state.match.winner === playerSlot;
      if (playerWon) {
        const beaten = state.arcade.remaining.shift();
        state.arcade.defeated.push(beaten);
        if (state.arcade.remaining.length === 0) {
          // Whole arcade ladder complete
          Storage.incrementArcadeWin(store, state.arcade.playerHeroId);
          // Track hard mode clear
          if (state.difficulty === "hard" && store) {
            const tmpData = Storage.load(store);
            tmpData.hardCleared = true;
            Storage.save(store, tmpData);
          }
          // Check if this is the first time hard mode gets unlocked
          const wasAlreadyUnlocked = state.save && state.save.hardUnlocked;
          if (!wasAlreadyUnlocked) {
            state.arcade.firstClear = true;
          }
          state.save = Storage.load(store);
          // Unlock hard mode if not already unlocked
          if (!state.save.hardUnlocked) {
            state.save.hardUnlocked = true;
            Storage.save(store, state.save);
          }
        }
      }
    }

    // Record match result in stats (winner is the match winner, not necessarily the player)
    if (store) {
      Storage.recordMatch(store, winnerHero, loserHero);
      state.save = Storage.load(store);
    }

    // Determine if the human player won (slot 0 in quick/arcade, always player 1)
    const humanSlot = state.controllers.indexOf("human");
    const humanWon  = humanSlot !== -1 && state.match.winner === humanSlot;

    // Comeback achievement: human won AND their HP dropped below 20 this match
    if (humanWon && state.currentMatchLowHp[humanSlot] && !state.save.achievements.comeback) {
      newAchKeys.push("comeback");
    }

    // Boss Slayer achievement: human won a boss fight in arcade mode
    if (humanWon && state.mode === "arcade" && !state.save.achievements.bossSlayer) {
      const bossSlot = state.match.players.findIndex(p => p.bossTwist === true);
      if (bossSlot !== -1 && state.match.winner !== bossSlot) {
        newAchKeys.push("bossSlayer");
      }
    }

    // Reset per-match low-HP flags for the next match
    state.currentMatchLowHp = { 0: false, 1: false };

    // Check all other achievements
    newAchKeys.push(...checkAchievements());

    applyAchievements(newAchKeys);

    state.screen = "result";
    render();
  }

  function quitToTitle() {
    state.overlay = null;
    state.match = null;
    state.arcade = null;
    state.study = null;
    state.picks = { 1: null, 2: null };
    state.selecting = 1;
    state.screen = "title";
    render();
  }

  function quitToCharSelect() {
    // Returns to character select, preserving the current mode and controllers.
    // In arcade, this restarts the ladder (player must repick their hero).
    state.overlay = null;
    state.match = null;
    state.arcade = null;
    state.picks = { 1: null, 2: null };
    state.selecting = 1;
    state.screen = "charselect";
    render();
  }

  function rematch() {
    state.currentMatchLowHp = { 0: false, 1: false };
    state.match = Combat.createMatch(state.picks[1], state.picks[2]);
    state.screen = "battle";
    render();
  }

  function arcadeNext() {
    startNextArcadeMatch();
  }

  // Consume the active player's turn without any combat effect (fumbled trivia).
  // Pushes a log entry, advances the turn, re-renders, and schedules AI if needed.
  function _fumbleTurn(heroId) {
    if (!state.match || state.match.winner !== null) return;
    const hero = Heroes.byId(heroId);
    const heroName = hero ? hero.name : "Hero";
    state.match.log.push(`${heroName} fumbled the trivia and lost their turn.`);
    // Advance turn manually (no combat math, no cooldown changes)
    state.match.activePlayer = 1 - state.match.activePlayer;
    state.match.turnNumber = (state.match.turnNumber || 0) + 1;
    render();
    if (state.controllers[state.match.activePlayer] === "ai") {
      window.setTimeout(aiStep, 1500);
    }
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", boot);

  return { state, render, _testHook: { handleAction, resolveMove, _fumbleTurn } };
})();

if (typeof module !== "undefined") module.exports = Main;
