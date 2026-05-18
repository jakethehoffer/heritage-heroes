var Main = (function () {
  // ── Game version & changelog ──────────────────────────────────────────────
  // Bump GAME_VERSION when appending a new entry to CHANGELOG. Returning
  // players whose save.lastSeenVersion < GAME_VERSION will see the latest
  // CHANGELOG entry once in the "What's New" overlay. Brand-new players
  // (no matches played) are quietly bumped to the current version and skip
  // the overlay.
  const GAME_VERSION = 1;
  const CHANGELOG = [
    {
      version: 1,
      title: "v1 — The Polish Update",
      date: "2026-05-17",
      changes: [
        { icon: "🎲", title: "Quick Play",            description: "One-click random match from the title screen — pick your moment to just play." },
        { icon: "⚔️", title: "VS Intro Screen",       description: "Every match opens with an animated fighter intro before the battle begins." },
        { icon: "🎉", title: "Confetti Celebrations", description: "Personal bests and tournament wins now get the celebration they deserve." },
        { icon: "🧠", title: "Heritage Quiz",         description: "New survival trivia mode — answer questions from all 7 heroes; one wrong ends the run." },
        { icon: "📅", title: "Daily Streak Calendar", description: "See your daily challenge consistency as a 5-week visual grid in Stats." },
        { icon: "⭐", title: "Hero Spotlight Stats",   description: "Character select now shows your W/L record, mastery, and best runs per hero." }
      ]
    }
  ];

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
    screen: "title",        // title | mode | opponent | charselect | difficulty | vs-intro | battle | match-end-splash | result | study | study-result | quiz | quiz-result | stats | hall | endless-continue | endless-result | settings | trophy-room
    trophyFilter: "all",   // "all" | "unlocked" | "locked"
    trophySort:   "recent", // "recent" | "category" | "progress"
    overlay: null,          // null | 'tutorial' | 'help' | 'quit' | 'trivia' | 'reset-stats' | 'profile' | 'reset-all' | 'daily-already-done'
    profileHeroId: null,
    tutorialStep: 0,
    mode: null,             // 'quick' | 'arcade' | 'study' | 'endless' | 'daily' | 'tournament' | 'spectator' | 'quiz'
    difficulty: "normal",   // 'normal' | 'hard'
    selecting: 1,           // 1 or 2 (which player is picking)
    controllers: ["human", "ai"], // index 0 = P1 controller; index 1 = P2 or AI
    picks: { 1: null, 2: null },  // hero ids
    match: null,            // Combat state
    matchStats: null,       // { biggestHit, specialsUsed, triviaCorrect, triviaTotal, triviaSeen }
    arcade: null,           // { playerHeroId, defeated: [], remaining: [], firstClear: bool }
    endless: null,          // { heroId, streak, lastOpponentId, carriedHp?, healInfo?, nextOpponentId?, isNewBest?, previousBest? } when active
    tournament: null,       // { humanCount, slotControllers, pickIndex, playerHeroId, slots: [4 hero ids], bracket: { semi1Winner, semi1WinnerSlot, semi2Winner, semi2WinnerSlot, semi2Log, finalWinner, finalWinnerSlot }, currentMatch: "semi1"|"semi2"|"final" } when active
    save: null,
    trivia: null,           // { heroId, question, options, correctIndex, explanation, phase: 'question'|'result', chosenIndex? } when active
    triviaUsed: { moses: [], david: [], esther: [], judah: [], rambam: [], golda: [], einstein: [] },
    study: null,            // { heroId, questionOrder: [], currentIndex, answers: [], lastChoice, justMastered }
    quiz: null,             // { pool: [{heroId,qIdx}], currentIndex, streak, lastChoice, finished, isNewBest, previousBest } when active
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
    pendingMatchEndTimeout: null, // id of scheduled onMatchEnd timeout (clearable on pause)
    pendingVsIntroTimeout: null,  // id of VS-intro auto-advance timeout (clearable on skip/quit)
    pendingMatchEndSplashTimeout: null, // id of match-end VICTORY/DEFEAT splash auto-advance timeout
    // Stage Select (Quick Match vs AI only)
    selectedStageId: null        // populated when player picks a stage in Quick Match vs AI
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
      goToBattle({ aiFirstStep: false });
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
      // Shared tournament challenge: 1-human classic mode
      tournamentSetHumans(1);
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
    goToBattle({ aiFirstStep: false });
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

    // Heritage Quiz achievements — use best streak so far (live quiz state or saved best)
    const liveQuizStreak = (state.quiz && Number.isInteger(state.quiz.streak)) ? state.quiz.streak : 0;
    const savedQuizBest  = Number.isInteger(save.quizBestStreak) ? save.quizBestStreak : 0;
    const maxQuizStreak  = Math.max(liveQuizStreak, savedQuizBest);
    tryUnlock("quizStreak5",  maxQuizStreak >= 5);
    tryUnlock("quizStreak10", maxQuizStreak >= 10);
    tryUnlock("quizStreak20", maxQuizStreak >= 20);

    // Daily Quest achievements. questTriple should latch on the first day
    // the player clears both quests; once unlocked it stays unlocked even
    // when tomorrow's set resets completedAll to false.
    const dq = save.dailyQuests || {};
    const lifetime = dq.lifetimeCompleted || 0;
    tryUnlock("questFirst",   lifetime >= 1);
    tryUnlock("questTriple",  !!dq.completedAll);
    tryUnlock("questStreak7", (dq.bestStreak || 0) >= 7);

    return newKeys;
  }

  // ── Daily Quests helpers ──────────────────────────────────────────────────
  // Apply a quest-event to storage and fire toasts/state refresh for any
  // newly-completed quests. Caller passes the resolved event payload; we own
  // the side effects (save reload, achievement check, toast queueing).
  function _applyQuestEvent(eventType, eventData) {
    const store = getStore();
    if (!store) return;
    const result = Storage.recordQuestProgress(store, eventType, eventData);
    if (result && result.newlyCompleted && result.newlyCompleted.length > 0) {
      state.save = Storage.load(store);
      for (const quest of result.newlyCompleted) {
        if (typeof Screens !== "undefined" && Screens.showToast) {
          Screens.showToast("Quest complete: " + quest.label);
        }
      }
      // Quest completions may unlock the questFirst/questTriple/questStreak7 achievements.
      const newAchKeys = checkAchievements();
      if (newAchKeys.length) applyAchievements(newAchKeys);
    } else if (result && result.allJustCompleted) {
      // Edge case: should be covered above, but be defensive.
      state.save = Storage.load(store);
    }
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

  // Apply text-size accessibility setting by toggling body classes.
  // No-op in headless / no-DOM contexts (tests).
  function applyTextSize(textSize) {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (!body) return;
    body.classList.remove("text-large", "text-xlarge");
    if (textSize === "large")  body.classList.add("text-large");
    if (textSize === "xlarge") body.classList.add("text-xlarge");
  }

  // Apply theme accessibility setting by toggling body classes.
  // No-op in headless / no-DOM contexts (tests).
  function applyTheme(theme) {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (!body) return;
    body.classList.remove("theme-high-contrast");
    if (theme === "high-contrast") body.classList.add("theme-high-contrast");
  }

  function boot() {
    const store = (typeof localStorage !== "undefined") ? localStorage : { getItem: () => null, setItem: () => {} };
    state.save = Storage.load(store);
    // Refresh today's daily quests (generates a fresh set on day rollover, or
    // is a no-op if today's set is already current). Safe to call without a
    // store; the helper will return defaults in that case.
    Storage.refreshDailyQuests(store, todayIso());
    state.save = Storage.load(store);
    Sfx.setMusicMuted(!state.save.music);
    Sfx.setSfxMuted(!state.save.sfx);
    Sfx.preload();
    applyTextSize(state.save.textSize);
    applyTheme(state.save.theme);
    // Randomise starting featured hero so each session feels fresh
    state.titleFeaturedIndex = Math.floor(Math.random() * Heroes.list.length);
    if (!state.save.tutorialSeen) state.overlay = "tutorial";
    // Parse and consume incoming share challenge from URL
    state.incomingChallenge = parseIncomingChallenge();
    if (state.incomingChallenge && window.history && window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // "What's New" overlay: show to returning players after a version bump.
    // Skip if: (a) tutorial is showing for first-time users,
    //          (b) an incoming URL challenge is queued (let them accept/dismiss first),
    //          (c) the user is brand-new (no save / no matches) — they don't need to see
    //              "what's new" since everything is new to them; quietly bump them instead.
    if (state.save && (state.save.lastSeenVersion || 0) < GAME_VERSION) {
      const stats = state.save.stats || {};
      const isBrandNew = state.save.lastSeenVersion === 0
        && (!stats.matchesPlayed || stats.matchesPlayed === 0);
      if (isBrandNew) {
        Storage.setLastSeenVersion(store, GAME_VERSION);
        state.save.lastSeenVersion = GAME_VERSION;
      } else if (!state.overlay && !state.incomingChallenge) {
        state.overlay = "whats-new";
      }
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

    // Expose game version metadata to render-layer code (read by renderWhatsNew).
    state.gameVersion = GAME_VERSION;
    state.changelog = CHANGELOG;

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
      // Refresh daily quests on every title visit so an open tab that crosses
      // midnight picks up the new day's set. No-op when today's set is current.
      const titleStore = getStore();
      if (titleStore) {
        Storage.refreshDailyQuests(titleStore, todayIso());
        state.save = Storage.load(titleStore);
      }
    }

    let body;
    if (state.screen === "title")       body = Screens.renderTitle(state);
    else if (state.screen === "mode")   body = Screens.renderModeSelect(state);
    else if (state.screen === "opponent") body = Screens.renderOpponentSelect(state);
    else if (state.screen === "difficulty") body = Screens.renderDifficultySelect(state);
    else if (state.screen === "charselect") body = Screens.renderCharSelect(state);
    else if (state.screen === "vs-intro") body = Screens.renderVsIntro(state);
    else if (state.screen === "battle") body = Screens.renderBattle(state);
    else if (state.screen === "match-end-splash") body = Screens.renderMatchEndSplash(state);
    else if (state.screen === "result") body = Screens.renderResult(state);
    else if (state.screen === "study") body = Screens.renderStudySession(state);
    else if (state.screen === "study-result") body = Screens.renderStudyResult(state);
    else if (state.screen === "quiz") body = Screens.renderQuiz(state);
    else if (state.screen === "quiz-result") body = Screens.renderQuizResult(state);
    else if (state.screen === "stats") body = Screens.renderStats(state);
    else if (state.screen === "boss-intro") body = Screens.renderBossIntro(state);
    else if (state.screen === "hall") body = Screens.renderHall(state);
    else if (state.screen === "endless-continue") body = Screens.renderEndlessContinue(state);
    else if (state.screen === "endless-result")   body = Screens.renderEndlessResult(state);
    else if (state.screen === "settings")         body = Screens.renderSettings(state);
    else if (state.screen === "history")          body = Screens.renderHistory(state);
    else if (state.screen === "timeline")         body = Screens.renderTimeline(state);
    else if (state.screen === "tournament-setup")   body = Screens.renderTournamentSetup(state);
    else if (state.screen === "tournament-bracket") body = Screens.renderTournamentBracket(state);
    else if (state.screen === "tournament-result")  body = Screens.renderTournamentResult(state);
    else if (state.screen === "trophy-room")        body = Screens.renderTrophyRoom(state);
    else if (state.screen === "stage-select")       body = Screens.renderStageSelect(state);

    // ── Ambient music routing ────────────────────────────────────────────────
    // Play stage music during battle; stop it on any other screen.
    // The locked stageId on the match object is the single source of truth.
    // playMusic is no-op if already on the same stage, so it's safe to call every render.
    if (state.screen === "battle" && state.match) {
      const lockedStageId = state.match.stageId;
      if (lockedStageId) {
        Sfx.playMusic(lockedStageId);
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
    if (state.overlay === "whats-new")    overlay = Screens.renderWhatsNew(state);

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
      case "start-quick-play": startQuickPlay(); return;
      case "continue-last": continueLast(); return;
      case "start-arcade": startArcade(); return;
      case "set-opponent": setOpponent(target.dataset.opp); return;
      case "pick-hero":    pickHero(target.dataset.hero); return;
      case "pick-stage":   pickStage(target.dataset.stage); return;
      case "player-move":  playerMove(target.dataset.move); return;
      case "ai-step":      aiStep(); return;
      case "vs-skip":      _advanceToBattle(); return;
      case "match-end-skip": _advanceToResult(); return;
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

      case "set-text-size": {
        const size = target.dataset.size;
        if (size !== "normal" && size !== "large" && size !== "xlarge") return;
        const store = getStore();
        if (store) {
          const data = Storage.load(store);
          data.textSize = size;
          Storage.save(store, data);
          state.save = Storage.load(store);
        } else {
          state.save.textSize = size;
        }
        applyTextSize(size);
        render();
        return;
      }

      case "set-theme": {
        const theme = target.dataset.theme;
        if (theme !== "default" && theme !== "high-contrast") return;
        const store = getStore();
        if (store) {
          const data = Storage.load(store);
          data.theme = theme;
          Storage.save(store, data);
          state.save = Storage.load(store);
        } else {
          state.save.theme = theme;
        }
        applyTheme(theme);
        render();
        return;
      }

      case "set-strategy-hints": {
        const value = target.dataset.value;
        if (value !== "on" && value !== "off") return;
        const store = getStore();
        if (store) {
          const data = Storage.load(store);
          data.strategyHints = value;
          Storage.save(store, data);
          state.save = Storage.load(store);
        } else {
          state.save.strategyHints = value;
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
        // Daily quest progress for trivia answers (any mode).
        _applyQuestEvent("triviaAnswer", { wasCorrect: isCorrect });
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
      case "tournament-set-humans": tournamentSetHumans(parseInt(target.dataset.humans, 10)); return;
      case "begin-tournament": beginTournament(); return;
      case "continue-to-semi2": continueToSemi2(); return;
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
        // Daily quest progress for study mode trivia answers.
        {
          const sHero = Heroes.byId(state.study.heroId);
          const qIdx = state.study.questionOrder[state.study.currentIndex];
          const isCorrect = !!(sHero && sHero.trivia[qIdx] && chosenIdx === sHero.trivia[qIdx].correctIndex);
          _applyQuestEvent("triviaAnswer", { wasCorrect: isCorrect });
        }
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
        // Study Mode never flows through recordMatch, so record here so the
        // title screen's Continue button picks it up.
        {
          const studyStore = getStore();
          if (studyStore) {
            Storage.recordLastSession(studyStore, "study", state.study.heroId);
            state.save = Storage.load(studyStore);
          }
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

      case "start-quiz":
        startQuiz();
        return;

      case "quiz-answer": {
        if (!state.quiz || state.quiz.finished || state.quiz.lastChoice !== null) return;
        const chosenIdx = parseInt(target.dataset.index, 10);
        quizAnswer(chosenIdx);
        return;
      }

      case "quiz-continue":
        quizContinue();
        return;

      case "quiz-quit":
        // End the current run and record whatever streak the player achieved.
        if (!state.quiz || state.quiz.finished) {
          state.quiz = null;
          state.mode = null;
          state.screen = "title";
          render();
          return;
        }
        quizFinalize();
        return;

      case "quiz-restart":
        startQuiz();
        return;

      case "dismiss-whats-new": {
        const store = getStore();
        if (store) {
          Storage.setLastSeenVersion(store, GAME_VERSION);
          state.save = Storage.load(store);
        } else {
          // Headless / no-storage path: at least keep in-memory save in sync.
          if (state.save) state.save.lastSeenVersion = GAME_VERSION;
        }
        state.overlay = null;
        render();
        return;
      }
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

  // Quick Play (Random Match): one-click shortcut from the title screen.
  // Picks a random hero for the player, a different random hero for the AI,
  // and a fully random stage (NOT tied to either hero). Skips mode-select,
  // opponent-select, char-select, and stage-select entirely.
  function startQuickPlay() {
    const STAGE_IDS = ["redsea", "elah", "throne", "temple", "cordoba", "knesset", "princeton"];
    const playerIdx = Math.floor(Math.random() * HERO_ORDER.length);
    const playerHeroId = HERO_ORDER[playerIdx];
    // AI hero: random from the remaining 6 (no mirror matches)
    const opponentPool = HERO_ORDER.filter(id => id !== playerHeroId);
    const aiHeroId = opponentPool[Math.floor(Math.random() * opponentPool.length)];
    const stageId = STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)];

    state.mode = "quick";
    state.controllers = ["human", "ai"];
    state.selecting = 1;
    state.picks = { 1: playerHeroId, 2: aiHeroId };
    state.selectedStageId = stageId;
    state.currentMatchLowHp = { 0: false, 1: false };
    state.matchStats = _freshMatchStats();
    state.bossIntroShown = true; // not a boss fight
    state.difficulty = "normal";
    state.match = Combat.createMatch(playerHeroId, aiHeroId, { stageId });
    if (typeof Sfx !== "undefined" && Sfx.playMusic) {
      Sfx.playMusic(stageId);
    }
    goToBattle({ aiFirstStep: false });
  }

  // Continue Last Mode: one-click restart of the player's most-recent session
  // (mode + hero). Mirrors startQuickPlay's "skip the selection tree" shape,
  // but uses the saved lastSession rather than a fresh random roll.
  function continueLast() {
    if (!state.save || !state.save.lastSession) return;
    const ls = state.save.lastSession;
    const heroObj = Heroes.byId(ls.playerHeroId);
    if (!heroObj) return;

    // Reset picks; downstream flows assume slot 1 = player.
    state.picks = { 1: ls.playerHeroId, 2: null };

    if (ls.mode === "quick") {
      // Random opponent + random stage, jump straight to battle.
      const STAGE_IDS = ["redsea", "elah", "throne", "temple", "cordoba", "knesset", "princeton"];
      const opponentPool = HERO_ORDER.filter(id => id !== ls.playerHeroId);
      const aiHeroId = opponentPool[Math.floor(Math.random() * opponentPool.length)];
      const stageId = STAGE_IDS[Math.floor(Math.random() * STAGE_IDS.length)];
      state.mode = "quick";
      state.controllers = ["human", "ai"];
      state.selecting = 1;
      state.picks[2] = aiHeroId;
      state.selectedStageId = stageId;
      state.currentMatchLowHp = { 0: false, 1: false };
      state.matchStats = _freshMatchStats();
      state.bossIntroShown = true;
      state.difficulty = "normal";
      state.match = Combat.createMatch(ls.playerHeroId, aiHeroId, { stageId });
      if (typeof Sfx !== "undefined" && Sfx.playMusic) Sfx.playMusic(stageId);
      goToBattle({ aiFirstStep: false });
      return;
    }

    if (ls.mode === "arcade") {
      state.mode = "arcade";
      state.controllers = ["human", "ai"];
      state.selecting = 1;
      state.difficulty = "normal";  // intentionally simple — player can choose Hard via normal Arcade flow
      state.bossIntroShown = false;
      state.arcade = {
        playerHeroId: ls.playerHeroId,
        defeated: [],
        remaining: Combat.arcadeOrder(ls.playerHeroId).slice()
      };
      startNextArcadeMatch();
      return;
    }

    if (ls.mode === "endless") {
      state.mode = "endless";
      state.controllers = ["human", "ai"];
      state.selecting = 1;
      state.endless = {
        heroId: ls.playerHeroId,
        streak: 0,
        lastOpponentId: null
      };
      startNextEndlessMatch();
      return;
    }

    if (ls.mode === "study") {
      state.mode = "study";
      state.controllers = ["human", "human"];
      state.selecting = 1;
      state.study = {
        heroId: ls.playerHeroId,
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

  // ── Heritage Quiz (Survival Trivia) ───────────────────────────────────────

  function startQuiz() {
    // Build pool of all {heroId, qIdx} for every hero's 20 trivia entries.
    const pool = [];
    for (const hero of Heroes.list) {
      const tlen = Array.isArray(hero.trivia) ? hero.trivia.length : 0;
      for (let i = 0; i < tlen; i++) {
        pool.push({ heroId: hero.id, qIdx: i });
      }
    }
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    state.mode = "quiz";
    state.controllers = ["human", "human"];
    state.quiz = {
      pool: pool,
      currentIndex: 0,
      streak: 0,
      lastChoice: null,
      finished: false,
      isNewBest: false,
      previousBest: 0
    };
    state.screen = "quiz";
    render();
  }

  // Returns the current question object: { heroId, hero, trivia } | null
  function _quizCurrent() {
    if (!state.quiz) return null;
    const entry = state.quiz.pool[state.quiz.currentIndex];
    if (!entry) return null;
    const hero = Heroes.byId(entry.heroId);
    if (!hero || !hero.trivia || !hero.trivia[entry.qIdx]) return null;
    return { heroId: entry.heroId, hero, trivia: hero.trivia[entry.qIdx] };
  }

  function quizAnswer(chosenIdx) {
    if (!state.quiz || state.quiz.finished || state.quiz.lastChoice !== null) return;
    const cur = _quizCurrent();
    if (!cur) return;
    const isCorrect = chosenIdx === cur.trivia.correctIndex;

    state.quiz.lastChoice = chosenIdx;

    // Record per-hero trivia stat (matches Study Mode pattern: count both total and correct).
    const store = getStore();
    if (store) {
      Storage.recordTrivia(store, cur.heroId, isCorrect);
      state.save = Storage.load(store);
    }
    // Daily quest progress for trivia answers (Heritage Quiz).
    _applyQuestEvent("triviaAnswer", { wasCorrect: isCorrect });

    if (isCorrect) {
      state.quiz.streak += 1;
      state.triviaStreak += 1;
      Sfx.play("triviaCorrect");
    } else {
      state.triviaStreak = 0;
      state.quiz.finished = true;
      Sfx.play("triviaWrong");
    }

    // Check trivia/streak achievements now that stats moved.
    applyAchievements(checkAchievements());

    if (state.quiz.finished) {
      // Wrong answer ends the run — but stay on the quiz screen so the player
      // sees the right answer; the feedback panel shows "See Results".
    }
    render();
  }

  function quizContinue() {
    if (!state.quiz) return;
    // If the run is over (wrong answer), advance to result.
    if (state.quiz.finished) {
      quizFinalize();
      return;
    }
    state.quiz.currentIndex += 1;
    state.quiz.lastChoice = null;
    // Pool exhausted = Perfect Quiz!
    if (state.quiz.currentIndex >= state.quiz.pool.length) {
      state.quiz.finished = true;
      quizFinalize();
      return;
    }
    render();
  }

  function quizFinalize() {
    if (!state.quiz) return;
    state.quiz.finished = true;
    const streak = state.quiz.streak;
    const store = getStore();
    if (store) {
      const result = Storage.recordQuizRun(store, streak);
      state.quiz.isNewBest = result.isNewBest;
      state.quiz.previousBest = result.previousBest;
      state.save = Storage.load(store);
    }
    // Check quiz achievements (uses save.quizBestStreak which we just bumped).
    applyAchievements(checkAchievements());
    state.screen = "quiz-result";
    render();
  }

  function startTournament() {
    state.mode = "tournament";
    state.tournament = null;
    state.screen = "tournament-setup";
    render();
  }

  function tournamentSetHumans(humanCount) {
    if (![1, 2, 3, 4].includes(humanCount)) return;
    let slotControllers;
    if (humanCount === 1) slotControllers = ["human", "ai",    "ai",    "ai"];
    else if (humanCount === 2) slotControllers = ["human", "ai",    "human", "ai"];
    else if (humanCount === 3) slotControllers = ["human", "human", "human", "ai"];
    else                       slotControllers = ["human", "human", "human", "human"];

    state.tournament = {
      humanCount,
      slotControllers,
      pickIndex: 0,
      playerHeroId: null,
      slots: [null, null, null, null],
      bracket: {
        semi1Winner: null, semi1WinnerSlot: null,
        semi2Winner: null, semi2WinnerSlot: null,
        semi2Log: null,
        finalWinner: null, finalWinnerSlot: null
      },
      currentMatch: null
    };
    state.controllers = ["human", "human"]; // for charselect display logic
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
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
    _startTournamentMatch(0, 1);
  }

  function continueToSemi2() {
    const t = state.tournament;
    t.currentMatch = "semi2";
    _startTournamentMatch(2, 3);
  }

  function continueToFinal() {
    const t = state.tournament;
    t.currentMatch = "final";
    _startTournamentMatch(t.bracket.semi1WinnerSlot, t.bracket.semi2WinnerSlot);
  }

  function _startTournamentMatch(slotA, slotB) {
    const t = state.tournament;
    state.matchStats = _freshMatchStats();
    state.bossIntroShown = true;
    state.currentMatchLowHp = { 0: false, 1: false };
    state.controllers = [t.slotControllers[slotA], t.slotControllers[slotB]];
    state.match = Combat.createMatch(t.slots[slotA], t.slots[slotB]);
    state._currentTournamentSlots = [slotA, slotB];
    // Tournament matches always SHOW intro; schedule first AI move after intro
    // if player 0's controller is AI.
    goToBattle({ aiFirstStep: state.controllers[0] === "ai" });
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
      const t = state.tournament;
      // Map pick index to the slot for this human
      const humanSlotMap = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
      const slotIndex = humanSlotMap[t.humanCount][t.pickIndex];
      t.slots[slotIndex] = heroId;
      t.pickIndex += 1;

      if (t.pickIndex < t.humanCount) {
        // More humans to pick — advance charselect to the next player
        state.selecting = t.pickIndex + 1;
        render();
        return;
      }

      // All humans picked — fill AI slots with random heroes, avoiding duplicates where possible
      const usedHeroes = new Set(t.slots.filter(s => s !== null));
      let available = HERO_ORDER.filter(h => !usedHeroes.has(h));
      // Shuffle available pool
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }
      for (let i = 0; i < 4; i++) {
        if (t.slots[i] === null) {
          if (available.length > 0) {
            t.slots[i] = available.shift();
          } else {
            // Fall back to any hero (duplicates allowed when pool exhausted)
            t.slots[i] = HERO_ORDER[Math.floor(Math.random() * HERO_ORDER.length)];
          }
        }
      }

      // playerHeroId is the first human's hero — used for champion screen/share
      t.playerHeroId = t.slots[humanSlotMap[t.humanCount][0]];

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
      // Spectator: skip the VS intro (user just wants to watch). Schedule the
      // first AI move (both controllers are AI).
      goToBattle({ aiFirstStep: state.controllers[0] === "ai", skipIntro: true });
      return;
    }

    if (state.selecting === 1) {
      // If P2 is AI, auto-pick a random hero (not P1's choice)
      if (state.controllers[1] === "ai") {
        const choices = HERO_ORDER.filter(id => id !== heroId);
        state.picks[2] = choices[Math.floor(Math.random() * choices.length)];
        // Quick Match vs AI: route to Stage Select before starting the match
        if (state.mode === "quick") {
          state.selectedStageId = null;
          state.screen = "stage-select";
          render();
          return;
        }
        // Other AI modes (Arcade, Endless, etc.) start the match immediately
        state.currentMatchLowHp = { 0: false, 1: false };
        state.matchStats = _freshMatchStats();
        state.match = Combat.createMatch(state.picks[1], state.picks[2]);
        goToBattle({ aiFirstStep: false });
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
    goToBattle({ aiFirstStep: false });
  }

  function pickStage(stageId) {
    state.selectedStageId = stageId;
    state.currentMatchLowHp = { 0: false, 1: false };
    state.matchStats = _freshMatchStats();
    state.bossIntroShown = true;
    state.match = Combat.createMatch(
      state.picks[1],
      state.picks[2],
      { stageId: state.selectedStageId }
    );
    // Switch music to player's chosen stage
    if (typeof Sfx !== "undefined" && Sfx.playMusic) {
      Sfx.playMusic(state.selectedStageId);
    }
    goToBattle({ aiFirstStep: false });
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

  function _launchArcadeMatch(launchOpts) {
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
    // Skip VS intro if launched immediately after the dramatic boss-intro
    // screen (chaining the two pre-battle screens would feel redundant).
    const skipIntro = !!(launchOpts && launchOpts.skipIntro);
    goToBattle({ aiFirstStep: false, skipIntro });
  }

  function startBossBattle() {
    _launchArcadeMatch({ skipIntro: true });
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
    // Show VS intro only on the FIRST match of the run; subsequent rounds
    // skip it (the player is "on a roll" and we don't want to interrupt).
    const skipIntro = state.endless.streak > 0;
    goToBattle({ aiFirstStep: false, skipIntro });
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

    // ── Combo tracking (per active player) ───────────────────────────────────
    // Capture the active player's prior streak so we can compare AFTER applyMove
    // succeeds. We don't write to the player object yet — only on success.
    const _comboActor   = state.match.players[idx];
    const _prevMoveType = _comboActor.lastMoveType;
    const _prevCombo    = _comboActor.comboCount || 0;

    try {
      Combat.applyMove(state.match, move);
    } catch (err) {
      console.warn(err);
      return;
    }

    // Update combo state AFTER a successful move. Rules:
    //   • charge (mid-charge or wind-up) breaks rhythm → reset.
    //   • same move type as last → extend the streak; fire callout at 2+.
    //   • different move type     → restart streak at 1, no callout.
    // Note: the victim's combo is reset later in the damage loop below.
    // The actual COMBO callout DOM append happens AFTER render() further down
    // (render() does innerHTML = ..., which would otherwise wipe it).
    let _comboCalloutText = null;
    if (move === "charge") {
      _comboActor.lastMoveType = null;
      _comboActor.comboCount = 0;
    } else if (move === _prevMoveType) {
      _comboActor.comboCount = _prevCombo + 1;
      if (_comboActor.comboCount >= 2) {
        _comboCalloutText = `COMBO x${_comboActor.comboCount}!`;
      }
    } else {
      _comboActor.lastMoveType = move;
      _comboActor.comboCount = 1;
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

    // Fire the queued COMBO callout (post-render so innerHTML doesn't wipe it).
    if (_comboCalloutText) {
      Screens.showCallout(_comboCalloutText, "combo");
    }

    // Track whether a BIG HIT callout has already fired this turn — a single
    // move shouldn't stack multiple BIG HIT! popups (e.g. burn tick + attack
    // both landing on the same target frame).
    let _bigHitFired = false;

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
        // BIG HIT! callout — fires once per turn when any single damage
        // instance is "noteworthy". Threshold chosen at 18 (normal attacks
        // do 10-14; specials/boss-buffed attacks exceed this).
        if (delta >= 18 && !_bigHitFired) {
          Screens.showCallout("BIG HIT!", "bighit");
          _bigHitFired = true;
        }
        // Taking damage interrupts the victim's combo streak.
        const victim = state.match.players[pIdx];
        victim.comboCount = 0;
        victim.lastMoveType = null;
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

    // Spectator mode: no stats, no achievements, no matchup recording — just show result.
    // Skip the VICTORY/DEFEAT splash for spectator (just watching, no ceremony needed).
    if (state.mode === "spectator") {
      goToResult({ skipSplash: true });
      return;
    }

    const winnerIdx  = state.match.winner;
    const winnerHero = state.match.players[winnerIdx].heroId;
    const loserHero  = state.match.players[1 - winnerIdx].heroId;
    const newAchKeys = [];

    if (state.mode === "tournament") {
      const t = state.tournament;
      const [slotA, slotB] = state._currentTournamentSlots || [0, 1];
      const winnerInMatch = state.match.winner;   // 0 or 1 relative to this match
      const winnerSlot = winnerInMatch === 0 ? slotA : slotB;
      const loserSlot  = winnerInMatch === 0 ? slotB : slotA;

      // Determine if any HUMAN played in this match
      const humanWon  = t.slotControllers[winnerSlot] === "human";
      const humanLost = t.slotControllers[loserSlot]  === "human";

      // Record matchup for the first human's perspective (slot 0 hero)
      if (store && t.humanCount >= 1) {
        // Only record when one side involves the human hero (slot 0)
        const slot0InMatch = slotA === 0 || slotB === 0;
        if (slot0InMatch) {
          const slot0InP0 = slotA === 0;
          Storage.recordMatchup(store, state.match.players[0].heroId, state.match.players[1].heroId, slot0InP0 ? (winnerInMatch === 0) : (winnerInMatch === 1));
          state.save = Storage.load(store);
        }
      }

      if (t.currentMatch === "semi1") {
        t.bracket.semi1Winner = t.slots[winnerSlot];
        t.bracket.semi1WinnerSlot = winnerSlot;

        if (humanLost) {
          t.eliminatedBy = t.slots[loserSlot === slotA ? slotB : slotA];
        }

        // If Semi 2 is both AI we can headlessly simulate it immediately so the
        // bracket reveal already shows the Semi 2 result before the user clicks.
        if (t.slotControllers[2] === "ai" && t.slotControllers[3] === "ai") {
          const sim = simulateAiVsAi(t.slots[2], t.slots[3]);
          t.bracket.semi2Winner = sim.winner === 0 ? t.slots[2] : t.slots[3];
          t.bracket.semi2WinnerSlot = sim.winner === 0 ? 2 : 3;
          t.bracket.semi2Log = sim.log;
        }

        state.screen = "tournament-bracket";
        render();
        return;
      }

      if (t.currentMatch === "semi2") {
        t.bracket.semi2Winner = t.slots[winnerSlot];
        t.bracket.semi2WinnerSlot = winnerSlot;

        if (humanLost) {
          t.eliminatedBy = t.slots[winnerSlot];
        }

        state.screen = "tournament-bracket";
        render();
        return;
      }

      if (t.currentMatch === "final") {
        t.bracket.finalWinner = t.slots[winnerSlot];
        t.bracket.finalWinnerSlot = winnerSlot;

        if (humanLost) {
          t.eliminatedBy = t.slots[winnerSlot];
        }

        // Only credit tournamentsWon / achievements when a human wins
        if (humanWon) {
          if (store) {
            Storage.recordTournamentWin(store);
            state.save = Storage.load(store);
          }
          const newTourneyKeys = checkAchievements();
          if (newTourneyKeys.length) applyAchievements(newTourneyKeys);
        }

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
      // Daily quest progress (player is always slot 0 in daily mode).
      _applyQuestEvent("matchEnd", {
        playerWon,
        heroId: state.match.players[0].heroId,
        turnsTaken: (state.match.turnNumber || 1) - 1,
        mode: "daily"
      });
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
      // Daily Challenge — show the VICTORY/DEFEAT splash before the recap.
      goToResult();
      return;
    }

    if (state.mode === "endless") {
      const playerWon = state.match.winner === 0;
      const playerHpEnd = state.match.players[0].hp;
      const playerMaxHp = state.match.players[0].maxHp;

      // Record match stats in global storage
      if (store) {
        Storage.recordMatch(store, winnerHero, loserHero);
        // Record last session so the title screen offers a one-click resume
        const endlessHeroId = state.picks && state.picks[1];
        if (endlessHeroId) Storage.recordLastSession(store, "endless", endlessHeroId);
        state.save = Storage.load(store);
      }

      // Daily quest progress (player is always slot 0 in endless mode).
      _applyQuestEvent("matchEnd", {
        playerWon,
        heroId: state.match.players[0].heroId,
        turnsTaken: (state.match.turnNumber || 1) - 1,
        mode: "endless"
      });

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
      // Record last session for the four single-hero modes; helper silently
      // no-ops on unsupported modes, but we gate explicitly for clarity.
      if (state.mode === "quick" || state.mode === "arcade") {
        const playerHeroId = state.picks && state.picks[1];
        if (playerHeroId) Storage.recordLastSession(store, state.mode, playerHeroId);
      }
      state.save = Storage.load(store);
    }

    // Daily quest progress for default match-end paths (quick / arcade /
    // single-player flows). We resolve "the player" via the human slot so
    // arcade's flippable slot order is handled correctly. Vs-human matches
    // count toward winMatches/winAsHero/quickFinish for whichever side won.
    {
      const humanSlotForQuest = state.controllers.indexOf("human");
      const playerSlot = humanSlotForQuest !== -1 ? humanSlotForQuest : 0;
      const playerWonForQuest = state.match.winner === playerSlot;
      _applyQuestEvent("matchEnd", {
        playerWon: playerWonForQuest,
        heroId: state.match.players[playerSlot].heroId,
        turnsTaken: (state.match.turnNumber || 1) - 1,
        mode: state.mode
      });
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

    // Quick Match / Arcade / fallthrough — show the VICTORY/DEFEAT splash
    // before the recap screen. Arcade ladder completion still routes through
    // renderResult() which then dispatches renderArcadeEnding — the splash
    // is the same in either case.
    goToResult();
  }

  function quitToTitle() {
    // Cancel any scheduled timeouts so they don't fire after we navigate away.
    if (state.pendingVsIntroTimeout) { clearTimeout(state.pendingVsIntroTimeout); state.pendingVsIntroTimeout = null; }
    if (state.pendingAiTimeout)      { clearTimeout(state.pendingAiTimeout);      state.pendingAiTimeout = null; }
    if (state.pendingMatchEndTimeout){ clearTimeout(state.pendingMatchEndTimeout);state.pendingMatchEndTimeout = null; }
    if (state.pendingMatchEndSplashTimeout) { clearTimeout(state.pendingMatchEndSplashTimeout); state.pendingMatchEndSplashTimeout = null; }
    state._pendingAiFirstStep = false;
    state.overlay = null;
    state.match = null;
    state.arcade = null;
    state.endless = null;
    state.study = null;
    state.quiz = null;
    state.tournament = null;
    state.picks = { 1: null, 2: null };
    state.selecting = 1;
    state.screen = "title";
    render();
  }

  function quitToCharSelect() {
    // Returns to character select, preserving the current mode and controllers.
    // In arcade, this restarts the ladder (player must repick their hero).
    if (state.pendingVsIntroTimeout) { clearTimeout(state.pendingVsIntroTimeout); state.pendingVsIntroTimeout = null; }
    if (state.pendingAiTimeout)      { clearTimeout(state.pendingAiTimeout);      state.pendingAiTimeout = null; }
    if (state.pendingMatchEndTimeout){ clearTimeout(state.pendingMatchEndTimeout);state.pendingMatchEndTimeout = null; }
    if (state.pendingMatchEndSplashTimeout) { clearTimeout(state.pendingMatchEndSplashTimeout); state.pendingMatchEndSplashTimeout = null; }
    state._pendingAiFirstStep = false;
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
    goToBattle({ aiFirstStep: false });
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

  // ── VS Intro routing ───────────────────────────────────────────────────────
  // Centralized helper for routing a freshly-created match through the
  // VS Intro screen (then on to battle). Replaces the inline triplet
  // `state.screen = "battle"; render(); maybe-schedule-aiStep` at every
  // match-start site. opts:
  //   - aiFirstStep (bool): if true, after entering battle we schedule the
  //     first AI move when controllers[match.activePlayer] === "ai".
  //   - skipIntro (bool): bypass the VS intro animation and go straight to
  //     battle (spectator, mid-Endless runs, post-boss-intro).
  function _vsIntroAutoAdvanceMs() {
    const speed = state.save && state.save.animSpeed;
    if (speed === "fast")   return 1500;
    if (speed === "slow")   return 3000;
    return 2200; // normal / default
  }

  function goToBattle(opts) {
    const options = opts || {};
    // Always clear any prior VS-intro timeout — no overlapping schedules.
    if (state.pendingVsIntroTimeout) {
      clearTimeout(state.pendingVsIntroTimeout);
      state.pendingVsIntroTimeout = null;
    }
    state._pendingAiFirstStep = !!options.aiFirstStep;
    if (options.skipIntro) {
      _advanceToBattle();
      return;
    }
    state.screen = "vs-intro";
    render();
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      state.pendingVsIntroTimeout = window.setTimeout(_advanceToBattle, _vsIntroAutoAdvanceMs());
    } else {
      // Headless/no-window environment — advance immediately so logic still flows.
      _advanceToBattle();
    }
  }

  function _advanceToBattle() {
    if (state.pendingVsIntroTimeout) {
      clearTimeout(state.pendingVsIntroTimeout);
      state.pendingVsIntroTimeout = null;
    }
    const shouldScheduleAi = !!state._pendingAiFirstStep;
    state._pendingAiFirstStep = false;
    state.screen = "battle";
    render();
    if (
      shouldScheduleAi
      && state.match
      && !state.match.winner
      && state.controllers
      && state.controllers[state.match.activePlayer] === "ai"
      && typeof window !== "undefined"
      && typeof window.setTimeout === "function"
    ) {
      state.pendingAiTimeout = window.setTimeout(aiStep, scaledDelay(800));
    }
  }

  // ── Match-end splash routing ──────────────────────────────────────────────
  // Mirror of goToBattle / _advanceToBattle for the VICTORY/DEFEAT splash
  // that bookends each match. Centralizes the screen transition so every
  // match-end site can opt in (or out) with a single skipSplash flag.
  function _matchEndSplashAutoAdvanceMs() {
    const speed = state.save && state.save.animSpeed;
    if (speed === "fast")  return 1200;
    if (speed === "slow")  return 2400;
    return 1800; // normal default
  }

  function goToResult(opts) {
    const options = opts || {};
    if (state.pendingMatchEndSplashTimeout) {
      clearTimeout(state.pendingMatchEndSplashTimeout);
      state.pendingMatchEndSplashTimeout = null;
    }
    if (options.skipSplash) {
      _advanceToResult();
      return;
    }
    state.screen = "match-end-splash";
    render();
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      state.pendingMatchEndSplashTimeout = window.setTimeout(_advanceToResult, _matchEndSplashAutoAdvanceMs());
    } else {
      // Headless/no-window environment — advance immediately so logic still flows.
      _advanceToResult();
    }
  }

  function _advanceToResult() {
    if (state.pendingMatchEndSplashTimeout) {
      clearTimeout(state.pendingMatchEndSplashTimeout);
      state.pendingMatchEndSplashTimeout = null;
    }
    state.screen = "result";
    render();
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
