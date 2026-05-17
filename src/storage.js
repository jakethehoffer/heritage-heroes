var Storage = (function () {
  const KEY = "heritageHeroes.save";

  const HERO_IDS = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

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
        dailyStreak30:    false
      },
      recentMatches: [],  // ring buffer; newest first, max 10 entries
      daily: {
        completedDates: [],     // array of ISO date strings, sorted oldest-first
        currentStreak: 0,       // cached; recomputed on demand
        bestStreak: 0,          // all-time best consecutive-day streak
        lifetimeCompletions: 0  // total challenges ever completed
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
        // achievements boolean merge
        if (parsed.achievements && typeof parsed.achievements === "object") {
          for (const key of Object.keys(out.achievements)) {
            if (typeof parsed.achievements[key] === "boolean") {
              out.achievements[key] = parsed.achievements[key];
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
  function unlockAchievement(store, key) {
    const data = load(store);
    if (data.achievements[key] === false) {
      data.achievements[key] = true;
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

  // Push a match history entry to the front of the ring buffer, trim to 10, save, return updated save.
  function recordMatchHistory(store, entry) {
    const data = load(store);
    data.recentMatches.unshift(entry);
    if (data.recentMatches.length > 10) data.recentMatches = data.recentMatches.slice(0, 10);
    save(store, data);
    return data;
  }

  return { load, save, defaults, incrementArcadeWin, unlockSpecial, markMastered, totalMastered,
           recordMatch, recordTrivia, unlockAchievement, recordEndlessRun, resetAll,
           recordMatchHistory, recordDailyCompletion, dailyStats };
})();

if (typeof module !== "undefined") module.exports = Storage;
