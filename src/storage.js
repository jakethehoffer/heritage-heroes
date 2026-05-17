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
      sound: false,
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
        centurion:        false
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
        if (typeof parsed.sound === "boolean") out.sound = parsed.sound;
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

  return { load, save, incrementArcadeWin, unlockSpecial, markMastered, totalMastered,
           recordMatch, recordTrivia, unlockAchievement };
})();

if (typeof module !== "undefined") module.exports = Storage;
