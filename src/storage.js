var Storage = (function () {
  const KEY = "heritageHeroes.save";

  const HERO_IDS = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  // Modes from which a `tryMode` daily quest is allowed to roll. We keep this
  // intentionally short — modes the player actually opens from the main menu
  // — so the quest reads as a small "try this today" nudge rather than a
  // chore. Tournament/spectator/quiz/daily are excluded so a quest doesn't
  // collide with the Daily Challenge or require a 3-match bracket.
  const QUEST_MODES_POOL = ["quick", "arcade", "endless", "study"];

  // Human-readable labels for each tryMode quest.
  const QUEST_MODE_LABELS = {
    quick:   "Quick Match",
    arcade:  "Arcade Ladder",
    endless: "Endless Survival",
    study:   "Study Mode"
  };

  // Display names for the heroes used in winAsHero quest labels.
  const HERO_DISPLAY_NAMES = {
    moses:    "Moses",
    david:    "King David",
    esther:   "Queen Esther",
    judah:    "Judah Maccabee",
    rambam:   "Maimonides",
    golda:    "Golda Meir",
    einstein: "Albert Einstein"
  };

  function _defaultPerHero() {
    const obj = {};
    for (const id of HERO_IDS) obj[id] = { played: 0, won: 0, triviaCorrect: 0, triviaTotal: 0 };
    return obj;
  }

  function defaults() {
    return {
      arcade: { moses: 0, david: 0, esther: 0, judah: 0, rambam: 0, golda: 0, einstein: 0 },
      endlessHighScore: { moses: 0, david: 0, esther: 0, judah: 0, rambam: 0, golda: 0, einstein: 0 },
      sound: false,
      music: true,
      sfx: true,
      animSpeed: "normal",
      textSize: "normal",  // "normal" | "large" | "xlarge"
      theme: "default",  // "default" | "high-contrast"
      tutorialSeen: false,
      hardUnlocked: false,
      hardCleared: false,
      specialsUnlocked: { moses: false, david: false, esther: false, judah: false, rambam: false, golda: false, einstein: false },
      mastered: { moses: false, david: false, esther: false, judah: false, rambam: false, golda: false, einstein: false },
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        triviaCorrect: 0,
        triviaTotal: 0,
        perHero: _defaultPerHero()
      },
      achievements: {
        firstWin:         false,
        arcadeChampion:   false,
        hardChampion:     false,
        heroOfThePeople:  false,
        triviaApprentice: false,
        triviaScholar:    false,
        triviaSage:       false,
        heritageScholar:  false,
        streakOf5:        false,
        streakOf10:       false,
        comeback:         false,
        centurion:        false,
        bossSlayer:       false,
        endlessSurvivor:  false,
        endlessMarathon:  false,
        endlessLegend:    false,
        dailyStreak3:     false,
        dailyStreak7:     false,
        dailyStreak30:    false,
        tournamentWinner: false,
        tournamentMaster: false,
        tournamentLegend: false,
        quizStreak5:      false,
        quizStreak10:     false,
        quizStreak20:     false,
        questFirst:       false,
        questTriple:      false,
        questStreak7:     false
      },
      tournamentsWon: 0,
      quizBestStreak: 0,
      lastSeenVersion: 0,  // bumped by user dismissing the What's New overlay
      recentMatches: [],  // ring buffer; newest first, max 10 entries
      daily: {
        completedDates: [],     // array of ISO date strings, sorted oldest-first
        currentStreak: 0,       // cached; recomputed on demand
        bestStreak: 0,          // all-time best consecutive-day streak
        lifetimeCompletions: 0  // total challenges ever completed
      },
      matchups: {},  // empty object; lazily populated
      lastSession: null,  // { mode, playerHeroId, timestamp } | null — drives the "Continue: <mode>" title button
      dailyQuests: {
        date: null,                   // ISO date string of currently-active set ("2026-05-17") or null
        quests: [],                   // [{id, type, target, progress, completed, completedAt?, ...typeFields}]
        completedAll: false,          // true once all of today's quests are done
        completedDates: [],           // array of ISO date strings on which all quests completed
        currentStreak: 0,             // consecutive days completing all quests
        bestStreak: 0,
        lifetimeCompleted: 0          // total quests completed all-time (across all days)
      }
    };
  }

  function load(store) {
    try {
      const raw = store.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      const out = defaults();
      if (parsed && typeof parsed === "object") {
        if (parsed.arcade && typeof parsed.arcade === "object") {
          for (const k of Object.keys(out.arcade)) {
            if (Number.isInteger(parsed.arcade[k])) out.arcade[k] = parsed.arcade[k];
          }
        }
        if (parsed.endlessHighScore && typeof parsed.endlessHighScore === "object") {
          for (const k of Object.keys(out.endlessHighScore)) {
            if (Number.isInteger(parsed.endlessHighScore[k])) out.endlessHighScore[k] = parsed.endlessHighScore[k];
          }
        }
        if (typeof parsed.sound === "boolean") out.sound = parsed.sound;
        // music/sfx — read new fields; backward compat: if old save has only `sound`, copy to both
        if (typeof parsed.music === "boolean") {
          out.music = parsed.music;
        } else if (typeof parsed.sound === "boolean") {
          out.music = parsed.sound;
        }
        if (typeof parsed.sfx === "boolean") {
          out.sfx = parsed.sfx;
        } else if (typeof parsed.sound === "boolean") {
          out.sfx = parsed.sound;
        }
        if (parsed.animSpeed === "slow" || parsed.animSpeed === "normal" || parsed.animSpeed === "fast") {
          out.animSpeed = parsed.animSpeed;
        }
        if (parsed.textSize === "normal" || parsed.textSize === "large" || parsed.textSize === "xlarge") {
          out.textSize = parsed.textSize;
        }
        if (parsed.theme === "default" || parsed.theme === "high-contrast") {
          out.theme = parsed.theme;
        }
        if (typeof parsed.tutorialSeen === "boolean") out.tutorialSeen = parsed.tutorialSeen;
        if (typeof parsed.hardUnlocked === "boolean") out.hardUnlocked = parsed.hardUnlocked;
        if (parsed.specialsUnlocked && typeof parsed.specialsUnlocked === "object") {
          for (const id of HERO_IDS) {
            if (typeof parsed.specialsUnlocked[id] === "boolean") {
              out.specialsUnlocked[id] = parsed.specialsUnlocked[id];
            }
          }
        }
        if (parsed.mastered && typeof parsed.mastered === "object") {
          for (const id of HERO_IDS) {
            if (typeof parsed.mastered[id] === "boolean") {
              out.mastered[id] = parsed.mastered[id];
            }
          }
        }
        if (typeof parsed.hardCleared === "boolean") out.hardCleared = parsed.hardCleared;
        // stats deep-merge
        if (parsed.stats && typeof parsed.stats === "object") {
          if (Number.isInteger(parsed.stats.matchesPlayed)) out.stats.matchesPlayed = parsed.stats.matchesPlayed;
          if (Number.isInteger(parsed.stats.matchesWon))    out.stats.matchesWon    = parsed.stats.matchesWon;
          if (Number.isInteger(parsed.stats.triviaCorrect)) out.stats.triviaCorrect = parsed.stats.triviaCorrect;
          if (Number.isInteger(parsed.stats.triviaTotal))   out.stats.triviaTotal   = parsed.stats.triviaTotal;
          if (parsed.stats.perHero && typeof parsed.stats.perHero === "object") {
            for (const id of HERO_IDS) {
              const ph = parsed.stats.perHero[id];
              if (ph && typeof ph === "object") {
                if (Number.isInteger(ph.played))       out.stats.perHero[id].played       = ph.played;
                if (Number.isInteger(ph.won))          out.stats.perHero[id].won          = ph.won;
                if (Number.isInteger(ph.triviaCorrect)) out.stats.perHero[id].triviaCorrect = ph.triviaCorrect;
                if (Number.isInteger(ph.triviaTotal))  out.stats.perHero[id].triviaTotal  = ph.triviaTotal;
              }
            }
          }
        }
        // achievements merge — supports legacy boolean or new timestamp integer format
        if (parsed.achievements && typeof parsed.achievements === "object") {
          for (const key of Object.keys(out.achievements)) {
            const v = parsed.achievements[key];
            if (v === true) {
              out.achievements[key] = 1;  // legacy: unlocked but no timestamp
            } else if (typeof v === "number" && v > 0) {
              out.achievements[key] = v;
            } else {
              out.achievements[key] = false;
            }
          }
        }
        // recentMatches ring buffer — validate and limit to 10
        if (Array.isArray(parsed.recentMatches)) {
          out.recentMatches = parsed.recentMatches.filter(function (e) {
            return e && typeof e === "object" &&
              typeof e.hero0Id === "string" && e.hero0Id.length > 0 &&
              typeof e.hero1Id === "string" && e.hero1Id.length > 0 &&
              Number.isInteger(e.winnerSlot) &&
              Number.isInteger(e.turns);
          }).slice(0, 10);
        }
        if (Number.isInteger(parsed.tournamentsWon) && parsed.tournamentsWon >= 0) {
          out.tournamentsWon = parsed.tournamentsWon;
        }
        if (Number.isInteger(parsed.quizBestStreak) && parsed.quizBestStreak >= 0) {
          out.quizBestStreak = parsed.quizBestStreak;
        }
        if (Number.isInteger(parsed.lastSeenVersion) && parsed.lastSeenVersion >= 0) {
          out.lastSeenVersion = parsed.lastSeenVersion;
        }
        // matchups — validate key format and integer fields
        if (parsed.matchups && typeof parsed.matchups === "object" && !Array.isArray(parsed.matchups)) {
          const keyPattern = /^[a-z]+\|[a-z]+$/;
          for (const [k, v] of Object.entries(parsed.matchups)) {
            if (keyPattern.test(k) && v && typeof v === "object" &&
                Number.isInteger(v.wins) && v.wins >= 0 &&
                Number.isInteger(v.losses) && v.losses >= 0) {
              out.matchups[k] = { wins: v.wins, losses: v.losses };
            }
          }
        }
        // lastSession — must be a fully-shaped object with a supported mode + valid hero id
        if (parsed.lastSession && typeof parsed.lastSession === "object" && !Array.isArray(parsed.lastSession)) {
          const ls = parsed.lastSession;
          const VALID_MODES = ["quick", "arcade", "endless", "study"];
          if (
            typeof ls.mode === "string" && VALID_MODES.includes(ls.mode) &&
            typeof ls.playerHeroId === "string" && HERO_IDS.includes(ls.playerHeroId) &&
            Number.isInteger(ls.timestamp) && ls.timestamp > 0
          ) {
            out.lastSession = { mode: ls.mode, playerHeroId: ls.playerHeroId, timestamp: ls.timestamp };
          }
        }
        // daily quests — validate shape, drop malformed entries
        if (parsed.dailyQuests && typeof parsed.dailyQuests === "object" && !Array.isArray(parsed.dailyQuests)) {
          const dq = parsed.dailyQuests;
          if (dq.date === null || (typeof dq.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dq.date))) {
            out.dailyQuests.date = dq.date;
          }
          if (Array.isArray(dq.quests)) {
            const validTypes = ["winMatches", "winAsHero", "triviaCorrect", "quickFinish", "tryMode"];
            const cleaned = [];
            for (const q of dq.quests) {
              if (!q || typeof q !== "object") continue;
              if (typeof q.id !== "string" || q.id.length === 0) continue;
              if (typeof q.type !== "string" || !validTypes.includes(q.type)) continue;
              if (!Number.isInteger(q.target) || q.target < 1) continue;
              if (!Number.isInteger(q.progress) || q.progress < 0) continue;
              if (typeof q.completed !== "boolean") continue;
              const cleanedQuest = {
                id: q.id,
                type: q.type,
                target: q.target,
                progress: q.progress,
                completed: q.completed
              };
              if (Number.isInteger(q.completedAt) && q.completedAt > 0) {
                cleanedQuest.completedAt = q.completedAt;
              }
              if (typeof q.label === "string") cleanedQuest.label = q.label;
              if (typeof q.heroId === "string" && HERO_IDS.includes(q.heroId)) {
                cleanedQuest.heroId = q.heroId;
              }
              if (typeof q.modeId === "string") cleanedQuest.modeId = q.modeId;
              if (Number.isInteger(q.turnsMax) && q.turnsMax >= 1) {
                cleanedQuest.turnsMax = q.turnsMax;
              }
              cleaned.push(cleanedQuest);
              if (cleaned.length >= 3) break;  // cap at 3 per spec
            }
            out.dailyQuests.quests = cleaned;
          }
          if (typeof dq.completedAll === "boolean") out.dailyQuests.completedAll = dq.completedAll;
          if (Array.isArray(dq.completedDates)) {
            const seen = new Set();
            const filtered = dq.completedDates.filter(function (d) {
              if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
              if (seen.has(d)) return false;
              seen.add(d);
              return true;
            });
            filtered.sort();
            out.dailyQuests.completedDates = filtered;
          }
          if (Number.isInteger(dq.currentStreak) && dq.currentStreak >= 0) {
            out.dailyQuests.currentStreak = dq.currentStreak;
          }
          if (Number.isInteger(dq.bestStreak) && dq.bestStreak >= 0) {
            out.dailyQuests.bestStreak = dq.bestStreak;
          }
          if (Number.isInteger(dq.lifetimeCompleted) && dq.lifetimeCompleted >= 0) {
            out.dailyQuests.lifetimeCompleted = dq.lifetimeCompleted;
          }
        }
        // daily challenge data
        if (parsed.daily && typeof parsed.daily === "object") {
          if (Array.isArray(parsed.daily.completedDates)) {
            out.daily.completedDates = parsed.daily.completedDates.filter(
              function (d) { return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d); }
            );
          }
          if (Number.isInteger(parsed.daily.currentStreak) && parsed.daily.currentStreak >= 0) {
            out.daily.currentStreak = parsed.daily.currentStreak;
          }
          if (Number.isInteger(parsed.daily.bestStreak) && parsed.daily.bestStreak >= 0) {
            out.daily.bestStreak = parsed.daily.bestStreak;
          }
          if (Number.isInteger(parsed.daily.lifetimeCompletions) && parsed.daily.lifetimeCompletions >= 0) {
            out.daily.lifetimeCompletions = parsed.daily.lifetimeCompletions;
          }
        }
      }
      return out;
    } catch (_) {
      return defaults();
    }
  }

  function save(store, data) {
    try { store.setItem(KEY, JSON.stringify(data)); } catch (_) { /* silent */ }
  }

  function incrementArcadeWin(store, heroId) {
    const data = load(store);
    if (Object.prototype.hasOwnProperty.call(data.arcade, heroId)) {
      data.arcade[heroId] += 1;
    }
    save(store, data);
  }

  function unlockSpecial(store, heroId) {
    const data = load(store);
    if (Object.prototype.hasOwnProperty.call(data.specialsUnlocked, heroId)) {
      data.specialsUnlocked[heroId] = true;
    }
    save(store, data);
  }

  function markMastered(store, heroId) {
    const data = load(store);
    if (Object.prototype.hasOwnProperty.call(data.mastered, heroId)) {
      data.mastered[heroId] = true;
    }
    save(store, data);
  }

  function totalMastered(store) {
    const data = load(store);
    return Object.values(data.mastered).filter(Boolean).length;
  }

  // Record the end of a match. winnerHeroId and loserHeroId are hero id strings.
  function recordMatch(store, winnerHeroId, loserHeroId) {
    const data = load(store);
    data.stats.matchesPlayed += 1;
    data.stats.matchesWon   += 1;
    if (Object.prototype.hasOwnProperty.call(data.stats.perHero, winnerHeroId)) {
      data.stats.perHero[winnerHeroId].played += 1;
      data.stats.perHero[winnerHeroId].won    += 1;
    }
    if (Object.prototype.hasOwnProperty.call(data.stats.perHero, loserHeroId)) {
      data.stats.perHero[loserHeroId].played += 1;
    }
    save(store, data);
    return data;
  }

  // Record a trivia answer. heroId is the hero whose question was asked.
  function recordTrivia(store, heroId, wasCorrect) {
    const data = load(store);
    data.stats.triviaTotal += 1;
    if (wasCorrect) data.stats.triviaCorrect += 1;
    if (Object.prototype.hasOwnProperty.call(data.stats.perHero, heroId)) {
      data.stats.perHero[heroId].triviaTotal += 1;
      if (wasCorrect) data.stats.perHero[heroId].triviaCorrect += 1;
    }
    save(store, data);
    return data;
  }

  // Idempotently unlock an achievement by key. Returns the updated save.
  // Stores a timestamp (Date.now()) instead of true so the Trophy Room can show unlock dates.
  function unlockAchievement(store, key) {
    const data = load(store);
    if (data.achievements[key] === false || data.achievements[key] == null) {
      data.achievements[key] = Date.now();
      save(store, data);
    }
    return data;
  }

  // Record the end of an Endless Survival run for a given hero.
  // Returns { isNewBest: bool, previousBest: int }.
  function recordEndlessRun(store, heroId, streak) {
    const data = load(store);
    const previousBest = (data.endlessHighScore && Number.isInteger(data.endlessHighScore[heroId]))
      ? data.endlessHighScore[heroId]
      : 0;
    const isNewBest = streak > previousBest;
    if (isNewBest) {
      if (!data.endlessHighScore) data.endlessHighScore = {};
      data.endlessHighScore[heroId] = streak;
      save(store, data);
    }
    return { isNewBest, previousBest };
  }

  // Record the end of a Heritage Quiz run. streak is the number of correct
  // answers in a row before the run ended (wrong answer, quit, or perfect 140).
  // Returns { isNewBest: bool, previousBest: int }.
  function recordQuizRun(store, streak) {
    const data = load(store);
    const previousBest = Number.isInteger(data.quizBestStreak) ? data.quizBestStreak : 0;
    const isNewBest = streak > previousBest;
    if (isNewBest) {
      data.quizBestStreak = streak;
      save(store, data);
    }
    return { isNewBest, previousBest };
  }

  function resetAll(store) {
    try { store.setItem(KEY, JSON.stringify(defaults())); } catch (_) { /* silent */ }
  }

  // ── Daily Challenge helpers ──────────────────────────────────────────────

  function _isoFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function _computeStreak(completedDates, endingDateIso) {
    const completedSet = new Set(completedDates);
    let streak = 0;
    const d = new Date(endingDateIso + "T12:00:00");  // noon avoids DST edge cases
    while (true) {
      const iso = _isoFromDate(d);
      if (!completedSet.has(iso)) break;
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  // Record a daily challenge completion for the given ISO date string.
  // Idempotent: calling twice with the same date is a no-op.
  // Returns the updated save data.
  function recordDailyCompletion(store, isoDate) {
    const data = load(store);
    if (data.daily.completedDates.includes(isoDate)) return data;
    data.daily.completedDates.push(isoDate);
    data.daily.completedDates.sort();
    data.daily.lifetimeCompletions += 1;
    const streak = _computeStreak(data.daily.completedDates, isoDate);
    data.daily.currentStreak = streak;
    if (streak > data.daily.bestStreak) data.daily.bestStreak = streak;
    save(store, data);
    return data;
  }

  // Returns an array of `{ iso, dayOfMonth, monthShort, weekday, completed, isToday, isFuture }`
  // describing the last `daysBack` days plus today (always last entry, isToday: true).
  // Pure function: deterministic given (save, daysBack, todayIso). If todayIso is null/omitted,
  // today is derived from new Date().
  function dailyCalendar(save, daysBack, todayIso) {
    if (typeof daysBack !== "number" || !Number.isFinite(daysBack) || daysBack < 0) {
      daysBack = 35;
    }
    // Round down — only whole days make sense.
    daysBack = Math.floor(daysBack);

    let effectiveTodayIso = todayIso;
    if (typeof effectiveTodayIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveTodayIso)) {
      effectiveTodayIso = _isoFromDate(new Date());
    }

    // Extract completedDates the same way load() validates: only ISO-format strings.
    const rawDates = (save && save.daily && Array.isArray(save.daily.completedDates))
      ? save.daily.completedDates
      : [];
    const completedSet = new Set(
      rawDates.filter(function (d) { return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d); })
    );

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const out = [];
    // Walk forward from oldest (daysBack ago) to today.
    for (let offset = daysBack; offset >= 0; offset--) {
      // Use noon to avoid DST edge cases when subtracting days.
      const d = new Date(effectiveTodayIso + "T12:00:00");
      d.setDate(d.getDate() - offset);
      const iso = _isoFromDate(d);
      out.push({
        iso: iso,
        dayOfMonth: d.getDate(),
        monthShort: MONTHS[d.getMonth()],
        weekday: WEEKDAYS[d.getDay()],
        completed: completedSet.has(iso),
        isToday: iso === effectiveTodayIso,
        isFuture: false  // we never include future days in the window
      });
    }
    return out;
  }

  // Returns live daily stats computed against today's date.
  function dailyStats(store) {
    if (!store) {
      return { currentStreak: 0, bestStreak: 0, lifetimeCompletions: 0, completedToday: false };
    }
    const data = load(store);
    const d = new Date();
    const todayIso = _isoFromDate(d);
    const completedToday = data.daily.completedDates.includes(todayIso);
    const currentStreak = _computeStreak(data.daily.completedDates, todayIso);
    return {
      currentStreak,
      bestStreak: data.daily.bestStreak,
      lifetimeCompletions: data.daily.lifetimeCompletions,
      completedToday
    };
  }

  // Increment tournamentsWon by 1, save, return updated save.
  function recordTournamentWin(store) {
    const data = load(store);
    data.tournamentsWon = (data.tournamentsWon || 0) + 1;
    save(store, data);
    return data;
  }

  // Push a match history entry to the front of the ring buffer, trim to 10, save, return updated save.
  function recordMatchHistory(store, entry) {
    const data = load(store);
    data.recentMatches.unshift(entry);
    if (data.recentMatches.length > 10) data.recentMatches = data.recentMatches.slice(0, 10);
    save(store, data);
    return data;
  }

  // Persist the highest game version this user has acknowledged via the
  // What's New overlay. Idempotent; safe to call with the current value.
  function setLastSeenVersion(store, version) {
    const data = load(store);
    data.lastSeenVersion = version;
    save(store, data);
  }

  // Record a per-matchup result. playerHeroId is slot 0's hero; opponentHeroId is slot 1's hero.
  // won is a boolean: true if player (slot 0) won.
  function recordMatchup(store, playerHeroId, opponentHeroId, won) {
    const data = load(store);
    const key = playerHeroId + "|" + opponentHeroId;
    if (!data.matchups[key]) data.matchups[key] = { wins: 0, losses: 0 };
    if (won) {
      data.matchups[key].wins += 1;
    } else {
      data.matchups[key].losses += 1;
    }
    save(store, data);
    return data;
  }

  // Record the player's last completed session so the title screen can show
  // a "Continue: <mode> as <hero>" shortcut. Only the four single-hero modes
  // qualify; anything else is a silent no-op (callers can fire freely).
  function recordLastSession(store, mode, playerHeroId) {
    const validModes = ["quick", "arcade", "endless", "study"];
    if (!validModes.includes(mode)) return;
    if (typeof playerHeroId !== "string" || !HERO_IDS.includes(playerHeroId)) return;
    const data = load(store);
    data.lastSession = {
      mode: mode,
      playerHeroId: playerHeroId,
      timestamp: Date.now()
    };
    save(store, data);
    return data;
  }

  // ── Daily Quests helpers ─────────────────────────────────────────────────

  // Mulberry32 — a small, fast 32-bit PRNG. Seeded by a single int. Deterministic
  // and good enough for picking 2 quests per day from a 5-type pool.
  function _mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _hashDateIso(isoDate) {
    let h = 0;
    for (let i = 0; i < isoDate.length; i++) {
      h = ((h << 5) - h + isoDate.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  // Generate exactly 2 quests deterministically seeded by dateIso. Same date
  // -> same 2 quests for every player on the planet.
  //
  // Quest types (5):
  //   - winMatches:    {target: 1|2|3, label: "Win N match(es) today"}
  //   - winAsHero:     {target: 1, heroId, label: "Win a match as <name>"}
  //   - triviaCorrect: {target: 5|10, label: "Answer N trivia questions correctly today"}
  //   - quickFinish:   {target: 1, turnsMax: 10, label: "Win a match in 10 turns or fewer"}
  //   - tryMode:       {target: 1, modeId, label: "Play a <mode> match today"}
  function generateDailyQuests(dateIso) {
    if (typeof dateIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return [];
    }
    const rng = _mulberry32(_hashDateIso(dateIso));

    const typePool = ["winMatches", "winAsHero", "triviaCorrect", "quickFinish", "tryMode"];

    // Shuffle pool via Fisher-Yates using our seeded rng so the picked types
    // are deterministic per day (no duplicates).
    const order = typePool.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    const picked = order.slice(0, 2);

    const quests = picked.map(function (type, idx) {
      const id = dateIso + ":" + type + ":" + idx;
      if (type === "winMatches") {
        const targets = [1, 2, 3];
        const target = targets[Math.floor(rng() * targets.length)];
        const noun = target === 1 ? "match" : "matches";
        return {
          id, type, target, progress: 0, completed: false,
          label: "Win " + target + " " + noun + " today"
        };
      }
      if (type === "winAsHero") {
        const heroId = HERO_IDS[Math.floor(rng() * HERO_IDS.length)];
        return {
          id, type, target: 1, progress: 0, completed: false,
          heroId,
          label: "Win a match as " + (HERO_DISPLAY_NAMES[heroId] || heroId)
        };
      }
      if (type === "triviaCorrect") {
        const targets = [5, 10];
        const target = targets[Math.floor(rng() * targets.length)];
        return {
          id, type, target, progress: 0, completed: false,
          label: "Answer " + target + " trivia questions correctly today"
        };
      }
      if (type === "quickFinish") {
        return {
          id, type, target: 1, progress: 0, completed: false,
          turnsMax: 10,
          label: "Win a match in 10 turns or fewer"
        };
      }
      if (type === "tryMode") {
        const modeId = QUEST_MODES_POOL[Math.floor(rng() * QUEST_MODES_POOL.length)];
        return {
          id, type, target: 1, progress: 0, completed: false,
          modeId,
          label: "Play a " + (QUEST_MODE_LABELS[modeId] || modeId) + " match today"
        };
      }
      // unreachable
      return { id, type: "winMatches", target: 1, progress: 0, completed: false, label: "Win a match today" };
    });

    return quests;
  }

  // ISO date helpers that don't drift across DST boundaries. We use noon for
  // arithmetic, which is the same trick used by the Daily Challenge code.
  function _isoDaysBefore(isoDate, days) {
    const d = new Date(isoDate + "T12:00:00");
    d.setDate(d.getDate() - days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function _dayDiff(aIso, bIso) {
    // Returns (aIso - bIso) in whole days. Positive = a is later than b.
    const a = new Date(aIso + "T12:00:00").getTime();
    const b = new Date(bIso + "T12:00:00").getTime();
    return Math.round((a - b) / 86400000);
  }

  // Roll the dailyQuests bucket forward to `dateIso`. If today's set is
  // already current, this is a no-op. Otherwise it regenerates quests,
  // resets progress, and reconciles the streak based on whether yesterday
  // was completed.
  //
  // Streak rules:
  //   - If save.dailyQuests.date === dateIso, no rollover (idempotent).
  //   - Otherwise: if yesterday is in completedDates, currentStreak stays.
  //                If yesterday is NOT in completedDates, currentStreak resets to 0.
  //                (i.e. any missed day breaks the streak)
  function refreshDailyQuests(store, dateIso) {
    if (!store || typeof dateIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      // Best-effort: load + return whatever exists so the caller can still read it.
      return store ? load(store).dailyQuests : defaults().dailyQuests;
    }
    const data = load(store);
    if (data.dailyQuests.date === dateIso && Array.isArray(data.dailyQuests.quests) && data.dailyQuests.quests.length > 0) {
      // Today already loaded — nothing to do, but refresh streak in case the
      // user opened the app the next day without yesterday having recorded.
      return data.dailyQuests;
    }
    // Rolling over to a new day.
    const yesterdayIso = _isoDaysBefore(dateIso, 1);
    const completedSet = new Set(data.dailyQuests.completedDates);
    const completedYesterday = completedSet.has(yesterdayIso);

    if (data.dailyQuests.date !== null) {
      // We're moving off a previous active day. If they didn't complete
      // yesterday's set, streak breaks.
      if (!completedYesterday) {
        data.dailyQuests.currentStreak = 0;
      }
    } else {
      // First time we've ever generated quests for this user — no streak yet.
      if (!completedYesterday) {
        data.dailyQuests.currentStreak = 0;
      }
    }

    data.dailyQuests.date = dateIso;
    data.dailyQuests.quests = generateDailyQuests(dateIso);
    data.dailyQuests.completedAll = false;  // fresh day, fresh slate
    save(store, data);
    return data.dailyQuests;
  }

  // Internal: increment progress on a single quest, marking completed when
  // target is reached. Returns true if the quest transitioned from incomplete
  // to complete on this call.
  function _bumpQuest(quest, amount, nowMs) {
    if (quest.completed) return false;
    quest.progress = Math.min(quest.target, quest.progress + amount);
    if (quest.progress >= quest.target) {
      quest.completed = true;
      quest.completedAt = nowMs;
      return true;
    }
    return false;
  }

  // Record progress against today's quests based on an event. Called from
  // main.js after match end, after trivia answers, and after mode starts.
  //
  // eventType:
  //   "matchEnd"     => eventData = { playerWon, heroId, turnsTaken, mode }
  //   "triviaAnswer" => eventData = { wasCorrect }
  //   "modeStart"    => eventData = { mode }
  //
  // Returns { newlyCompleted: [...quest objects], allJustCompleted: bool }.
  function recordQuestProgress(store, eventType, eventData) {
    const result = { newlyCompleted: [], allJustCompleted: false };
    if (!store) return result;
    const data = load(store);
    if (!data.dailyQuests || !Array.isArray(data.dailyQuests.quests) || data.dailyQuests.quests.length === 0) {
      return result;
    }
    const now = Date.now();
    const ev = eventData || {};

    for (const quest of data.dailyQuests.quests) {
      if (quest.completed) continue;
      let bumped = false;

      if (eventType === "matchEnd") {
        const playerWon = !!ev.playerWon;
        const heroId = (typeof ev.heroId === "string") ? ev.heroId : null;
        const turnsTaken = Number.isInteger(ev.turnsTaken) ? ev.turnsTaken : null;
        const mode = (typeof ev.mode === "string") ? ev.mode : null;

        if (quest.type === "winMatches" && playerWon) {
          bumped = _bumpQuest(quest, 1, now);
        } else if (quest.type === "winAsHero" && playerWon && heroId && quest.heroId === heroId) {
          bumped = _bumpQuest(quest, 1, now);
        } else if (quest.type === "quickFinish"
                   && playerWon
                   && turnsTaken !== null
                   && Number.isInteger(quest.turnsMax)
                   && turnsTaken <= quest.turnsMax) {
          bumped = _bumpQuest(quest, 1, now);
        } else if (quest.type === "tryMode" && mode && quest.modeId === mode) {
          // Playing the mode (a completed match counts as having played it)
          bumped = _bumpQuest(quest, 1, now);
        }
      } else if (eventType === "triviaAnswer") {
        if (quest.type === "triviaCorrect" && !!ev.wasCorrect) {
          bumped = _bumpQuest(quest, 1, now);
        }
      } else if (eventType === "modeStart") {
        const mode = (typeof ev.mode === "string") ? ev.mode : null;
        if (quest.type === "tryMode" && mode && quest.modeId === mode) {
          bumped = _bumpQuest(quest, 1, now);
        }
      }

      if (bumped) {
        result.newlyCompleted.push(quest);
        data.dailyQuests.lifetimeCompleted = (data.dailyQuests.lifetimeCompleted || 0) + 1;
      }
    }

    // After applying all bumps, check whether the whole day's set is complete.
    if (!data.dailyQuests.completedAll && data.dailyQuests.quests.every(function (q) { return q.completed; })) {
      data.dailyQuests.completedAll = true;
      result.allJustCompleted = true;

      const todayIso = data.dailyQuests.date;
      if (typeof todayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(todayIso)) {
        if (!data.dailyQuests.completedDates.includes(todayIso)) {
          data.dailyQuests.completedDates.push(todayIso);
          data.dailyQuests.completedDates.sort();
        }
        // Recompute streak from completedDates.
        const completedSet = new Set(data.dailyQuests.completedDates);
        let streak = 0;
        let cursor = todayIso;
        while (completedSet.has(cursor)) {
          streak += 1;
          cursor = _isoDaysBefore(cursor, 1);
        }
        data.dailyQuests.currentStreak = streak;
        if (streak > (data.dailyQuests.bestStreak || 0)) {
          data.dailyQuests.bestStreak = streak;
        }
      }
    }

    save(store, data);
    return result;
  }

  return { load, save, defaults, incrementArcadeWin, unlockSpecial, markMastered, totalMastered,
           recordMatch, recordTrivia, unlockAchievement, recordEndlessRun, recordQuizRun, resetAll,
           recordMatchHistory, recordDailyCompletion, dailyStats, dailyCalendar,
           recordTournamentWin, recordMatchup, setLastSeenVersion, recordLastSession,
           generateDailyQuests, refreshDailyQuests, recordQuestProgress };
})();

if (typeof module !== "undefined") module.exports = Storage;
