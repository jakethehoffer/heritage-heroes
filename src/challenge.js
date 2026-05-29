// Heritage Heroes — daily-challenge & share-link logic.
//
// Extracted from main.js so this (pure, no-DOM) logic can be unit-tested.
// main.js owns the impure boundaries (reads the clock for "today", reads
// window.location for the URL) and calls into these helpers.
var Challenge = (function () {
  // Ordered roster used for the daily-challenge hash->index mapping AND for
  // validating shared hero ids. MUST stay in this exact order — the daily
  // matchup is a hash of the date indexing into this list, so reordering would
  // silently change every day's challenge for every player.
  const HERO_IDS = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  // Deterministic daily challenge for an ISO date string ("YYYY-MM-DD"):
  // a player hero, a different opponent, and a difficulty — identical for
  // everyone on the same calendar day. Pure: callers pass today's date.
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
      playerHeroId: HERO_IDS[playerIdx],
      opponentHeroId: HERO_IDS[opponentIdx],
      difficulty
    };
  }

  // Parse a URL query string (e.g. window.location.search) into an incoming
  // shared-challenge descriptor, or null when there's no valid `share` param.
  // Pure: takes the search string rather than reading window.location.
  function parseChallengeParams(search) {
    if (typeof search !== "string") return null;
    const params = new URLSearchParams(search);
    const type = params.get("share");
    if (!type) return null;

    const validHero = (h) => HERO_IDS.includes(h);
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

  // Build a shareable URL: base + "?share=<type>&...". Skips null/empty params.
  // Pure: takes the base (origin + pathname) rather than reading window.
  function buildShareUrl(base, type, params) {
    const search = new URLSearchParams();
    search.set("share", type);
    for (const [k, v] of Object.entries(params || {})) {
      if (v != null && v !== "") search.set(k, String(v));
    }
    return base + "?" + search.toString();
  }

  return { getDailyChallenge, parseChallengeParams, buildShareUrl, HERO_IDS };
})();

if (typeof module !== "undefined") module.exports = Challenge;
