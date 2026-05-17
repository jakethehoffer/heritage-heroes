var Main = (function () {
  // ── PWA install prompt capture ────────────────────────────────────────────
  // Capture beforeinstallprompt so the Settings page can show an "Install App"
  // button on browsers that support it (Chrome/Edge desktop & Android).
  // iOS uses the Share → "Add to Home Screen" flow instead, which we document
  // in renderSettings but cannot trigger programmatically.
  let deferredInstallPrompt = null;

  if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });
  }
  const state = {
    screen: "title",        // title | mode | opponent | charselect | difficulty | battle | result | study | study-result | stats | hall | endless-continue | endless-result | settings | trophy-room
    trophyFilter: "all",   // "all" | "unlocked" | "locked"
    trophySort:   "recent", // "recent" | "category" | "progress"
    overlay: null,          // null | 'tutorial' | 'help' | 'quit' | 'trivia' | 'reset-stats' | 'profile' | 'reset-all' | 'daily-already-done'
    profileHeroId: null,
    tutorialStep: 0,
    mode: null,             // 'quick' | 'arcade' | 'study' | 'endless' | 'daily' | 'tournament' | 'spectator'
    difficulty: "normal",   // 'normal' | 'hard'
    selecting: 1,           // 1 or 2 (which player is picking)
    controllers: ["human", "ai"], // index 0 = P1 controller; index 1 = P2 or AI
    picks: { 1: null, 2: null },  // hero ids
    match: null,            // Combat state
    matchStats: null,       // { biggestHit, specialsUsed, triviaCorrect, triviaTotal, triviaSeen }
    arcade: null,           // { playerHeroId, defeated: [], remaining: [], firstClear: bool }
    endless: null,          // { heroId, streak, lastOpponentId, carriedHp?, healInfo?, nextOpponentId?, isNewBest?, previousBest? } when active
    tournament: null,       // { playerHeroId, slots: [4 hero ids], bracket: { semi1Winner, semi2Winner, semi2Log, finalWinner }, currentMatch: "semi1"|"final" } when active
    save: null,
    trivia: null,           // { heroId, question, options, correctIndex, explanation, phase: 'question'|'result', chosenIndex? } when active
    triviaUsed: { moses: [], david: [], esther: [], judah: [], rambam: [], golda: [], einstein: [] },
    study: null,            // { heroId, questionOrder: [], currentIndex, answers: [], lastChoice, justMastered }
    viewingMatchId: null,    // epoch ms id of match being viewed in detail overlay
    // Achievement tracking (in-memory per session/match)
    triviaStreak: 0,        // consecutive correct trivia answers
    currentMatchLowHp: { 0: false, 1: false },  // per-match low-HP flag per player slot
    bossIntroShown: false,  // reset at start of each arcade run
    // Title screen featured hero rotation
    titleFeaturedIndex: 0,  // index into Heroes.list for currently featured hero
    titleFeaturedTimer: null, // interval id, cleared when leaving title
    // Daily Challenge
    dailyChallenge: null,   // { isoDate, playerHeroId, opponentHeroId, difficulty } | null
    dailyToday: null,       // { challenge, stats } precomputed for title screen
    // Pause support
    pendingAiTimeout: null,      // id of scheduled aiStep timeout (clearable on pause)
    pendingMatchEndTimeout: null // id of scheduled onMatchEnd timeout (clearable on pause)
  };

  function _freshMatchStats() {
    return {
      biggestHit: null,       // { damage, attackerName, targetName, moveName } | null
      specialsUsed: [0, 0],   // count per player slot
      triviaCorrect: 0,
      triviaTotal: 0,
      triviaSeen: {}          // heroId -> array of trivia indices seen this match
    };
  }

  // Stable ordering for AI's random hero pick in Quick vs AI mode
  const HERO_ORDER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  // ── Share-via-URL helpers ─────────────────────────────────────────────────

  function parseIncomingChallenge() {
    if (typeof window === "undefined" || !window.location || !window.location.search) return null;
    const params = new URLSearchParams(window.location.search);
    const type = params.get("share");
    if (!type) return null;

    const validHero = (h) => HERO_ORDER.includes(h);
    const from = params.get("from") || null;

    if (type === "daily") {
      return { type: "daily", from };
    }
    if (type === "quick") {
      const p = params.get("p");
      const o = params.get("o");
      const d = params.get("d");
      if (!validHero(p) || !validHero(o) || p === o) return null;
      const hard = d === "hard";
      return { type: "quick", playerHeroId: p, opponentHeroId: o, hard, from };
    }
    if (type === "endless") {
      const h = params.get("h");
      const s = parseInt(params.get("s") || "0", 10);
      if (!validHero(h)) return null;
      return { type: "endless", heroId: h, streakToBeat: Math.max(0, s), from };
    }
    if (type === "arcade") {
      const h = params.get("h");
      if (!validHero(h)) return null;
      return { type: "arcade", heroId: h, from };
    }
    if (type === "tournament") {
      const h = params.get("h");
      if (!validHero(h)) return null;
      return { type: "tournament", heroId: h, from };
    }
    return null;
  }

  function buildShareUrl(type, params) {
    const base = window.location.origin + window.location.pathname;
    const search = new URLSearchParams();
    search.set("share", type);
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") search.set(k, String(v));
    }
    return base + "?" + search.toString();
  }

  function copyToClipboard(text) {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  function copyShareLink(type, params) {
    const url = buildShareUrl(type, params);
    copyToClipboard(url).then(
      () => Screens.showToast && Screens.showToast("Link copied! Send it to a friend."),
      () => Screens.showToast && Screens.showToast("Copy failed — please copy from address bar.")
    );
  }

  function acceptChallenge() {
    const c = state.incomingChallenge;
    if (!c) return;
    state.incomingChallenge = null;

    if (c.type === "daily") {
      startDaily();
      return;
    }
    if (c.type === "quick") {
      state.mode = "quick";
      state.controllers = ["human", "ai"];
      state.difficulty = c.hard ? "hard" : "normal";
      state.picks = { 1: c.playerHeroId, 2: c.opponentHeroId };
      state.matchStats = _freshMatchStats();
      state.bossIntroShown = true;
      state.match = Combat.createMatch(c.playerHeroId, c.opponentHeroId, {
        hardMode: c.hard,
        hardOpponentSlot: 1
      });
      state.screen = "battle";
      render();
      return;
    }
    if (c.type === "endless") {
      state.incomingEndlessStreakToBeat = c.streakToBeat;
      state.mode = "endless";
      state.controllers = ["human", "ai"];
      state.endless = { heroId: c.heroId, streak: 0, lastOpponentId: null };
      startNextEndlessMatch();
      return;
    }
    if (c.type === "arcade") {
      state.mode = "arcade";
      state.controllers = ["human", "ai"];
      state.difficulty = "normal";
      state.arcade = {
        playerHeroId: c.heroId,
        defeated: [],
        remaining: Combat.arcadeOrder(c.heroId).slice()
      };
      state.bossIntroShown = false;
      startNextArcadeMatch();
      return;
    }
    if (c.type === "tournament") {
      state.mode = "tournament";
      state.controllers = ["human", "ai"];
      state.picks = { 1: c.heroId, 2: null };
      state.selecting = 1;
      pickHero(c.heroId);
      return;
    }
  }

  // Fisher-Yates shuffle of [0..n-1]
  function shuffleIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── Headless AI vs AI simulation ─────────────────────────────────────────
  function simulateAiVsAi(heroAId, heroBId) {
    const m = Combat.createMatch(heroAId, heroBId);
    let safety = 200;
    while (m.winner === null && safety-- > 0) {
      const idx = m.activePlayer;
      let move;
      if (Combat.isCharging(m, idx)) {
        move = "charge";
      } else {
        move = Combat.chooseAIMove(m, idx, Math.random, "normal");
      }
      Combat.applyMove(m, move);
    }
    return {
      winner: m.winner,
      turns: m.turnNumber - 1,
      log: m.log
    };
  }

  // ── Daily Challenge helpers ───────────────────────────────────────────────

  const DAILY_HEROES = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getDailyChallenge(isoDate) {
    let hash = 0;
    for (let i = 0; i < isoDate.length; i++) hash = (hash * 31 + isoDate.charCodeAt(i)) >>> 0;

    const playerIdx = hash % 7;
    const opponentOffset = 1 + (Math.floor(hash / 7) % 6);  // 1..6
    const opponentIdx = (playerIdx + opponentOffset) % 7;

    const dayOfYear = (function () {
      const d = new Date(isoDate + "T12:00:00");
      const start = new Date(d.getFullYear(), 0, 0);
      return Math.floor((d - start) / 86400000);
    }());
    const difficulty = (dayOfYear % 3 === 0) ? "hard" : "normal";

    return {
      isoDate,
      playerHeroId: DAILY_HEROES[playerIdx],
      opponentHeroId: DAILY_HEROES[opponentIdx],
      difficulty
    };
  }

  function startDaily() {
    const todayDate = todayIso();
    const challenge = getDailyChallenge(todayDate);
    const store = getStore();
    const ds = Storage.dailyStats(store);
    if (ds.completedToday) {
      state.overlay = "daily-already-done";
      render();
      return;
    }
    state.mode = "daily";
    state.controllers = ["human", "ai"];
    state.difficulty = challenge.difficulty;
    state.dailyChallenge = challenge;
    state.picks = { 1: challenge.playerHeroId, 2: challenge.opponentHeroId };
    state.currentMatchLowHp = { 0: false, 1: false };
    state.matchStats = _freshMatchStats();
    state.bossIntroShown = true;  // skip any boss flow for daily
    state.match = Combat.createMatch(
      challenge.playerHeroId,
      challenge.opponentHeroId,
      { hardMode: challenge.difficulty === "hard", hardOpponentSlot: 1 }
    );
    state.screen = "battle";
    render();
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

    // Endless Survival achievements
    const maxEndless = Math.max(0, ...Object.values(save.endlessHighScore || {}));
    tryUnlock("endlessSurvivor", maxEndless >= 5);
    tryUnlock("endlessMarathon", maxEndless >= 10);
    tryUnlock("endlessLegend",   maxEndless >= 20);

    // Daily Challenge streak achievements
    const ds = Storage.dailyStats(getStore());
    tryUnlock("dailyStreak3",  ds.currentStreak >= 3 || ds.bestStreak >= 3);
    tryUnlock("dailyStreak7",  ds.currentStreak >= 7 || ds.bestStreak >= 7);
    tryUnlock("dailyStreak30", ds.currentStreak >= 30 || ds.bestStreak >= 30);

    // Tournament achievements
    tryUnlock("tournamentWinner", (save.tournamentsWon || 0) >= 1);
    tryUnlock("tournamentMaster",  (save.tournamentsWon || 0) >= 5);
    tryUnlock("tournamentLegend",  (save.tournamentsWon || 0) >= 20);

    return newKeys;
  }

  // Unlock achievements, save, and fire toasts.
  function applyAchievements(keys) {
    const store = getStore();
    if (!store) return;
    for (const key of keys) {
      Storage.unlockAchievement(store, key);
      state.save.achievements[key] = Date.now();
      if (typeof Screens !== "undefined" && Screens.queueAchievementToast) {
        Screens.queueAchievementToast(key);
        Sfx.play("achievement");
      }
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      // Service workers require HTTPS or localhost. Skip silently on file://, etc.
      return;
    }
    // Use a relative URL so it works under GitHub Pages subpath as well as root
    navigator.serviceWorker.register("sw.js").catch(() => {
      // Swallow errors — SW failure shouldn't block gameplay
    });
  }

  function boot() {
    const store = (typeof localStorage !== "undefined") ? localStorage : { getItem: () => null, setItem: () => {} };
    state.save = Storage.load(store);
    Sfx.setMusicMuted(!state.save.music);
    Sfx.setSfxMuted(!state.save.sfx);
    Sfx.preload();
    // Randomise starting featured hero so each session feels fresh
    state.titleFeaturedIndex = Math.floor(Math.random() * Heroes.list.length);
    if (!state.save.tutorialSeen) state.overlay = "tutorial";
    // Parse and consume incoming share challenge from URL
    state.incomingChallenge = parseIncomingChallenge();
    if (state.incomingChallenge && window.history && window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    render();
    registerServiceWorker();
  }

  function getStore() {
    return (typeof localStorage !== "undefined") ? localStorage : null;
  }

  function render() {
    const root = document.getElementById("root");

    // Clear featured hero timer when leaving the title screen
    if (state.screen !== "title" && state.titleFeaturedTimer) {
      clearInterval(state.titleFeaturedTimer);
      state.titleFeaturedTimer = null;
    }

    // Start featured hero rotation timer when on title screen
    if (state.screen === "title" && !state.titleFeaturedTimer) {
      state.titleFeaturedTimer = setInterval(function () {
        state.titleFeaturedIndex = (state.titleFeaturedIndex + 1) % Heroes.list.length;
        if (state.screen === "title") render();
      }, 8000);
    }

    // Precompute daily challenge info for title screen
    if (state.screen === "title") {
      state.dailyToday = {
        challenge: getDailyChallenge(todayIso()),
        stats: Storage.dailyStats(getStore())
      };
    }

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
    else if (state.screen === "endless-continue") body = Screens.renderEndlessContinue(state);
    else if (state.screen === "endless-result")   body = Screens.renderEndlessResult(state);
    else if (state.screen === "settings")         body = Screens.renderSettings(state);
    else if (state.screen === "history")          body = Screens.renderHistory(state);
    else if (state.screen === "timeline")         body = Screens.renderTimeline(state);
    else if (state.screen === "tournament-bracket") body = Screens.renderTournamentBracket(state);
    else if (state.screen === "tournament-result")  body = Screens.renderTournamentResult(state);
    else if (state.screen === "trophy-room")        body = Screens.renderTrophyRoom(state);

    // ── Ambient music routing ────────────────────────────────────────────────
    // Play stage music during battle; stop it on any other screen.
    // The stage is fixed for the match at players[1]'s hero (P2 is the initial defender).
    // playMusic is no-op if already on the same stage, so it's safe to call every render.
    if (state.screen === "battle" && state.match) {
      const defenderHeroId = state.match.players[1].heroId;
      const defenderHero = (typeof Heroes !== "undefined") && Heroes.byId(defenderHeroId);
      if (defenderHero && defenderHero.stageId) {
        Sfx.playMusic(defenderHero.stageId);
      }
    } else {
      Sfx.stopMusic();
    }

    let overlay = "";
    if (state.overlay === "tutorial")     overlay = Screens.renderTutorial(state.tutorialStep);
    if (state.overlay === "help")         overlay = Screens.renderHelp();
    if (state.overlay === "quit")         overlay = Screens.renderQuitConfirm(state);
    if (state.overlay === "trivia")       overlay = Screens.renderTriviaOverlay(state, state.trivia);
    if (state.overlay === "reset-stats")  overlay = Screens.renderResetStatsConfirm();
    if (state.overlay === "reset-all")    overlay = Screens.renderResetAllConfirm();
    if (state.overlay === "profile")      overlay = Screens.renderProfile(state, state.profileHeroId);
    if (state.overlay === "match-detail") overlay = Screens.renderMatchDetail(state);
    if (state.overlay === "daily-already-done") overlay = Screens.renderDailyAlreadyDone(state);
    if (state.overlay === "pause")        overlay = Screens.renderPauseOverlay(state);
    if (state.overlay === "battle-log")   overlay = Screens.renderBattleLog(state);

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
    if (e.key === "Escape") {
      if (state.screen === "battle" && !state.overlay) {
        handleAction("pause-battle", null);
        e.preventDefault();
      } else if (state.overlay === "pause") {
        handleAction("resume-battle", null);
        e.preventDefault();
      }
      return;
    }
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
      case "open-trophy-room": state.screen = "trophy-room"; render(); return;
      case "trophy-filter": state.trophyFilter = target.dataset.filter; render(); return;
      case "trophy-sort":   state.trophySort   = target.dataset.sort;   render(); return;
      case "open-hall":      state.screen = "hall"; render(); return;
      case "open-timeline":  state.screen = "timeline"; render(); return;
      case "open-history":   state.screen = "history"; render(); return;
      case "view-match-detail": {
        e.stopPropagation();
        state.viewingMatchId = parseInt(target.dataset.matchId, 10);
        state.overlay = "match-detail";
        render();
        return;
      }
      case "close-match-detail":
        state.overlay = null;
        state.viewingMatchId = null;
        render();
        return;
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
      case "start-endless":     startEndless(); return;
      case "continue-endless":  continueEndless(); return;
      case "end-endless-run":   endEndlessRun(); return;
      case "retry-endless":     retryEndless(); return;
      case "pick-different-hero": pickDifferentHero(); return;
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

      case "open-settings":
        state.screen = "settings";
        render();
        return;

      case "set-anim-speed": {
        const speed = target.dataset.speed;
        if (speed === "slow" || speed === "normal" || speed === "fast") {
          state.save.animSpeed = speed;
          Storage.save(getStore(), state.save);
        }
        render();
        return;
      }

      case "reset-all-prompt":
        state.overlay = "reset-all";
        render();
        return;

      case "confirm-reset-all": {
        const store = getStore();
        if (store) Storage.resetAll(store);
        state.save = store ? Storage.load(store) : Storage.defaults();
        // Clear in-memory volatile state
        state.triviaUsed = { moses: [], david: [], esther: [], judah: [], rambam: [], golda: [], einstein: [] };
        state.currentMatchLowHp = { 0: false, 1: false };
        state.triviaStreak = 0;
        state.bossIntroShown = false;
        state.tournament = null;
        state.overlay = null;
        state.screen = "title";
        render();
        return;
      }

      case "cancel-reset-all":
        state.overlay = null;
        render();
        return;

      case "toggle-sound":
        // backward compat — toggle both music and sfx together
        {
          const both = !(state.save.music && state.save.sfx);
          state.save.music = both;
          state.save.sfx = both;
          state.save.sound = both;
          Sfx.setMusicMuted(!both);
          Sfx.setSfxMuted(!both);
          Storage.save(getStore(), state.save);
          render();
        }
        return;

      case "toggle-music":
        state.save.music = !state.save.music;
        Sfx.setMusicMuted(!state.save.music);
        Storage.save(getStore(), state.save);
        render();
        return;

      case "toggle-sfx":
        state.save.sfx = !state.save.sfx;
        Sfx.setSfxMuted(!state.save.sfx);
        Storage.save(getStore(), state.save);
        render();
        return;

      case "pause-battle":
        if (state.pendingAiTimeout) { clearTimeout(state.pendingAiTimeout); state.pendingAiTimeout = null; }
        if (state.pendingMatchEndTimeout) { clearTimeout(state.pendingMatchEndTimeout); state.pendingMatchEndTimeout = null; }
        state.overlay = "pause";
        render();
        return;

      case "resume-battle":
        state.overlay = null;
        render();
        // Reschedule AI if it's their turn and match is still ongoing
        if (state.match && !state.match.winner && state.controllers[state.match.activePlayer] === "ai") {
          state.pendingAiTimeout = window.setTimeout(aiStep, scaledDelay(1500));
        }
        return;

      case "view-battle-log":
        state.overlay = "battle-log";
        render();
        return;

      case "close-battle-log":
        state.overlay = "pause";
        render();
        return;

      case "trivia-answer": {
        if (!state.trivia) return;
        const chosenIdx = parseInt(target.dataset.index, 10);
        const isCorrect = chosenIdx === state.trivia.correctIndex;
        state.trivia.phase = "result";
        state.trivia.chosenIndex = chosenIdx;

        // Track per-match trivia stats
        if (state.matchStats) {
          state.matchStats.triviaTotal += 1;
          if (isCorrect) state.matchStats.triviaCorrect += 1;
          // Record the trivia question index so "Did You Know?" can avoid it
          const tHeroId = state.trivia.heroId;
          const tIdx = state.trivia.triviaIndex;
          if (tHeroId && typeof tIdx === "number") {
            if (!state.matchStats.triviaSeen[tHeroId]) state.matchStats.triviaSeen[tHeroId] = [];
            if (!state.matchStats.triviaSeen[tHeroId].includes(tIdx)) {
              state.matchStats.triviaSeen[tHeroId].push(tIdx);
            }
          }
        }

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

      case "start-spectator": startSpectator(); return;
      case "start-tournament": startTournament(); return;
      case "begin-tournament": beginTournament(); return;
      case "continue-to-final": continueToFinal(); return;

      case "start-daily":
        startDaily();
        return;

      case "close-daily-already-done":
        state.overlay = null;
        render();
        return;

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

      case "accept-challenge": acceptChallenge(); return;
      case "dismiss-challenge":
        state.incomingChallenge = null;
        render();
        return;

      case "share-daily":     copyShareLink("daily", {}); return;
      case "share-quick": {
        const m = state.match;
        if (!m) return;
        copyShareLink("quick", {
          p: m.players[0].heroId,
          o: m.players[1].heroId,
          d: state.difficulty === "hard" ? "hard" : ""
        });
        return;
      }
      case "share-endless": {
        if (!state.endless) return;
        copyShareLink("endless", {
          h: state.endless.heroId,
          s: state.endless.streak
        });
        return;
      }
      case "share-arcade": {
        if (!state.arcade) return;
        copyShareLink("arcade", { h: state.arcade.playerHeroId });
        return;
      }
      case "share-tournament": {
        if (!state.tournament) return;
        copyShareLink("tournament", { h: state.tournament.slots[0] });
        return;
      }

      case "install-app":
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.then(() => {
            deferredInstallPrompt = null;
            // Re-render so the button disappears if the app was installed
            render();
          });
        }
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

  function startEndless() {
    state.mode = "endless";
    state.controllers = ["human", "ai"];
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.endless = null;
    state.screen = "charselect";
    render();
  }

  function startTournament() {
    state.mode = "tournament";
    state.controllers = ["human", "ai"];
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.tournament = null;
    state.screen = "charselect";
    render();
  }

  function startSpectator() {
    state.mode = "spectator";
    state.controllers = ["ai", "ai"];
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.difficulty = "normal";
    state.screen = "charselect";
    render();
  }

  function beginTournament() {
    const t = state.tournament;
    t.currentMatch = "semi1";
    state.matchStats = _freshMatchStats();
    state.bossIntroShown = true;
    state.match = Combat.createMatch(t.slots[0], t.slots[1]);
    state.screen = "battle";
    render();
  }

  function continueToFinal() {
    const t = state.tournament;
    t.currentMatch = "final";
    state.matchStats = _freshMatchStats();
    state.match = Combat.createMatch(t.slots[0], t.bracket.semi2Winner);
    state.screen = "battle";
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

    if (state.mode === "endless") {
      state.endless = {
        heroId,
        streak: 0,
        lastOpponentId: null
      };
      startNextEndlessMatch();
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

    if (state.mode === "tournament") {
      const otherHeroes = HERO_ORDER.filter(id => id !== heroId);
      const shuffled = otherHeroes.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const ais = shuffled.slice(0, 3);
      state.tournament = {
        playerHeroId: heroId,
        slots: [heroId, ais[0], ais[1], ais[2]],
        bracket: {
          semi1Winner: null,
          semi2Winner: null,
          semi2Log: null,
          finalWinner: null
        },
        currentMatch: null
      };
      state.screen = "tournament-bracket";
      render();
      return;
    }

    if (state.mode === "spectator") {
      if (state.selecting === 1) {
        state.selecting = 2;
        render();
        return;
      }
      // Both picked — start the match with both controllers as AI
      state.matchStats = _freshMatchStats();
      state.bossIntroShown = true;
      state.match = Combat.createMatch(state.picks[1], state.picks[2]);
      state.screen = "battle";
      render();
      // Schedule first AI move (both controllers are AI)
      if (state.controllers[0] === "ai") {
        state.pendingAiTimeout = window.setTimeout(aiStep, scaledDelay(800));
      }
      return;
    }

    if (state.selecting === 1) {
      // If P2 is AI, auto-pick a random hero (not P1's choice) and start
      if (state.controllers[1] === "ai") {
        const choices = HERO_ORDER.filter(id => id !== heroId);
        state.picks[2] = choices[Math.floor(Math.random() * choices.length)];
        state.currentMatchLowHp = { 0: false, 1: false };
        state.matchStats = _freshMatchStats();
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
    state.matchStats = _freshMatchStats();
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
    state.matchStats = _freshMatchStats();
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

  // ── Endless Survival helpers ───────────────────────────────────────────────

  function pickNextOpponent() {
    const candidates = HERO_ORDER.filter(id =>
      id !== state.endless.heroId && id !== state.endless.lastOpponentId
    );
    // Fallback: if somehow empty, allow any non-player hero
    const pool = candidates.length > 0
      ? candidates
      : HERO_ORDER.filter(id => id !== state.endless.heroId);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startNextEndlessMatch() {
    const opponentId = state.endless.nextOpponentId || pickNextOpponent();
    state.endless.nextOpponentId = opponentId;
    state.currentMatchLowHp = { 0: false, 1: false };
    state.matchStats = _freshMatchStats();
    state.picks[1] = state.endless.heroId;
    state.picks[2] = opponentId;
    state.match = Combat.createMatch(state.endless.heroId, opponentId);
    // Carry HP on subsequent rounds
    if (state.endless.streak > 0 && typeof state.endless.carriedHp === "number") {
      state.match.players[0].hp = state.endless.carriedHp;
    }
    state.screen = "battle";
    render();
  }

  function continueEndless() {
    if (!state.endless) return;
    // Move stashed nextOpponentId to lastOpponentId for the upcoming match
    // (lastOpponentId is set in onMatchEnd when player wins, before we stash nextOpponentId)
    startNextEndlessMatch();
  }

  function endEndlessRun() {
    if (!state.endless) return;
    const store = getStore();
    const result = store
      ? Storage.recordEndlessRun(store, state.endless.heroId, state.endless.streak)
      : { isNewBest: false, previousBest: 0 };
    state.endless.isNewBest = result.isNewBest;
    state.endless.previousBest = result.previousBest;
    if (store) state.save = Storage.load(store);
    // Check achievements after updating scores
    const achKeys = checkAchievements();
    applyAchievements(achKeys);
    state.screen = "endless-result";
    render();
  }

  function retryEndless() {
    if (!state.endless) return;
    const heroId = state.endless.heroId;
    state.endless = { heroId, streak: 0, lastOpponentId: null };
    startNextEndlessMatch();
  }

  function pickDifferentHero() {
    state.endless = null;
    state.mode = "endless";
    state.controllers = ["human", "ai"];
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.screen = "charselect";
    render();
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
            triviaIndex: result.index,
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

    // ── Match stats tracking ─────────────────────────────────────────────────
    if (state.matchStats) {
      // Derive move name from match log (last entry) or fall back to move type
      const activeHero = Heroes.byId(activeHeroId);
      let moveName;
      if (move === "attack") {
        moveName = (activeHero && activeHero.moves.attack.name) || "Attack";
      } else if (move === "special" || isUnleash) {
        moveName = (activeHero && activeHero.moves.special.name) || "Special";
      } else if (move === "defend") {
        moveName = (activeHero && activeHero.moves.defend.name) || "Defend";
      } else {
        moveName = (activeHero && activeHero.moves.special.name) || "Charge";
      }

      // Biggest hit: largest HP swing on either slot, attributed to active player
      deltas.forEach((delta, pIdx) => {
        if (delta > 0) {
          const targetHero = Heroes.byId(state.match.players[pIdx].heroId);
          if (!state.matchStats.biggestHit || delta > state.matchStats.biggestHit.damage) {
            state.matchStats.biggestHit = {
              damage: delta,
              attackerName: (activeHero && activeHero.name) || activeHeroId,
              targetName: (targetHero && targetHero.name) || state.match.players[pIdx].heroId,
              moveName
            };
          }
        }
      });

      // Specials used: count when move === "special" OR it's the unleash of Einstein's charge
      if (move === "special" || isUnleash) {
        state.matchStats.specialsUsed[idx] = (state.matchStats.specialsUsed[idx] || 0) + 1;
      }
    }

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
      state.pendingMatchEndTimeout = window.setTimeout(onMatchEnd, scaledDelay(1500));
      return;
    }

    // Auto-trigger AI on next tick if it's their turn
    // Delays account for the full animation budget
    if (state.controllers[state.match.activePlayer] === "ai") {
      let delay;
      if (move === "special" || isUnleash) delay = 2200;
      else if (move === "defend") delay = 1500;
      else delay = 1800;
      state.pendingAiTimeout = window.setTimeout(aiStep, scaledDelay(delay));
    }
  }

  function _buildHistoryEntry() {
    const players = state.match.players;
    return {
      id: Date.now(),
      date: new Date().toISOString(),
      mode: state.mode,
      hero0Id: players[0].heroId,
      hero1Id: players[1].heroId,
      winnerSlot: state.match.winner,
      turns: state.match.turnNumber - 1,
      biggestHit: state.matchStats ? state.matchStats.biggestHit : null,
      specialsUsed: state.matchStats ? state.matchStats.specialsUsed.slice() : [0, 0],
      triviaCorrect: state.matchStats ? state.matchStats.triviaCorrect : 0,
      triviaTotal: state.matchStats ? state.matchStats.triviaTotal : 0,
      log: state.match.log.slice()
    };
  }

  function onMatchEnd() {
    Sfx.play("victory");
    const store = getStore();

    // Spectator mode: no stats, no achievements, no matchup recording — just show result
    if (state.mode === "spectator") {
      state.screen = "result";
      render();
      return;
    }

    const winnerIdx  = state.match.winner;
    const winnerHero = state.match.players[winnerIdx].heroId;
    const loserHero  = state.match.players[1 - winnerIdx].heroId;
    const newAchKeys = [];

    if (state.mode === "tournament") {
      const playerWon = state.match.winner === 0;
      const t = state.tournament;

      if (t.currentMatch === "semi1") {
        // Record matchup before returning
        if (store) {
          Storage.recordMatchup(store, state.match.players[0].heroId, state.match.players[1].heroId, playerWon);
          state.save = Storage.load(store);
        }
        if (!playerWon) {
          t.eliminatedBy = state.match.players[1].heroId;
          state.screen = "tournament-result";
          render();
          return;
        }
        t.bracket.semi1Winner = t.slots[0];

        // Simulate the AI-vs-AI semifinal
        const sim = simulateAiVsAi(t.slots[2], t.slots[3]);
        t.bracket.semi2Winner = sim.winner === 0 ? t.slots[2] : t.slots[3];
        t.bracket.semi2Log = sim.log;

        state.screen = "tournament-bracket";
        render();
        return;
      }

      if (t.currentMatch === "final") {
        // Record matchup before returning
        if (store) {
          Storage.recordMatchup(store, state.match.players[0].heroId, state.match.players[1].heroId, playerWon);
          state.save = Storage.load(store);
        }
        if (!playerWon) {
          t.eliminatedBy = state.match.players[1].heroId;
          state.screen = "tournament-result";
          render();
          return;
        }
        t.bracket.finalWinner = t.slots[0];

        // Player won the whole tournament!
        const store = getStore();
        if (store) {
          Storage.recordTournamentWin(store);
          state.save = Storage.load(store);
        }

        const newTourneyKeys = checkAchievements();
        if (newTourneyKeys.length) applyAchievements(newTourneyKeys);

        state.screen = "tournament-result";
        render();
        return;
      }
      return;
    }

    if (state.mode === "daily") {
      const playerWon = state.match.winner === 0;
      if (playerWon && state.dailyChallenge) {
        if (store) {
          Storage.recordDailyCompletion(store, state.dailyChallenge.isoDate);
          state.save = Storage.load(store);
        }
        // Check daily streak achievements
        const dailyAchKeys = checkAchievements();
        applyAchievements(dailyAchKeys);
      }
      // Record matchup
      if (store) {
        const playerHero  = state.match.players[0].heroId;
        const opponentHero = state.match.players[1].heroId;
        const playerWon0  = state.match.winner === 0;
        Storage.recordMatchup(store, playerHero, opponentHero, playerWon0);
        state.save = Storage.load(store);
      }
      // Record history entry
      if (store) {
        Storage.recordMatchHistory(store, _buildHistoryEntry());
        state.save = Storage.load(store);
      }
      state.currentMatchLowHp = { 0: false, 1: false };
      state.screen = "result";
      render();
      return;
    }

    if (state.mode === "endless") {
      const playerWon = state.match.winner === 0;
      const playerHpEnd = state.match.players[0].hp;
      const playerMaxHp = state.match.players[0].maxHp;

      // Record match stats in global storage
      if (store) {
        Storage.recordMatch(store, winnerHero, loserHero);
        state.save = Storage.load(store);
      }

      // Record matchup (directional: slot 0 is player)
      if (store) {
        const playerHero  = state.match.players[0].heroId;
        const opponentHero = state.match.players[1].heroId;
        const playerWon   = state.match.winner === 0;
        Storage.recordMatchup(store, playerHero, opponentHero, playerWon);
        state.save = Storage.load(store);
      }

      // Record match history for this endless round
      if (store) {
        Storage.recordMatchHistory(store, _buildHistoryEntry());
        state.save = Storage.load(store);
      }

      if (playerWon) {
        state.endless.streak += 1;
        state.endless.lastOpponentId = state.match.players[1].heroId;
        // Heal 25, capped at maxHp; reset statuses and cooldown happen implicitly
        // because createMatch builds fresh player state; HP is carried via carriedHp
        const healed = Math.min(playerMaxHp, playerHpEnd + 25);
        state.endless.carriedHp = healed;
        state.endless.healInfo = { from: playerHpEnd, to: healed };
        state.endless.nextOpponentId = pickNextOpponent();
        state.currentMatchLowHp = { 0: false, 1: false };
        state.screen = "endless-continue";
        render();
      } else {
        // Loss: record high score
        const result = store
          ? Storage.recordEndlessRun(store, state.endless.heroId, state.endless.streak)
          : { isNewBest: false, previousBest: 0 };
        state.endless.isNewBest = result.isNewBest;
        state.endless.previousBest = result.previousBest;
        if (store) state.save = Storage.load(store);
        state.currentMatchLowHp = { 0: false, 1: false };
        // Check achievements after updating scores
        newAchKeys.push(...checkAchievements());
        applyAchievements(newAchKeys);
        state.screen = "endless-result";
        render();
      }
      return;
    }

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

    // Record matchup (directional: slot 0 is always "player")
    if (store) {
      const playerHero  = state.match.players[0].heroId;
      const opponentHero = state.match.players[1].heroId;
      const playerWon   = state.match.winner === 0;
      Storage.recordMatchup(store, playerHero, opponentHero, playerWon);
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

    // Record match history
    if (store) {
      Storage.recordMatchHistory(store, _buildHistoryEntry());
      state.save = Storage.load(store);
    }

    state.screen = "result";
    render();
  }

  function quitToTitle() {
    state.overlay = null;
    state.match = null;
    state.arcade = null;
    state.endless = null;
    state.study = null;
    state.tournament = null;
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
    state.endless = null;
    state.tournament = null;
    state.picks = { 1: null, 2: null };
    state.selecting = 1;
    state.screen = "charselect";
    render();
  }

  function rematch() {
    state.currentMatchLowHp = { 0: false, 1: false };
    state.matchStats = _freshMatchStats();
    state.match = Combat.createMatch(state.picks[1], state.picks[2]);
    state.screen = "battle";
    render();
  }

  function arcadeNext() {
    startNextArcadeMatch();
  }

  function scaledDelay(baseMs) {
    const speed = state.save && state.save.animSpeed;
    if (speed === "slow") return Math.round(baseMs * 2.0);
    if (speed === "fast") return Math.round(baseMs * 0.6);
    return baseMs; // normal
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
      state.pendingAiTimeout = window.setTimeout(aiStep, scaledDelay(1500));
    }
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", boot);

  return { state, render, _testHook: { handleAction, resolveMove, _fumbleTurn }, isInstallable: () => !!deferredInstallPrompt };
})();

if (typeof module !== "undefined") module.exports = Main;
