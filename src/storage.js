var Storage = (function () {
  const KEY = "heritageHeroes.save";

  const HERO_IDS = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  function defaults() {
    return {
      arcade: { moses: 0, david: 0, esther: 0, judah: 0, rambam: 0, golda: 0, einstein: 0 },
      sound: false,
      tutorialSeen: false,
      hardUnlocked: false,
      specialsUnlocked: { moses: false, david: false, esther: false, judah: false, rambam: false, golda: false, einstein: false },
      mastered: { moses: false, david: false, esther: false, judah: false, rambam: false, golda: false, einstein: false }
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

  return { load, save, incrementArcadeWin, unlockSpecial, markMastered, totalMastered };
})();

if (typeof module !== "undefined") module.exports = Storage;
