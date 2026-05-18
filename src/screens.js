var Screens = (function () {
  const Heroes = (typeof require !== "undefined") ? require("./heroes.js") : window.Heroes;
  const Render = (typeof require !== "undefined") ? require("./render.js") : window.Render;
  const Stages = (typeof require !== "undefined") ? require("./stages.js") : window.Stages;
  const Combat = (typeof require !== "undefined") ? require("./combat.js") : window.Combat;
  const Storage = (typeof require !== "undefined") ? require("./storage.js") : window.Storage;
  // Calendar is optional: title screen guards every access so older tests
  // and headless paths that don't load src/calendar.js stay green.
  const Calendar = (typeof require !== "undefined")
    ? require("./calendar.js")
    : (typeof window !== "undefined" ? window.Calendar : undefined);

  // Gregorian month labels used by the "On This Day" calendar panel on the
  // title screen. Indexed 0-11 (Date#getMonth conventions); panel reads
  // MONTH_NAMES[event.month - 1] since calendar entries store 1-based months.
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // ── Confetti celebration helper ───────────────────────────────────────────
  // Returns a self-contained absolutely-positioned wrapper full of confetti
  // pieces. CSS handles all motion; `prefers-reduced-motion` hides them.
  // Used only on personal-best / champion moments so it stays meaningful.
  function renderConfetti(opts) {
    const count = (opts && opts.count) || 30;
    const range = (opts && opts.durationRange) || [2, 5];
    const minD = range[0];
    const maxD = range[1];
    const pieces = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 100;
      const delay = Math.random() * 1.5;
      const dur = minD + Math.random() * (maxD - minD);
      const hue = Math.floor(Math.random() * 360);
      pieces.push(`<span class="confetti-piece" style="--x:${x}%;--delay:${delay}s;--dur:${dur}s;--hue:${hue}deg"></span>`);
    }
    return `<div class="confetti" aria-hidden="true">${pieces.join("")}</div>`;
  }

  function renderTitle(state) {
    const stats = state.save && state.save.arcade ? state.save.arcade : {};
    const totalWins = Object.values(stats).reduce((s, n) => s + (n || 0), 0);
    const mastered = state.save && state.save.mastered ? state.save.mastered : {};
    // Endless best streak display
    const endlessScores = state.save && state.save.endlessHighScore ? state.save.endlessHighScore : {};
    let endlessStreakLine = "";
    const endlessEntries = Object.entries(endlessScores).filter(([, v]) => v > 0);
    if (endlessEntries.length > 0) {
      let bestHeroId = null, bestScore = 0;
      for (const [id, score] of endlessEntries) {
        if (score > bestScore) { bestScore = score; bestHeroId = id; }
      }
      const bestHeroName = bestHeroId ? (Heroes.byId(bestHeroId) || { name: bestHeroId }).name : "";
      endlessStreakLine = `<p class="endless-title-best">&#x1F3C6; Best endless streak: ${bestScore} (${Render.escapeHtml(bestHeroName)})</p>`;
    }
    // Heritage Quiz best streak banner
    const quizBest = (state.save && Number.isInteger(state.save.quizBestStreak)) ? state.save.quizBestStreak : 0;
    const quizBestLine = quizBest > 0
      ? `<p class="quiz-title-best">&#x1F9E0; Best Heritage Quiz streak: ${quizBest}</p>`
      : "";
    const masteredCount = Object.values(mastered).filter(Boolean).length;
    let masteryLine = "";
    if (masteredCount === 7) {
      masteryLine = `<p class="scholar-banner">&#x1F31F; HERITAGE SCHOLAR &mdash; All 7 heroes mastered!</p>`;
    } else if (masteredCount > 0) {
      masteryLine = `<p class="mastered-count">&#x1F31F; Mastered: ${masteredCount} of 7 heroes</p>`;
    }

    // Daily challenge banner
    let dailyBannerLine = "";
    let dailyStripLine = "";
    if (state.dailyToday) {
      const dt = state.dailyToday;
      const heroA = Heroes.byId(dt.challenge.playerHeroId);
      const heroB = Heroes.byId(dt.challenge.opponentHeroId);
      const heroAName = heroA ? Render.escapeHtml(heroA.name) : dt.challenge.playerHeroId;
      const heroBName = heroB ? Render.escapeHtml(heroB.name) : dt.challenge.opponentHeroId;
      const statusText = dt.stats.completedToday
        ? `&#x2713; Today's Challenge claimed &mdash; ${heroAName} vs ${heroBName}`
        : `&rarr; Today's Challenge: ${heroAName} vs ${heroBName}${dt.challenge.difficulty === "hard" ? " (Hard)" : ""}`;
      const bannerCls = dt.stats.completedToday ? "daily-banner claimed" : "daily-banner available";
      dailyBannerLine = `<p class="${bannerCls}">${statusText}</p>`;

      // Compact 7-day strip — only if user has at least one completion to celebrate.
      const dailySave = state.save && state.save.daily;
      if (dailySave && dailySave.lifetimeCompletions > 0) {
        dailyStripLine = _renderDailyStrip(state.save, null);
      }
    }

    // Featured hero panel
    const featuredIdx = (typeof state.titleFeaturedIndex === "number") ? state.titleFeaturedIndex : 0;
    const featuredHero = Heroes.list[featuredIdx] || Heroes.list[0];
    const featuredId = featuredHero.id;
    const isMastered = !!(mastered[featuredId]);
    const featuredPortrait = Render.renderHero({ heroId: featuredId, pose: "idle", facing: "right" });
    const featuredPanel = `
<div class="featured-hero" data-action="view-profile" data-hero="${featuredId}" role="button" tabindex="0" aria-label="View ${Render.escapeHtml(featuredHero.name)}'s profile">
  <div class="featured-portrait">${featuredPortrait}</div>
  <div class="featured-info">
    <p class="featured-label">FEATURED HERO</p>
    <h3 class="featured-name">${Render.escapeHtml(featuredHero.name)}${isMastered ? " &#x1F31F;" : ""}</h3>
    <div class="featured-meta">
      <span class="era">${Render.escapeHtml(featuredHero.era)}</span>
      ${featuredHero.profile && featuredHero.profile.dates ? `<span class="featured-dates">${Render.escapeHtml(featuredHero.profile.dates)}</span>` : ""}
    </div>
    ${featuredHero.profile && featuredHero.profile.quote ? `<p class="featured-quote">&ldquo;${Render.escapeHtml(featuredHero.profile.quote)}&rdquo;</p>` : ""}
    <p class="featured-cta">Click to learn more &rarr;</p>
  </div>
</div>`;

    const sparkles = `
<div class="title-sparkles" aria-hidden="true">
  <span class="sparkle" style="--x:10%;--dur:12s;--delay:0s"></span>
  <span class="sparkle" style="--x:25%;--dur:14s;--delay:2s"></span>
  <span class="sparkle" style="--x:42%;--dur:11s;--delay:4s"></span>
  <span class="sparkle" style="--x:60%;--dur:13s;--delay:1s"></span>
  <span class="sparkle" style="--x:77%;--dur:15s;--delay:3s"></span>
  <span class="sparkle" style="--x:90%;--dur:12s;--delay:5s"></span>
</div>`;

    // Continue Last Mode — one-click resume of the player's most-recent
    // completed session. Only renders when a valid lastSession exists AND
    // the recorded hero is still in the roster.
    let continueButton = "";
    if (state.save && state.save.lastSession) {
      const ls = state.save.lastSession;
      const heroObj = Heroes.byId(ls.playerHeroId);
      if (heroObj) {
        const MODE_LABELS = {
          quick:   "Quick Match",
          arcade:  "Arcade Ladder",
          endless: "Endless Survival",
          study:   "Study Mode"
        };
        const modeLabel = MODE_LABELS[ls.mode] || ls.mode;
        continueButton = `
    <button data-action="continue-last" class="continue-last" title="Pick up where you left off">
      <span class="continue-last-icon" aria-hidden="true">&#x25B6;</span>
      <span class="continue-last-label">Continue: ${Render.escapeHtml(modeLabel)}</span>
      <span class="continue-last-sub">as ${Render.escapeHtml(heroObj.name)}</span>
    </button>`;
      }
    }

    // Achievement progress widget — clickable shortcut to the Trophy Room.
    // Only shown once the player has unlocked at least one achievement to
    // avoid a discouraging "0 of 25" on a brand-new save. The existing
    // open-trophy-room action handler in main.js wires the click.
    const achievements = (state.save && state.save.achievements) ? state.save.achievements : {};
    const unlockedCount = ACHIEVEMENT_LIST.filter(a => !!achievements[a.key]).length;
    const totalCount = ACHIEVEMENT_LIST.length;
    const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
    let achievementProgress = "";
    if (unlockedCount > 0) {
      achievementProgress = `
  <button class="achievement-progress" data-action="open-trophy-room"
          title="View Trophy Room (${unlockedCount} of ${totalCount} unlocked)"
          aria-label="Trophy Room: ${unlockedCount} of ${totalCount} achievements unlocked">
    <span class="achievement-progress-icon" aria-hidden="true">&#x1F3C6;</span>
    <div class="achievement-progress-text">
      <div class="achievement-progress-label">
        <strong>${unlockedCount}</strong> of ${totalCount} achievements
      </div>
      <div class="achievement-progress-bar">
        <div class="achievement-progress-fill" style="width: ${pct}%"></div>
      </div>
    </div>
    <span class="achievement-progress-arrow" aria-hidden="true">&rarr;</span>
  </button>`;
    }

    // Daily Quests panel — shows today's 2 quests, their progress bars, and
    // the player's current streak. Lives between the Did You Know card and
    // the existing stat banners. Hidden when no quests are generated yet
    // (e.g. tests/headless paths where Storage.refreshDailyQuests never ran).
    const dq = state.save && state.save.dailyQuests;
    let dailyQuestsPanel = "";
    if (dq && Array.isArray(dq.quests) && dq.quests.length > 0) {
      const allComplete = !!dq.completedAll;
      const completedCount = dq.quests.filter(function (q) { return q.completed; }).length;
      const totalCount = dq.quests.length;
      const headerText = allComplete
        ? `&#x2728; All daily quests complete!`
        : `&#x1F4DC; Daily Quests &mdash; ${completedCount} of ${totalCount} done`;

      const questItems = dq.quests.map(function (q) {
        const target = q.target > 0 ? q.target : 1;
        const pct = Math.min(100, Math.round((q.progress / target) * 100));
        const checkmark = q.completed ? `<span class="dq-check">&#x2713;</span>` : "";
        return `
    <div class="dq-quest ${q.completed ? 'completed' : ''}">
      <div class="dq-quest-header">
        ${checkmark}
        <span class="dq-quest-label">${Render.escapeHtml(q.label || "")}</span>
        <span class="dq-quest-progress">${q.progress} / ${q.target}</span>
      </div>
      <div class="dq-quest-bar"><div class="dq-quest-fill" style="width:${pct}%"></div></div>
    </div>`;
      }).join("");

      const streakLine = (dq.currentStreak && dq.currentStreak > 0)
        ? `<div class="dq-streak">&#x1F525; ${dq.currentStreak}-day quest streak</div>`
        : "";

      dailyQuestsPanel = `
<div class="daily-quests-panel ${allComplete ? 'all-complete' : ''}">
  <div class="dq-header">${headerText}</div>
  ${questItems}
  ${streakLine}
</div>`;
    }

    // "Did You Know?" rotating fact card — surfaces one of the 140 hand-crafted
    // trivia explanations on every visit to the title screen. Click opens that
    // hero's profile via the existing view-profile action handler. A fresh fact
    // is picked on each render, so the existing titleFeaturedTimer (which
    // re-renders every 8s as the featured hero rotates) naturally rotates the
    // fact too — no new timer needed.
    let factCard = "";
    const fact = (Heroes && typeof Heroes.pickRandomFact === "function")
      ? Heroes.pickRandomFact()
      : null;
    if (fact) {
      factCard = `
  <button class="title-funfact" data-action="view-profile" data-hero="${fact.heroId}"
          title="Click to learn more about ${Render.escapeHtml(fact.heroName)}"
          aria-label="Did You Know? ${Render.escapeHtml(fact.explanation)} Click to view ${Render.escapeHtml(fact.heroName)}'s profile.">
    <span class="title-funfact-label">&#x1F4A1; Did You Know?</span>
    <p class="title-funfact-text">${Render.escapeHtml(fact.explanation)}</p>
    <p class="title-funfact-attribution">About ${Render.escapeHtml(fact.heroName)} &rarr;</p>
  </button>`;
    }

    // "On This Day in Jewish History" — sits between the always-on Did You
    // Know card and the Daily Quests panel. Only renders on dates where the
    // curated Calendar.EVENTS list has at least one match, so most visits
    // see no panel and the appearance feels special. Multiple events on the
    // same date all render (Calendar.todaysEvents sorts oldest first).
    let calendarPanel = "";
    const calendarEvents = (Calendar && typeof Calendar.todaysEvents === "function")
      ? Calendar.todaysEvents()
      : [];
    if (calendarEvents.length > 0) {
      const items = calendarEvents.map(function (e) {
        const hero = e.heroId ? Heroes.byId(e.heroId) : null;
        const heroLink = hero
          ? `<button class="otd-hero-link" data-action="view-profile" data-hero="${e.heroId}">More about ${Render.escapeHtml(hero.name)} &rarr;</button>`
          : "";
        return `
    <div class="otd-event">
      <div class="otd-year">${e.year}</div>
      <div class="otd-event-text">${Render.escapeHtml(e.event)}</div>
      ${heroLink}
    </div>`;
      }).join("");

      const first = calendarEvents[0];
      const dateLabel = `${MONTH_NAMES[first.month - 1]} ${first.day}`;
      calendarPanel = `
<div class="otd-panel">
  <div class="otd-header">
    <span class="otd-icon" aria-hidden="true">&#x1F4C5;</span>
    <span class="otd-label">On This Day &mdash; ${Render.escapeHtml(dateLabel)}</span>
  </div>
  <div class="otd-events">${items}</div>
</div>`;
    }

    const playerName = (state.save && typeof state.save.playerName === "string") ? state.save.playerName : "";
    const taglineHtml = playerName
      ? `<p class="tagline">Welcome back, ${Render.escapeHtml(playerName)}!</p>`
      : `<p class="tagline">A turn-based duel through history.</p>`;

    return `
<section class="screen screen-title">
  ${sparkles}
  ${state.incomingChallenge ? renderChallengeBanner(state.incomingChallenge) : ""}
  <h1>Heritage Heroes</h1>
  ${taglineHtml}
  ${featuredPanel}
  <div class="title-buttons">
    <button data-action="goto-mode">BEGIN</button>${continueButton}
    <button data-action="start-quick-play" class="quick-play" title="Random hero, random stage &mdash; just play.">
      <span class="quick-play-icon" aria-hidden="true">&#x1F3B2;</span>
      <span class="quick-play-label">Quick Play</span>
      <span class="quick-play-sub">Random hero, random stage</span>
    </button>
    <button data-action="open-hall" class="secondary">Hall of Heroes</button>
    <button data-action="open-timeline" class="secondary">Heritage Timeline</button>
    ${state.save.recentMatches && state.save.recentMatches.length > 0 ? `
    <button data-action="open-history" class="secondary">Match History</button>` : ""}
    <button data-action="view-stats" class="secondary">View Stats</button>
    <button data-action="show-help" class="secondary">How to Play</button>
    <button data-action="open-settings" class="secondary">Settings</button>
  </div>
  ${achievementProgress}
  ${factCard}
  ${calendarPanel}
  ${dailyQuestsPanel}
  ${totalWins > 0 ? `<p class="stats">Arcade wins: ${totalWins}</p>` : ""}
  ${masteryLine}
  ${endlessStreakLine}
  ${quizBestLine}
  ${dailyBannerLine}
  ${dailyStripLine}
</section>`;
  }

  function renderChallengeBanner(c) {
    const fromText = c.from ? `${Render.escapeHtml(c.from)} sent you a challenge` : "Someone sent you a challenge";
    let descText = "";
    if (c.type === "daily") {
      descText = "Try today's Daily Challenge!";
    } else if (c.type === "quick") {
      const p = Heroes.byId(c.playerHeroId);
      const o = Heroes.byId(c.opponentHeroId);
      descText = `Quick Match: ${p ? Render.escapeHtml(p.name) : c.playerHeroId} vs ${o ? Render.escapeHtml(o.name) : c.opponentHeroId}${c.hard ? " (Hard mode)" : ""}`;
    } else if (c.type === "endless") {
      const h = Heroes.byId(c.heroId);
      const hName = h ? Render.escapeHtml(h.name) : c.heroId;
      descText = c.streakToBeat > 0
        ? `Endless Survival as ${hName} — beat a streak of ${c.streakToBeat}`
        : `Endless Survival as ${hName}`;
    } else if (c.type === "arcade") {
      const h = Heroes.byId(c.heroId);
      descText = `Arcade Ladder as ${h ? Render.escapeHtml(h.name) : c.heroId}`;
    } else if (c.type === "tournament") {
      const h = Heroes.byId(c.heroId);
      descText = `Tournament as ${h ? Render.escapeHtml(h.name) : c.heroId}`;
    }
    return `
<div class="challenge-banner">
  <div class="challenge-banner-icon">&#x1F3AF;</div>
  <div class="challenge-banner-text">
    <p class="challenge-from">${fromText}</p>
    <p class="challenge-desc">${descText}</p>
  </div>
  <div class="challenge-banner-buttons">
    <button data-action="accept-challenge" class="challenge-accept">Accept</button>
    <button data-action="dismiss-challenge" class="secondary">Dismiss</button>
  </div>
</div>`;
  }

  function renderModeSelect(state) {
    return `
<section class="screen screen-mode">
  <h2>Choose your mode</h2>
  <div class="mode-grid">
    <button data-action="start-quick" class="mode-card">
      <h3>Quick Match</h3>
      <p>One duel. You vs the computer, or two players on this keyboard.</p>
    </button>
    <button data-action="start-arcade" class="mode-card">
      <h3>Arcade Ladder</h3>
      <p>Pick a hero, beat all six others one by one.</p>
    </button>
    <button data-action="start-study" class="mode-card">
      <h3>Study Mode</h3>
      <p>Learn about each hero by answering all 20 of their trivia questions in a row. Ace them all to earn a Mastery star.</p>
    </button>
    <button data-action="start-endless" class="mode-card">
      <h3>Endless Survival</h3>
      <p>Pick a hero. Fight as many opponents as you can survive. Heal 25 HP after each win &mdash; see how far you can get.</p>
    </button>
    <button data-action="start-daily" class="mode-card">
      <h3>Daily Challenge</h3>
      <p>One specific matchup per day, the same for everyone. Beat it to claim today and build your streak.</p>
    </button>
    <button data-action="start-tournament" class="mode-card">
      <h3>Tournament</h3>
      <p>Single-elimination bracket. Beat two opponents in a row to be crowned Champion.</p>
    </button>
    <button data-action="start-spectator" class="mode-card">
      <h3>Spectator</h3>
      <p>Pick two heroes and watch them battle. No commitment &mdash; just see how the AI personalities clash.</p>
    </button>
    <button data-action="start-quiz" class="mode-card">
      <h3>Heritage Quiz</h3>
      <p>Answer questions from all 7 heroes. One wrong answer ends your run. How far can you go?</p>
    </button>
    <button data-action="start-practice" class="mode-card">
      <h3>Practice</h3>
      <p>Pick any matchup and just play. Nothing tracked &mdash; no stats, no achievements, no quests. Just learn the heroes.</p>
    </button>
  </div>
  <button data-action="goto-title" class="back">&larr; Back</button>
</section>`;
  }

  function renderOpponentSelect(state) {
    return `
<section class="screen screen-mode">
  <h2>Who is your opponent?</h2>
  <div class="mode-grid">
    <button data-action="set-opponent" data-opp="ai" class="mode-card">
      <h3>The Computer</h3>
      <p>Play solo. The computer picks a hero and plays its own turns.</p>
    </button>
    <button data-action="set-opponent" data-opp="human" class="mode-card">
      <h3>A Friend on This Keyboard</h3>
      <p>Take turns at the same screen. Each player clicks on their own turn.</p>
    </button>
  </div>
  <button data-action="goto-mode" class="back">&larr; Back</button>
</section>`;
  }

  // Build the compact Spotlight Stats block for a hero card.
  // Returns a `<div class="hero-stats">…</div>` HTML string.
  //
  // Always shown when nonzero:
  //   🏆 W/L: X-Y (Z%) — when played > 0
  //   ★ MASTERED      — when save.mastered[heroId] is true
  // Mode-specific:
  //   endless  → 🔥 Best run: N      when endlessHighScore[heroId] > 0
  //   arcade   → 👑 Arcade wins: N   when arcade[heroId] > 0
  // Empty-state: no data at all → "✨ New — never played" (italic muted)
  //
  // Safe-default everything: any missing object/field is treated as 0/false.
  function _heroSpotlightStats(save, heroId, mode) {
    const s = save || {};
    const ph = (s.stats && s.stats.perHero && s.stats.perHero[heroId])
      ? s.stats.perHero[heroId]
      : { played: 0, won: 0, triviaCorrect: 0, triviaTotal: 0 };
    const played = Number.isInteger(ph.played) ? ph.played : 0;
    const won = Number.isInteger(ph.won) ? ph.won : 0;
    const isMastered = !!(s.mastered && s.mastered[heroId]);
    const endlessBest = (s.endlessHighScore && Number.isInteger(s.endlessHighScore[heroId]))
      ? s.endlessHighScore[heroId] : 0;
    const arcadeWins = (s.arcade && Number.isInteger(s.arcade[heroId]))
      ? s.arcade[heroId] : 0;

    const chips = [];

    if (played > 0) {
      const losses = Math.max(0, played - won);
      const pct = Math.round((won / played) * 100);
      chips.push(`<span class="hero-stat">&#x1F3C6; ${won}-${losses} (${pct}%)</span>`);
    }

    if (isMastered) {
      chips.push(`<span class="hero-stat">&#x2605; MASTERED</span>`);
    }

    if (mode === "endless" && endlessBest > 0) {
      chips.push(`<span class="hero-stat">&#x1F525; Best run: ${endlessBest}</span>`);
    }

    if (mode === "arcade" && arcadeWins > 0) {
      chips.push(`<span class="hero-stat">&#x1F451; Arcade wins: ${arcadeWins}</span>`);
    }

    if (chips.length === 0) {
      return `<div class="hero-stats empty"><span class="hero-stat-empty">&#x2728; New &mdash; never played</span></div>`;
    }
    return `<div class="hero-stats">${chips.join("")}</div>`;
  }

  function renderCharSelect(state) {
    const heading = state.mode === "arcade"
      ? "Pick your hero for the Arcade Ladder"
      : state.mode === "study"
      ? "Pick a hero to study"
      : state.mode === "endless"
      ? "Pick a hero for your Endless run."
      : state.mode === "tournament"
      ? `Player ${state.selecting}, pick your hero for the Tournament`
      : state.mode === "spectator"
      ? (state.selecting === 1 ? "Spectator: pick Hero A" : "Spectator: pick Hero B")
      : state.mode === "practice"
      ? (state.selecting === 1 ? "Practice — pick Hero 1" : "Practice — pick Hero 2")
      : (state.selecting === 1 ? "Player 1, pick your hero" : "Player 2, pick your hero");

    const mastered = state.save && state.save.mastered ? state.save.mastered : {};

    const cards = Heroes.list.map(h => {
      const specialLine = `<strong>${Render.escapeHtml(h.moves.special.name)}</strong> — Special: ${Render.escapeHtml(h.moves.special.description)}`;
      const masteredStar = (state.mode === "study" && mastered[h.id]) ? "&#x1F31F; " : "";
      const spotlight = _heroSpotlightStats(state.save, h.id, state.mode);
      return `
      <div class="hero-card-wrap">
        <button class="hero-card" data-action="pick-hero" data-hero="${h.id}">
          <div class="hero-portrait">${Render.renderHero({ heroId: h.id, pose: "idle", facing: "right" })}</div>
          <div class="hero-meta">
            <h3>${masteredStar}${Render.escapeHtml(h.name)}</h3>
            <span class="era">${Render.escapeHtml(h.era)}</span>
            <p class="bio">${Render.escapeHtml(h.bio)}</p>
            ${spotlight}
            <ul class="moves">
              <li><strong>${Render.escapeHtml(h.moves.attack.name)}</strong> — Basic Attack (${h.moves.attack.damage})</li>
              <li><strong>${Render.escapeHtml(h.moves.defend.name)}</strong> — Defend (halves next hit)</li>
              <li>${specialLine}</li>
            </ul>
          </div>
        </button>
        <button class="info-pill" data-action="view-profile" data-hero="${h.id}">&#x2139; Info</button>
      </div>
    `;
    }).join("");

    return `
<section class="screen screen-charselect">
  <h2>${heading}</h2>
  <div class="hero-grid">${cards}</div>
  <button data-action="goto-mode" class="back">&larr; Back</button>
</section>`;
  }

  function renderFighterBadges(playerSlot, match) {
    const player = match.players[playerSlot];
    const statuses = player.statuses || {};
    const badges = [];

    if (player.bossTwist) {
      badges.push(`<span class="status-badge status-boss" title="Boss — buffed HP and damage">&#x1F451; BOSS</span>`);
    }
    if (statuses.defend) {
      badges.push(`<span class="status-badge status-defend" title="Shielded — next attack halved">&#x1F6E1;&#xFE0F;</span>`);
    }
    if (statuses.reversal) {
      badges.push(`<span class="status-badge status-reversal" title="Next attack bounces back">&#x21A9;&#xFE0F; Reversal</span>`);
    }
    if (typeof statuses.burn === "number" && statuses.burn > 0) {
      badges.push(`<span class="status-badge status-burn" title="Burning — ${statuses.burn} turns left, 8 dmg/turn">&#x1F525; ${statuses.burn}</span>`);
    }
    if (statuses.doubleNextAttack) {
      badges.push(`<span class="status-badge status-empowered" title="Next basic attack deals double damage">&#x1F4AA; Empowered</span>`);
    }
    if (typeof statuses.charging === "number" && statuses.charging > 0) {
      badges.push(`<span class="status-badge status-charging" title="Charging E=mc² — ${statuses.charging} turns until unleash">&#x26A1; ${statuses.charging}</span>`);
    }

    if (badges.length === 0) return "";
    return `<div class="status-badges">${badges.join("")}</div>`;
  }

  // Pure helper: given a match and the active player's slot index, return a
  // small contextual hint object `{ icon, text }` or `null` when no tactical
  // situation applies. Priority order (high to low): reversal > charging >
  // doubleNextAttack (empowered) > burn > opp HP <= 25 (finish).
  function battleStrategyHint(match, activeIdx) {
    if (!match || !match.players || !match.players[activeIdx]) return null;
    const me = match.players[activeIdx];
    const opp = match.players[1 - activeIdx];
    if (!opp) return null;
    const myStatus = me.statuses || {};
    const oppStatus = opp.statuses || {};
    const oppHp = opp.hp;

    // 1. Opponent has reversal — don't attack
    if (oppStatus.reversal) {
      return { icon: "⚠️", text: "Opponent will reflect your attack — try Defend or Special." };
    }

    // 2. Opponent is charging a big attack — defend!
    if (typeof oppStatus.charging === "number" && oppStatus.charging > 0) {
      return { icon: "\u{1F6E1}️", text: "Opponent is charging! Defend to halve the incoming blast." };
    }

    // 3. You're empowered (2x next attack) — attack!
    if (myStatus.doubleNextAttack) {
      return { icon: "\u{1F4AA}", text: "Your next Attack does double damage — strike now!" };
    }

    // 4. You're burning — finish fast (take 8/turn)
    if (typeof myStatus.burn === "number" && myStatus.burn > 0) {
      const turnsWord = myStatus.burn === 1 ? "turn" : "turns";
      return { icon: "\u{1F525}", text: `You're burning for ${myStatus.burn} more ${turnsWord} — finish them fast!` };
    }

    // 5. Special could finish — opp HP <= 25 (and still alive)
    if (oppHp <= 25 && oppHp > 0) {
      return { icon: "✨", text: "Special could finish them — answer trivia correctly to win!" };
    }

    return null;
  }

  function renderBattle(state) {
    const match = state.match;
    const p0 = match.players[0];
    const p1 = match.players[1];
    const h0 = Heroes.byId(p0.heroId);
    const h1 = Heroes.byId(p1.heroId);
    const stageId = match.stageId || h1.stageId;  // fallback for any legacy state
    const active = match.players[match.activePlayer];
    const activeHero = match.activePlayer === 0 ? h0 : h1;

    const charging = Combat.isCharging(match, match.activePlayer);
    const isHumanTurn = state.controllers[match.activePlayer] === "human";
    const isSpectator = state.mode === "spectator";
    const moveButtons = charging
      ? `<button data-action="ai-step" data-move="charge">${Render.escapeHtml(activeHero.name)} is charging&hellip; (click to continue)</button>`
      : renderMoveButtons(activeHero, active);

    const turnLabel = (() => {
      const ctrl = state.controllers[match.activePlayer];
      if (ctrl === "ai") return `${activeHero.name} (AI)'s turn`;
      if (state.mode === "quick") return `${activeHero.name} — Player ${match.activePlayer + 1}'s turn`;
      if (state.mode === "tournament" && state.tournament) {
        const t = state.tournament;
        const slotA = (state._currentTournamentSlots || [0, 1])[0];
        const slotB = (state._currentTournamentSlots || [0, 1])[1];
        const activeSlot = match.activePlayer === 0 ? slotA : slotB;
        // Count how many human slots are at or before activeSlot
        let humanNum = 0;
        const humanSlotMap = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
        const humanSlots = humanSlotMap[t.humanCount] || [0];
        for (const hs of humanSlots) {
          humanNum++;
          if (hs === activeSlot) break;
        }
        return `${activeHero.name} — Player ${humanNum}'s turn`;
      }
      return `${activeHero.name}'s turn`;
    })();

    const arcadeRoadmapBanner = state.mode === "arcade" && state.arcade
      ? renderArcadeRoadmap(state, "compact")
      : "";

    // Practice mode reminder chip — sits above the HP bars so it's always in
    // view during the match. Tracking is suppressed for every recording site
    // in main.js; this badge is the on-screen confirmation.
    const practiceBadge = state.mode === "practice"
      ? `<div class="practice-badge">PRACTICE &mdash; nothing tracked</div>`
      : "";

    // Strategy hint banner: only on human turns, only when hints not disabled,
    // never while the active player is mid-charge (one-button state). Picks
    // the highest-priority hint via `battleStrategyHint`.
    const hintsEnabled = !state.save || state.save.strategyHints !== "off";
    let hintBanner = "";
    if (isHumanTurn && hintsEnabled && !charging) {
      const hint = battleStrategyHint(match, match.activePlayer);
      if (hint) {
        hintBanner = `
  <div class="battle-hint-banner">
    <span class="battle-hint-icon">${hint.icon}</span>
    <span class="battle-hint-text">${Render.escapeHtml(hint.text)}</span>
  </div>`;
      }
    }

    // Boss visual treatment
    const isBoss0 = !!p0.bossTwist;
    const isBoss1 = !!p1.bossTwist;
    const label0 = isBoss0 ? `&#x1F451; BOSS ${Render.escapeHtml(h0.name)}` : Render.escapeHtml(h0.name);
    const label1 = isBoss1 ? `&#x1F451; BOSS ${Render.escapeHtml(h1.name)}` : Render.escapeHtml(h1.name);
    const fighter0Class = `fighter fighter-left${isBoss0 ? " is-boss" : ""}`;
    const fighter1Class = `fighter fighter-right${isBoss1 ? " is-boss" : ""}`;

    // Persistent HUD strip — turn counter + match timer. Sits below the arcade
    // roadmap (when present) and above the HP bars. The timer reads "current
    // elapsed at this render" — it advances each turn (every render) rather
    // than ticking live every second (no setInterval to avoid extra render
    // churn during fights). On the result screen, matchStats.endedAt freezes
    // the value to the final match duration.
    const turnN = (match.turnNumber || 1);
    const elapsed = _matchElapsedString(state.matchStats);
    const battleHud = `
  <div class="battle-hud">
    <span class="battle-hud-turn">Turn ${turnN}</span>
    <span class="battle-hud-timer">${elapsed}</span>
  </div>`;

    return `
<section class="screen screen-battle">
  ${arcadeRoadmapBanner}${battleHud}${practiceBadge}${hintBanner}
  <div class="hp-bars">
    <div class="hp-cell">${Render.hpBar({ hp: p0.hp, max: p0.maxHp, label: label0, side: "left", rawLabel: true })}</div>
    <div class="vs-label">vs</div>
    <div class="hp-cell">${Render.hpBar({ hp: p1.hp, max: p1.maxHp, label: label1, side: "right", rawLabel: true })}</div>
  </div>
  <div class="arena">
    <div class="stage">${Stages.byId(stageId)}</div>
    <div class="${fighter0Class}">
      ${renderFighterBadges(0, match)}
      ${Render.renderHero({ heroId: h0.id, pose: "idle", facing: "right" })}
    </div>
    <div class="${fighter1Class}">
      ${renderFighterBadges(1, match)}
      ${Render.renderHero({ heroId: h1.id, pose: "idle", facing: "left" })}
    </div>
  </div>
  <div class="turn-banner">${Render.escapeHtml(turnLabel)}</div>
  <div class="moves-row">${isSpectator
    ? `<div class="spectator-indicator"><span class="spectator-icon">&#x1F440;</span><span>Spectating &mdash; AI is playing both sides</span></div>`
    : (isHumanTurn ? moveButtons : `<button data-action="ai-step">Computer is thinking&hellip; (click)</button>`)}</div>
  <div class="move-log">${match.log.slice(-5).map(l => `<div>${Render.escapeHtml(l)}</div>`).join("")}</div>
  <div class="battle-bottom-buttons">
    <button data-action="pause-battle" class="back">&#x23F8; Pause</button>
    <button data-action="confirm-quit" class="back">Quit match</button>
  </div>
</section>`;
  }

  function renderMoveButtons(hero, playerState) {
    const cd = playerState.specialCooldown;
    let specialLabel, specialSub, specialDisabled;
    if (cd > 0) {
      specialLabel = Render.escapeHtml(hero.moves.special.name);
      specialSub = `Ready in ${cd}`;
      specialDisabled = "disabled";
    } else {
      specialLabel = Render.escapeHtml(hero.moves.special.name);
      specialSub = Render.escapeHtml(hero.moves.special.description);
      specialDisabled = "";
    }
    return `
      <button data-action="player-move" data-move="attack">
        <strong>${Render.escapeHtml(hero.moves.attack.name)}</strong>
        <span class="sub">${Render.escapeHtml(hero.moves.attack.description)} (${hero.moves.attack.damage} dmg)</span>
      </button>
      <button data-action="player-move" data-move="defend">
        <strong>${Render.escapeHtml(hero.moves.defend.name)}</strong>
        <span class="sub">Halves the next incoming attack.</span>
      </button>
      <button data-action="player-move" data-move="special"${specialDisabled ? ` ${specialDisabled}` : ""}>
        <strong>${specialLabel}</strong>
        <span class="sub">${specialSub}</span>
      </button>
    `;
  }

  const ARCADE_ENDINGS = {
    moses:    "Moses leads the heroes out across history, his staff aglow.",
    david:    "King David's sling has felled every giant. The harp plays into the night.",
    esther:   "Queen Esther's wit turned every challenge back on itself. Her people are saved again.",
    judah:    "Judah Maccabee rededicates the temple. The lights of victory burn for eight nights.",
    rambam:   "Maimonides closes the great book. Wisdom outlasts the sword.",
    golda:    "Golda lights one more cigarette and signs the day's papers. The nation endures.",
    einstein: "Einstein bows from the lectern. The equations balance once more."
  };

  // ── Helper: compute personal-records insights for match recap ─────────────
  function _computeMatchInsights(state, currentEntry) {
    if (!currentEntry) return [];
    const insights = [];
    const matches  = state.save.recentMatches || [];
    const matchups = state.save.matchups || {};
    const perHero  = (state.save.stats && state.save.stats.perHero) || {};

    const playerHeroId   = currentEntry.hero0Id;
    const opponentHeroId = currentEntry.hero1Id;
    const playerWon      = currentEntry.winnerSlot === 0;

    const playerHero   = Heroes.byId(playerHeroId);
    const opponentHero = Heroes.byId(opponentHeroId);
    if (!playerHero || !opponentHero) return [];

    const playerName   = playerHero.name;
    const opponentName = opponentHero.name;

    // ── 1. Win streak as this hero ───────────────────────────────────────────
    // Walk recent matches newest → oldest. For matches where you played as this hero,
    // count consecutive wins. Other-hero matches don't break the streak; same-hero loss does.
    if (playerWon) {
      let streak = 0;
      for (const m of matches) {
        if (m.hero0Id === playerHeroId) {
          if (m.winnerSlot === 0) streak += 1;
          else break;
        }
        // else: ignore (other-hero match)
      }
      if (streak >= 2) {
        insights.push({ priority: 10 + streak, text: `🔥 Win streak as ${Render.escapeHtml(playerName)}: <strong>${streak}</strong>` });
      }
    }

    // ── 2. Matchup record ────────────────────────────────────────────────────
    const matchupKey = `${playerHeroId}|${opponentHeroId}`;
    const record = matchups[matchupKey];
    if (record && (record.wins + record.losses) >= 2) {
      const total = record.wins + record.losses;
      insights.push({
        priority: 5 + Math.min(total, 10),
        text: `⚔️ vs ${Render.escapeHtml(opponentName)}: <strong>${record.wins}-${record.losses}</strong>`
      });
    }

    // ── 3. Fastest win as this hero ──────────────────────────────────────────
    if (playerWon) {
      let prevFastest = Infinity;
      for (const m of matches) {
        if (m.id === currentEntry.id) continue;  // skip this match
        if (m.hero0Id === playerHeroId && m.winnerSlot === 0) {
          if (m.turns < prevFastest) prevFastest = m.turns;
        }
      }
      if (prevFastest !== Infinity) {
        if (currentEntry.turns < prevFastest) {
          // NEW RECORD!
          insights.push({
            priority: 20,
            text: `⚡ Fastest win as ${Render.escapeHtml(playerName)}: <strong>${currentEntry.turns} turns</strong> (NEW RECORD!)`
          });
        } else if (currentEntry.turns === prevFastest) {
          insights.push({
            priority: 8,
            text: `⚡ Tied your fastest win as ${Render.escapeHtml(playerName)} (<strong>${currentEntry.turns} turns</strong>)`
          });
        } else {
          insights.push({
            priority: 3,
            text: `⚡ Your fastest as ${Render.escapeHtml(playerName)}: <strong>${prevFastest} turns</strong>`
          });
        }
      }
    }

    // ── 4. Trivia accuracy as this hero ─────────────────────────────────────
    const ph = perHero[playerHeroId];
    if (ph && ph.triviaTotal >= 5) {
      const pct = Math.round((ph.triviaCorrect / ph.triviaTotal) * 100);
      insights.push({
        priority: 4,
        text: `📚 Trivia accuracy as ${Render.escapeHtml(playerName)}: <strong>${pct}%</strong> (${ph.triviaCorrect}/${ph.triviaTotal})`
      });
    }

    // Sort by priority desc, take top 3
    insights.sort((a, b) => b.priority - a.priority);
    return insights.slice(0, 3).map(i => i.text);
  }

  // ── Helper: build the Personal Records HTML block for a given state ────────
  // Uses state.save.recentMatches[0] as the current match entry.
  // Returns HTML string (may be empty string if no insights or no entry).
  function _buildRecordsHtml(state) {
    const recentMatchEntry = state.save && state.save.recentMatches && state.save.recentMatches[0];
    if (!recentMatchEntry) return "";
    const insightLines = _computeMatchInsights(state, recentMatchEntry);
    if (insightLines.length === 0) return "";
    return `
<div class="match-records">
  <h3>Your Records</h3>
  <ul class="records-list">
    ${insightLines.map(line => `<li>${line}</li>`).join("")}
  </ul>
</div>`;
  }

  // ── Helper: format match elapsed time as m:ss for HUD + recap ────────────
  // Returns "0:00" when matchStats is null/missing or startedAt is unset (the
  // pre-match state). When endedAt is set (match concluded), the result is
  // stable; otherwise it reads "current elapsed at this render" — which is
  // updated whenever render() runs (every player move).
  function _matchElapsedString(matchStats) {
    if (!matchStats) return "0:00";
    // Treat null/undefined startedAt as "no match yet" — but allow 0 as a
    // valid epoch (used by some tests + a defensive fallback when Date is
    // unavailable). Same for endedAt: a literal 0 is honored as "ended at
    // epoch", which in practice never happens but keeps the helper pure.
    if (matchStats.startedAt == null) return "0:00";
    const endTime = (matchStats.endedAt != null)
      ? matchStats.endedAt
      : (typeof Date !== "undefined" ? Date.now() : matchStats.startedAt);
    const secs = Math.max(0, Math.floor((endTime - matchStats.startedAt) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  // ── Helper: pick a "Did You Know?" fact from heroes not seen this match ──
  function _pickDidYouKnow(h0, h1, stats) {
    const seen0 = (stats && stats.triviaSeen && stats.triviaSeen[h0.id]) || [];
    const seen1 = (stats && stats.triviaSeen && stats.triviaSeen[h1.id]) || [];
    const candidates = [];
    h0.trivia.forEach((t, i) => { if (!seen0.includes(i)) candidates.push({ hero: h0, trivia: t }); });
    h1.trivia.forEach((t, i) => { if (!seen1.includes(i)) candidates.push({ hero: h1, trivia: t }); });
    if (candidates.length === 0) {
      // Fallback: pick any (player has seen them all this match — rare)
      const h = Math.random() < 0.5 ? h0 : h1;
      const t = h.trivia[Math.floor(Math.random() * h.trivia.length)];
      return { hero: h, trivia: t };
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ── Helper: SVG line chart of both heroes' HP across the match's turns ──
  // Drives the "HP over time" panel on the result screen. Pure visualization
  // layer: takes pre-recorded snapshots and renders a self-contained inline
  // SVG (no scripts, no interactivity). Returns "" when no data to plot.
  //
  //   snapshots: [{ turn, hp0, hp1 }, ...]  — pushed from main.js
  //   names:     { name0, name1 }            — for the legend
  //   colors:    { color0, color1 }          — line colors (defaults: navy / terracotta)
  //   opts:      { width, height }           — defaults to 320 x 140
  //
  // Layout: legend lives at the top inside the SVG (above the plot area),
  // so padT is generous (26px) to leave room for it.
  function renderHpChart(snapshots, names, colors, opts) {
    if (!snapshots || snapshots.length === 0) return "";
    const W = (opts && opts.width)  || 320;
    const H = (opts && opts.height) || 140;
    const padL = 24, padR = 14, padT = 26, padB = 22;

    const maxHp = Math.max.apply(null, snapshots.reduce(
      (acc, s) => { acc.push(s.hp0, s.hp1); return acc; }, [1]
    ));
    const maxTurn = Math.max.apply(null, snapshots.map(s => s.turn).concat([1]));

    const xFor = (turn) => padL + (turn / maxTurn) * (W - padL - padR);
    const yFor = (hp)   => padT + ((maxHp - hp) / maxHp) * (H - padT - padB);

    const buildPath = (key) => snapshots.map((s, i) => {
      const cmd = i === 0 ? "M" : "L";
      return cmd + xFor(s.turn).toFixed(1) + "," + yFor(s[key]).toFixed(1);
    }).join(" ");

    const path0 = buildPath("hp0");
    const path1 = buildPath("hp1");
    const color0 = (colors && colors.color0) || "#1a2a4f";   // navy
    const color1 = (colors && colors.color1) || "#c1462d";   // terracotta
    const name0 = Render.escapeHtml((names && names.name0) || "P1");
    const name1 = Render.escapeHtml((names && names.name1) || "P2");

    const xAxisY = H - padB + 0.5;
    const midY = (padT + (H - padB)) / 2;
    // Dedup tick labels — if maxTurn is small, ceil(maxTurn/2) can collide.
    const xLabelTicks = [];
    [0, Math.ceil(maxTurn / 2), maxTurn].forEach(t => {
      if (xLabelTicks.indexOf(t) === -1) xLabelTicks.push(t);
    });

    const last = snapshots[snapshots.length - 1];

    return `<svg class="hp-chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="HP timeline chart">
    <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="rgba(0,0,0,0.08)" stroke-dasharray="3,3"/>
    <line x1="${padL}" y1="${midY}" x2="${W - padR}" y2="${midY}" stroke="rgba(0,0,0,0.08)" stroke-dasharray="3,3"/>
    <line x1="${padL}" y1="${xAxisY}" x2="${W - padR}" y2="${xAxisY}" stroke="rgba(0,0,0,0.3)"/>
    <text x="${padL - 4}" y="${padT + 4}" text-anchor="end" font-size="9" fill="rgba(0,0,0,0.55)" font-family="monospace">${maxHp}</text>
    <text x="${padL - 4}" y="${xAxisY - 2}" text-anchor="end" font-size="9" fill="rgba(0,0,0,0.55)" font-family="monospace">0</text>
    ${xLabelTicks.map(t => `<text x="${xFor(t).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="rgba(0,0,0,0.55)" font-family="monospace">${t}</text>`).join("")}
    <text x="${((padL + W - padR) / 2).toFixed(1)}" y="${H - 2 + 0.5}" text-anchor="middle" font-size="8" fill="rgba(0,0,0,0.45)" font-family="monospace">TURN</text>
    <path d="${path0}" fill="none" stroke="${color0}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${path1}" fill="none" stroke="${color1}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="4,3"/>
    <circle cx="${xFor(last.turn).toFixed(1)}" cy="${yFor(last.hp0).toFixed(1)}" r="4" fill="${color0}"/>
    <circle cx="${xFor(last.turn).toFixed(1)}" cy="${yFor(last.hp1).toFixed(1)}" r="4" fill="${color1}"/>
    <g font-family="Georgia, serif" font-size="10">
      <line x1="${padL}" y1="${padT - 12}" x2="${padL + 14}" y2="${padT - 12}" stroke="${color0}" stroke-width="2.5"/>
      <text x="${padL + 18}" y="${padT - 9}" fill="${color0}">${name0}</text>
      <line x1="${padL + 110}" y1="${padT - 12}" x2="${padL + 124}" y2="${padT - 12}" stroke="${color1}" stroke-width="2.5" stroke-dasharray="4,3"/>
      <text x="${padL + 128}" y="${padT - 9}" fill="${color1}">${name1}</text>
    </g>
  </svg>`;
  }

  // ── Helper: render Match Summary + Did You Know? sections ───────────────
  // recordsHtml: optional pre-rendered HTML for the Personal Records block (pass "" to omit)
  function _renderRecapSections(match, stats, h0, h1, recordsHtml) {
    if (!stats) return "";
    const turns = (match.turnNumber || 1) - 1;
    const bh = stats.biggestHit;
    const biggestHitText = bh
      ? `${bh.damage} dmg on ${Render.escapeHtml(bh.targetName)} (${Render.escapeHtml(bh.moveName)})`
      : "None &mdash; no damage dealt";

    const triviaStat = stats.triviaTotal > 0
      ? `<div class="summary-row"><span class="summary-label">Trivia</span><span class="summary-value">${stats.triviaCorrect}&thinsp;/&thinsp;${stats.triviaTotal} correct</span></div>`
      : "";

    // Aggregate damage rows — present whenever the new field exists. Legacy
    // matchStats from saved sessions without these fields fall back to 0/0
    // (no row hidden, but the value will read "0 damage" honestly).
    const dealtBy = (stats.damageDealtBy && stats.damageDealtBy.length === 2) ? stats.damageDealtBy : [0, 0];
    const takenBy = (stats.damageTakenBy && stats.damageTakenBy.length === 2) ? stats.damageTakenBy : [0, 0];

    // Match duration row — formatted m:ss using endedAt when present.
    const durationText = _matchElapsedString(stats);

    const fact = _pickDidYouKnow(h0, h1, stats);
    const portrait = Render.renderHero({ heroId: fact.hero.id, pose: "idle", facing: "right" });

    // HP Timeline chart — only when we have >1 snapshot (need at least two
    // points to draw a line). Pre-v3 history entries don't carry snapshots,
    // so the chart is skipped silently and the recap still renders cleanly.
    const snapshots = (stats && stats.hpSnapshots) || [];
    const chartHtml = snapshots.length > 1
      ? `<div class="recap-chart-wrap"><h4 class="recap-chart-title">HP over time</h4>${renderHpChart(snapshots, { name0: h0.name, name1: h1.name }, { color0: "#1a2a4f", color1: "#c1462d" })}</div>`
      : "";

    return `
${chartHtml}
<div class="match-summary">
  <h3>Match Summary</h3>
  <div class="summary-grid">
    <div class="summary-row"><span class="summary-label">Lasted</span><span class="summary-value">${turns} turn${turns === 1 ? "" : "s"}</span></div>
    <div class="summary-row"><span class="summary-label">Match time</span><span class="summary-value">${durationText}</span></div>
    <div class="summary-row"><span class="summary-label">Biggest hit</span><span class="summary-value">${biggestHitText}</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h0.name)} dealt</span><span class="summary-value">${dealtBy[0]} damage</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h0.name)} took</span><span class="summary-value">${takenBy[0]} damage</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h1.name)} dealt</span><span class="summary-value">${dealtBy[1]} damage</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h1.name)} took</span><span class="summary-value">${takenBy[1]} damage</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h0.name)}'s specials</span><span class="summary-value">${stats.specialsUsed[0]}</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h1.name)}'s specials</span><span class="summary-value">${stats.specialsUsed[1]}</span></div>
    ${triviaStat}
  </div>
</div>
${recordsHtml || ""}
<div class="did-you-know">
  <h3>Did You Know?</h3>
  <div class="dyk-card">
    <div class="dyk-portrait">${portrait}</div>
    <div class="dyk-body">
      <p class="dyk-hero-name">${Render.escapeHtml(fact.hero.name)}</p>
      <p class="dyk-text">${Render.escapeHtml(fact.trivia.explanation)}</p>
    </div>
  </div>
</div>`;
  }

  function renderResult(state) {
    const match = state.match;
    const winnerIdx = match.winner;
    const winnerHero = Heroes.byId(match.players[winnerIdx].heroId);
    const loserHero  = Heroes.byId(match.players[1 - winnerIdx].heroId);
    // h0/h1 always reflect slot order (for specials count display)
    const h0 = Heroes.byId(match.players[0].heroId);
    const h1 = Heroes.byId(match.players[1].heroId);

    // Practice mode: stripped-down result screen. No recap, no Personal
    // Records, no Did You Know, no share button — nothing was recorded so
    // there's nothing to celebrate or compare against.
    if (state.mode === "practice") {
      return `
<section class="screen screen-result screen-result-practice">
  <h2>${Render.escapeHtml(winnerHero.name)} wins!</h2>
  <p class="tagline">${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}.</p>
  <p class="practice-note">Practice match &mdash; nothing was recorded.</p>
  <div class="result-buttons">
    <button data-action="rematch">Rematch (same heroes)</button>
    <button data-action="practice-pick-new" class="secondary">Different Matchup</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
    }

    if (state.mode === "arcade") {
      const playerHeroId = state.arcade.playerHeroId;
      const playerSlot = match.players.findIndex(p => p.heroId === playerHeroId);
      const playerWon = winnerIdx === playerSlot;
      if (!playerWon) {
        // Arcade loss — keep it simple, no recap
        return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} wins this round.</h2>
  <p class="tagline">Your run ends here. ${Render.escapeHtml(Heroes.byId(playerHeroId).name)} defeated ${state.arcade.defeated.length} of 6 opponents.</p>
  <div class="result-buttons">
    <button data-action="arcade-retry">Try Again</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
      }
      const remaining = state.arcade.remaining.length;
      if (remaining === 0) {
        return renderArcadeEnding(playerHeroId, state.arcade.firstClear);
      }
      const roadmap = renderArcadeRoadmap(state, "full");
      const arcadeRecordsHtml = _buildRecordsHtml(state);
      const recap = _renderRecapSections(match, state.matchStats, h0, h1, arcadeRecordsHtml);
      return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}!</h2>
  <p class="tagline">${remaining} opponent${remaining === 1 ? "" : "s"} left.</p>
  ${roadmap}
  ${recap}
  <div class="result-buttons">
    <button data-action="arcade-next">Next Opponent</button>
    <button data-action="share-arcade" class="share-btn">&#x1F4E8; Share this arcade run</button>
    <button data-action="download-result-card" class="share-btn">&#x1F4F8; Download Result Card</button>
    <button data-action="goto-title" class="secondary">Quit Run</button>
  </div>
</section>`;
    }

    if (state.mode === "daily") {
      const playerWon = winnerIdx === 0;
      const dailyRecordsHtml = playerWon ? _buildRecordsHtml(state) : "";
      const recap = _renderRecapSections(match, state.matchStats, h0, h1, dailyRecordsHtml);
      let dailyResultInfo = "";
      if (playerWon) {
        const ds = state.save && state.save.daily
          ? { currentStreak: state.save.daily.currentStreak, bestStreak: state.save.daily.bestStreak, lifetimeCompletions: state.save.daily.lifetimeCompletions }
          : { currentStreak: 0, bestStreak: 0, lifetimeCompletions: 0 };
        dailyResultInfo = `
<div class="daily-result-info">
  <p class="daily-result-cleared">&#x1F4C5; Daily Challenge cleared!</p>
  <div class="daily-stats-mini">
    <div>&#x1F525; Current streak: <strong>${ds.currentStreak}</strong> day${ds.currentStreak === 1 ? "" : "s"}</div>
    <div>&#x1F3C6; Best: <strong>${ds.bestStreak}</strong></div>
    <div>Total: <strong>${ds.lifetimeCompletions}</strong> challenges</div>
  </div>
</div>`;
      } else {
        dailyResultInfo = `<p class="daily-result-failed">Daily Challenge failed &mdash; try again tomorrow.</p>`;
      }
      return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} wins!</h2>
  <p class="tagline">${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}.</p>
  ${dailyResultInfo}
  ${recap}
  <div class="result-buttons">
    ${playerWon ? `<button data-action="share-daily" class="share-btn">&#x1F4E8; Share this challenge</button>` : ""}
    <button data-action="download-result-card" class="share-btn">&#x1F4F8; Download Result Card</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
    }

    if (state.mode === "spectator") {
      const recap = _renderRecapSections(match, state.matchStats, h0, h1, "");
      return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} wins!</h2>
  <p class="tagline">A Spectator battle has concluded.</p>
  ${recap}
  <div class="result-buttons">
    <button data-action="start-spectator">Watch Another</button>
    <button data-action="download-result-card" class="share-btn">&#x1F4F8; Download Result Card</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
    }

    const quickRecordsHtml = _buildRecordsHtml(state);
    const recap = _renderRecapSections(match, state.matchStats, h0, h1, quickRecordsHtml);
    return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} wins!</h2>
  <p class="tagline">${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}.</p>
  ${recap}
  <div class="result-buttons">
    <button data-action="rematch">Play Again</button>
    <button data-action="share-quick" class="share-btn">&#x1F4E8; Share this matchup</button>
    <button data-action="download-result-card" class="share-btn">&#x1F4F8; Download Result Card</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
  }

  function renderArcadeRoadmap(state, variant) {
    // Reconstruct full ladder order: defeated + current (remaining[0]) + rest of remaining
    const arcade = state.arcade;
    const fullOrder = arcade.defeated.concat(arcade.remaining);
    const currentOpponent = arcade.remaining[0] || null;

    const isCompact = variant === "compact";
    const cardW = isCompact ? 50 : 90;
    const cardH = isCompact ? 60 : 110;
    const gap = isCompact ? 4 : 8;

    const nodes = fullOrder.map((heroId, idx) => {
      const hero = Heroes.byId(heroId);
      const isBeaten = idx < arcade.defeated.length;
      const isCurrent = heroId === currentOpponent && !isBeaten;
      const isBoss = idx === 5; // last opponent (index 5 of 6)
      const isUpcoming = !isBeaten && !isCurrent;

      let nodeClass = "roadmap-node";
      if (isBeaten) nodeClass += " beaten";
      else if (isCurrent) nodeClass += " current";
      else nodeClass += " upcoming";
      if (isBoss) nodeClass += " boss";

      const checkmark = isBeaten ? `<div class="roadmap-check">&#10003;</div>` : "";
      const crown = (isBoss && !isCompact) ? `<span class="roadmap-crown">&#x1F451;</span>` : "";
      const bossIndicator = (isBoss && isCompact) ? `<div class="roadmap-boss-indicator">&#x1F451;</div>` : "";

      // Portrait using inline SVG scaled via CSS
      const portraitSvg = Render.renderHero({ heroId: hero.id, pose: "idle", facing: "right" });

      const nameLabel = isCompact ? "" : `<div class="roadmap-name">${Render.escapeHtml(hero.name)}</div>`;

      return `<div class="${nodeClass}" style="width:${cardW}px;height:${cardH}px;">
  <div class="roadmap-portrait">${portraitSvg}</div>
  ${nameLabel}
  ${checkmark}
  ${bossIndicator}
  ${crown}
</div>`;
    }).join("\n");

    const variantClass = isCompact ? "compact" : "full";
    return `<div class="arcade-roadmap ${variantClass}" style="--gap:${gap}px;">${nodes}</div>`;
  }

  // ── Boss-specific twist descriptions ─────────────────────────────────────
  const BOSS_TWIST_DESC = {
    moses:    "Moses begins with Pillar of Cloud already active",
    david:    "Sling Stone bonus activates at >30 HP (was >50) and deals +15 bonus (was +10)",
    esther:   "Reversal reflects at 2x damage instead of 1.5x",
    judah:    "Menorah Flame burn lasts 4 turns instead of 3",
    rambam:   "Healing Touch restores 30 HP instead of 20",
    golda:    "Diplomatic Shield counter is 10 instead of 5",
    einstein: "E=mc² charges in 1 turn instead of 2"
  };

  // ── Canonical hero rivalries / matchup flavor tags ──────────────────────
  // Brief thematic characterizations for specific hero pairings — NOT
  // historical claims. Surfaced as quiet flavor on the VS Intro and Hero
  // Compare screens. Symmetric: RIVALRIES[a][b] === RIVALRIES[b][a] via the
  // dual-lookup in _rivalryFor below. Pairs not listed return null (most
  // matchups don't need a tag — selectivity is the point).
  const RIVALRIES = {
    // Warriors of Israel — both literal military leaders
    "david|judah":     { tag: "Warriors of Israel",        icon: "⚔️" },
    // Royal women across millennia
    "esther|golda":    { tag: "Queens of their people",    icon: "\u{1F451}" },
    // Lawgiver vs Psalmist — the foundations of Jewish text
    "moses|david":     { tag: "Lawgiver meets Psalmist",   icon: "\u{1F4DC}" },
    // Two giants of Jewish thought — separated by 700 years
    "rambam|einstein": { tag: "Giants of Jewish thought",  icon: "\u{1F4AD}" },
    // Founders and defenders of the Jewish nation
    "moses|golda":     { tag: "Builders of the nation",    icon: "\u{1F3DB}️" },
    // Ancient law meets modern physics — bookends of Jewish wisdom
    "moses|einstein":  { tag: "Ancient and modern minds",  icon: "✨" },
    // Two defenders of Jewish sovereignty — millennia apart
    "judah|golda":     { tag: "Defenders of sovereignty",  icon: "\u{1F6E1}️" },
    // Royalty in exile — both navigated diaspora politics
    "esther|rambam":   { tag: "Wisdom in exile",           icon: "\u{1F319}" },
    // Both led their people in moments of existential threat
    "moses|judah":     { tag: "Liberators of Israel",      icon: "\u{1F525}" },
    // Two leaders of ancient Israelite royalty
    "david|esther":    { tag: "Royal lineage",             icon: "\u{1F451}" }
  };

  // Returns { tag, icon } | null for the matchup. Symmetric in argument order
  // (handles both "a|b" and "b|a" key orderings). Returns null for mirror
  // matches (heroA === heroB), invalid ids, and unlisted pairings.
  function _rivalryFor(heroIdA, heroIdB) {
    if (typeof heroIdA !== "string" || typeof heroIdB !== "string") return null;
    if (heroIdA === heroIdB) return null;  // mirror matches don't get rivalries
    const k1 = heroIdA + "|" + heroIdB;
    const k2 = heroIdB + "|" + heroIdA;
    return RIVALRIES[k1] || RIVALRIES[k2] || null;
  }

  // ── VS Intro screen ──────────────────────────────────────────────────────
  // Brief pre-battle fighter intro: hero portraits swoop in, big "VS" text,
  // stage name announced. Adds a beat of anticipation before each match.

  // Pure helper: derives a "matchup prediction" badge from save.matchups.
  // Returns { icon, text } for first-time, winning, losing, or even records.
  // Defensive on missing/zero data so callers can pass it freely.
  function _vsIntroMatchupSummary(matchups, playerHeroId, opponentHeroId) {
    const key = playerHeroId + "|" + opponentHeroId;
    const record = (matchups || {})[key];
    if (!record || ((record.wins || 0) === 0 && (record.losses || 0) === 0)) {
      return { icon: "✨", text: "First time meeting!" };
    }
    const w = record.wins || 0;
    const L = record.losses || 0;
    if (w > L)  return { icon: "\u{1F3C6}", text: `Your record: ${w}-${L}` };
    if (w < L)  return { icon: "\u{1F4AA}", text: `Tough matchup: ${w}-${L}` };
    return { icon: "⚔️", text: `Even match: ${w}-${L}` };
  }

  // Should the matchup-prediction badge appear in this VS intro?
  // Only when slot 0 is human and slot 1 is AI — the "you vs AI" case where
  // "your record" is unambiguous. Tournament is excluded because slot
  // ownership can be shared across multiple humans in 4-player brackets.
  function _shouldShowMatchupBadge(state) {
    if (!state || state.mode === "tournament") return false;
    const c = state.controllers;
    return !!(c && c[0] === "human" && c[1] === "ai");
  }

  function renderVsIntro(state) {
    const match = state.match;
    if (!match || !match.players || match.players.length < 2) return "";
    const p0HeroId = match.players[0].heroId;
    const p1HeroId = match.players[1].heroId;
    const h0 = Heroes.byId(p0HeroId);
    const h1 = Heroes.byId(p1HeroId);
    if (!h0 || !h1) return "";
    const stageId = match.stageId || h1.stageId || "";
    const stageName = stageNameOf(stageId);
    const stageBackdrop = stageId && Stages && typeof Stages.byId === "function"
      ? Stages.byId(stageId)
      : "";
    const portrait0 = Render.renderHero({ heroId: h0.id, pose: "idle", facing: "right" });
    const portrait1 = Render.renderHero({ heroId: h1.id, pose: "idle", facing: "left" });

    // Matchup prediction badge (only for "you vs AI" outside Tournament).
    let matchupBadge = "";
    if (_shouldShowMatchupBadge(state)) {
      const matchups = (state.save && state.save.matchups) || {};
      const summary = _vsIntroMatchupSummary(matchups, p0HeroId, p1HeroId);
      matchupBadge = `
  <div class="vs-intro-matchup-prediction">
    <span class="vs-intro-matchup-icon">${summary.icon}</span>
    <span class="vs-intro-matchup-text">${Render.escapeHtml(summary.text)}</span>
  </div>`;
    }

    // Rivalry flavor badge (canonical hero pairings only — most matchups
    // get nothing). Quiet thematic tag; shown on every mode/controller combo
    // since it's purely educational and ID-driven (not record-driven).
    let rivalryBadge = "";
    const rivalry = _rivalryFor(p0HeroId, p1HeroId);
    if (rivalry) {
      rivalryBadge = `
  <div class="vs-intro-rivalry">
    <span class="vs-intro-rivalry-icon">${rivalry.icon}</span>
    <span class="vs-intro-rivalry-tag">${Render.escapeHtml(rivalry.tag)}</span>
  </div>`;
    }

    return `
<section class="screen screen-vs-intro" data-action="vs-skip" data-stage="${Render.escapeHtml(stageId)}">
  <div class="vs-intro-bg" data-stage="${Render.escapeHtml(stageId)}">${stageBackdrop}</div>
  <div class="vs-intro-stage-name">&#x1F4CD; ${Render.escapeHtml(stageName)}</div>${rivalryBadge}${matchupBadge}
  <div class="vs-intro-fighters">
    <div class="vs-intro-fighter left">
      <div class="vs-intro-portrait left">${portrait0}</div>
      <div class="vs-intro-name left">${Render.escapeHtml(h0.name)}</div>
      <div class="vs-intro-era left">${Render.escapeHtml(h0.era)}</div>
    </div>
    <div class="vs-intro-vs">VS</div>
    <div class="vs-intro-fighter right">
      <div class="vs-intro-portrait right">${portrait1}</div>
      <div class="vs-intro-name right">${Render.escapeHtml(h1.name)}</div>
      <div class="vs-intro-era right">${Render.escapeHtml(h1.era)}</div>
    </div>
  </div>
  <p class="vs-intro-skip-hint">Click anywhere to start &rarr;</p>
</section>`;
  }

  // ── Match-End VICTORY / DEFEAT splash ─────────────────────────────────────
  // Symmetric bookend to the VS Intro: brief celebratory beat after every
  // match before the result screen renders. Auto-advances on a timer (driven
  // by animSpeed) and click-anywhere skips. Per-mode skip rules live in
  // main.js — this renderer just paints what it's told to.
  //
  // Title text varies by who's playing:
  //   human-vs-AI: "VICTORY!" or "DEFEAT!" from the human's perspective
  //   human-vs-human couch: neutral "PLAYER 1 WINS!" / "PLAYER 2 WINS!"
  //   spectator (ai-vs-ai): neutral "<Hero> WINS!"
  //   tournament: neutral "<Hero> WINS THIS ROUND!"
  function _matchEndSplashTitleInfo(state, match, winnerSlot, winnerHero) {
    const controllers = state && state.controllers;
    const mode = state && state.mode;
    if (mode === "tournament") {
      return {
        className: "neutral",
        text: `${winnerHero.name.toUpperCase()} WINS THIS ROUND!`
      };
    }
    if (controllers && controllers[0] === "ai" && controllers[1] === "ai") {
      return {
        className: "neutral",
        text: `${winnerHero.name.toUpperCase()} WINS!`
      };
    }
    if (controllers && controllers[0] === "human" && controllers[1] === "human") {
      return {
        className: "neutral",
        text: winnerSlot === 0 ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!"
      };
    }
    // Default: human (slot 0) vs AI (slot 1). VICTORY if human won.
    if (controllers && controllers[0] === "human" && controllers[1] === "ai") {
      return winnerSlot === 0
        ? { className: "victory", text: "VICTORY!" }
        : { className: "defeat",  text: "DEFEAT!" };
    }
    // Fallback (e.g., AI vs human, or controllers missing): neutral winner.
    return {
      className: "neutral",
      text: `${winnerHero.name.toUpperCase()} WINS!`
    };
  }

  // Flavor line — kept brief (one line). Tone matches the title category.
  function _matchEndSplashFlavor(titleClass, winnerHero) {
    if (titleClass === "victory") return "A triumph for the ages!";
    if (titleClass === "defeat")  return `${winnerHero.name} proves their might.`;
    return `${winnerHero.name} takes the round.`;
  }

  function renderMatchEndSplash(state) {
    const match = state && state.match;
    if (!match || !match.players || match.players.length < 2) return "";
    if (match.winner !== 0 && match.winner !== 1) return "";

    const winnerSlot = match.winner;
    const winnerHero = Heroes.byId(match.players[winnerSlot].heroId);
    if (!winnerHero) return "";

    const stageId = match.stageId || winnerHero.stageId || "";
    const stageBackdrop = stageId && Stages && typeof Stages.byId === "function"
      ? Stages.byId(stageId)
      : "";
    const portrait = Render.renderHero({ heroId: winnerHero.id, pose: "idle", facing: "right" });
    const titleInfo = _matchEndSplashTitleInfo(state, match, winnerSlot, winnerHero);
    const flavor = _matchEndSplashFlavor(titleInfo.className, winnerHero);

    return `
<section class="screen screen-match-end-splash" data-action="match-end-skip">
  <div class="match-end-splash-bg" data-stage="${Render.escapeHtml(stageId)}">${stageBackdrop}</div>
  <div class="match-end-splash-content">
    <div class="match-end-splash-winner-portrait">${portrait}</div>
    <h1 class="match-end-splash-title ${titleInfo.className}">${Render.escapeHtml(titleInfo.text)}</h1>
    <p class="match-end-splash-name">${Render.escapeHtml(winnerHero.name)}</p>
    <p class="match-end-splash-flavor">${Render.escapeHtml(flavor)}</p>
  </div>
  <p class="match-end-splash-skip-hint">Click anywhere to continue &rarr;</p>
</section>`;
  }

  function renderBossIntro(state) {
    const heroId = state.arcade && state.arcade.remaining[0];
    if (!heroId) return "";
    const hero = Heroes.byId(heroId);
    if (!hero) return "";
    const twistDesc = BOSS_TWIST_DESC[heroId] || "A dangerous unique power";
    const portrait = Render.renderHero({ heroId: hero.id, pose: "attack", facing: "right" });
    return `
<section class="screen screen-boss-intro">
  <div class="boss-intro-header">FINAL OPPONENT</div>
  <div class="boss-intro-portrait">${portrait}</div>
  <h2 class="boss-intro-name">${Render.escapeHtml(hero.name)}</h2>
  <p class="boss-intro-flavor">Defeat them to complete the Arcade Ladder!</p>
  <ul class="boss-buffs">
    <li>+25% HP</li>
    <li>+20% damage</li>
    <li>${Render.escapeHtml(twistDesc)}</li>
  </ul>
  <div class="result-buttons">
    <button data-action="start-boss-battle" class="boss-begin-btn">Begin Battle</button>
    <button data-action="goto-title" class="secondary">Forfeit run</button>
  </div>
</section>`;
  }

  function renderDifficultySelect(state) {
    return `
<section class="screen screen-mode">
  <h2>Choose difficulty</h2>
  <div class="mode-grid">
    <button data-action="set-difficulty" data-difficulty="normal" class="mode-card">
      <h3>Normal</h3>
      <p>Standard AI. A fair challenge for all heroes.</p>
    </button>
    <button data-action="set-difficulty" data-difficulty="hard" class="mode-card hard-mode-card">
      <h3>Hard</h3>
      <p>Tougher AI and +25% opponent damage. Prove your mastery.</p>
    </button>
  </div>
  <button data-action="goto-mode" class="back">&larr; Back</button>
</section>`;
  }

  function renderArcadeEnding(heroId, isFirstClear) {
    const hero = Heroes.byId(heroId);
    const ending = ARCADE_ENDINGS[heroId] || "Victory.";
    const unlockBanner = isFirstClear
      ? `<div class="unlock-celebration">&#x1F389; HARD MODE UNLOCKED! Tougher AI awaits.</div>`
      : "";
    return `
<section class="screen screen-result screen-ending">
  <h2>${Render.escapeHtml(hero.name)} prevails!</h2>
  <p class="ending">${Render.escapeHtml(ending)}</p>
  <p class="tagline">Arcade Ladder complete.</p>
  ${unlockBanner}
  <div class="result-buttons">
    <button data-action="goto-title">Main Menu</button>
  </div>
</section>`;
  }

  function animateAction(playerIdx, kind) {
    if (typeof document === "undefined") return;
    const fighter = document.querySelector(playerIdx === 0 ? ".fighter-left" : ".fighter-right");
    if (!fighter) return;
    fighter.classList.remove("act-attack", "act-defend", "act-special", "act-hit");
    void fighter.offsetWidth; // force reflow to restart animation
    fighter.classList.add(`act-${kind}`);
    const duration = kind === "special" ? 700 : kind === "defend" ? 600 : 430;
    window.setTimeout(() => fighter.classList.remove(`act-${kind}`), duration);
  }

  // Apply a hit-shake class to the fighter who took damage
  function flashHit(playerIdx) {
    if (typeof document === "undefined") return;
    const fighter = document.querySelector(playerIdx === 0 ? ".fighter-left" : ".fighter-right");
    if (!fighter) return;
    fighter.classList.remove("act-hit");
    void fighter.offsetWidth;
    fighter.classList.add("act-hit");
    window.setTimeout(() => fighter.classList.remove("act-hit"), 400);
  }

  // Show a floating damage/heal number over the target fighter
  function showDamageNumber(playerIdx, amount, kind) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;
    // Position: left fighter center ~15%, right fighter center ~85%
    const xPct = playerIdx === 0 ? 15 : 85;
    const el = document.createElement("div");
    el.className = "damage-number";
    el.style.left = `${xPct}%`;
    el.style.top = "30%";
    if (kind === "heal") {
      el.style.color = "#44cc44";
      el.textContent = `+${amount}`;
    } else {
      // Color by magnitude
      el.style.color = amount <= 10 ? "#ffffff" : amount <= 25 ? "#ff9900" : "#ff2222";
      el.textContent = `-${amount}`;
    }
    arena.appendChild(el);
    window.setTimeout(() => { if (el.isConnected) el.remove(); }, 950);
  }

  // Per-hero attack FX — dispatches by attacker hero id
  function playAttackFx(targetIdx, attackerHeroId) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;
    const svgNS = "http://www.w3.org/2000/svg";

    // targetIdx is the defender's player index (0=left, 1=right)
    // attacker is on the opposite side
    const targetIsLeft = targetIdx === 0;
    const attackerIsLeft = !targetIsLeft;

    switch (attackerHeroId) {

      /* ── MOSES — Staff Strike ───────────────────────────────────
         A tall brown staff appears on Moses' side, arcs down across to the
         target. Ends with an impact starburst on the target.              */
      case "moses": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        // Staff on Moses' side
        const staffLeft = attackerIsLeft ? "4%" : "auto";
        const staffRight = attackerIsLeft ? "auto" : "4%";
        const staff = document.createElement("div");
        staff.setAttribute("aria-hidden", "true");
        staff.style.cssText = `position:absolute;top:5%;left:${staffLeft};right:${staffRight};width:12%;height:85%;animation:moses-staff-swing-${attackerIsLeft ? "left" : "right"} 700ms ease-in-out forwards;transform-origin:${attackerIsLeft ? "top left" : "top right"};`;
        staff.innerHTML = `<svg viewBox="0 0 40 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- staff shaft -->
          <rect x="17" y="0" width="9" height="185" rx="4" fill="#7a4a1a" stroke="#3a2008" stroke-width="2"/>
          <!-- wood grain -->
          <line x1="19" y1="20" x2="19" y2="165" stroke="#9a6030" stroke-width="1.5" opacity="0.5"/>
          <!-- top knob -->
          <ellipse cx="21" cy="8" rx="10" ry="7" fill="#9a5a20" stroke="#3a2008" stroke-width="2"/>
        </svg>`;
        el.appendChild(staff);

        // Impact starburst on target
        const impX = targetIsLeft ? "4%" : "74%";
        const imp = document.createElement("div");
        imp.setAttribute("aria-hidden", "true");
        imp.style.cssText = `position:absolute;top:15%;left:${impX};width:20%;height:65%;opacity:0;animation:moses-staff-impact 280ms 540ms ease-out forwards;`;
        imp.innerHTML = `<svg viewBox="0 0 80 160" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <line x1="40" y1="80" x2="40" y2="12" stroke="#7a4a1a" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
          <line x1="40" y1="80" x2="72" y2="40" stroke="#7a4a1a" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
          <line x1="40" y1="80" x2="76" y2="80" stroke="#7a4a1a" stroke-width="4" stroke-linecap="round" opacity="0.75"/>
          <line x1="40" y1="80" x2="68" y2="120" stroke="#9a6030" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
          <line x1="40" y1="80" x2="40" y2="148" stroke="#9a6030" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
          <line x1="40" y1="80" x2="12" y2="120" stroke="#9a6030" stroke-width="3.5" stroke-linecap="round" opacity="0.7"/>
          <line x1="40" y1="80" x2="4"  y2="80" stroke="#7a4a1a" stroke-width="4" stroke-linecap="round" opacity="0.75"/>
          <line x1="40" y1="80" x2="8"  y2="40" stroke="#7a4a1a" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
          <circle cx="40" cy="80" r="14" fill="#c1462d" opacity="0.35"/>
        </svg>`;
        el.appendChild(imp);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 850);
        return;
      }

      /* ── DAVID — Shepherd's Sling ───────────────────────────────
         Tiny twirl wind-up (200ms), then a dark stone arcs across in a low
         trajectory to the target. Smaller/faster than the special.        */
      case "david": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        // Wind-up twirl (small sling circle near David's hand)
        const twX = attackerIsLeft ? "14%" : "auto";
        const twRight = attackerIsLeft ? "auto" : "14%";
        const twirl = document.createElement("div");
        twirl.setAttribute("aria-hidden", "true");
        twirl.style.cssText = `position:absolute;top:40%;left:${twX};right:${twRight};width:36px;height:36px;animation:attack-david-twirl 200ms linear forwards;`;
        twirl.innerHTML = `<svg viewBox="0 0 36 36" width="36" height="36" xmlns="${svgNS}">
          <circle cx="28" cy="18" r="5" fill="#2a1a0a" stroke="#555" stroke-width="1.5"/>
          <line x1="18" y1="18" x2="28" y2="18" stroke="#6b4c2a" stroke-width="1.5" opacity="0.8"/>
        </svg>`;
        el.appendChild(twirl);

        // Stone projectile (smaller than special, appears at 200ms)
        const stoneLeft = attackerIsLeft ? "17%" : "auto";
        const stoneRight = attackerIsLeft ? "auto" : "17%";
        const stone = document.createElement("div");
        stone.setAttribute("aria-hidden", "true");
        stone.style.cssText = `
          position:absolute;top:42%;left:${stoneLeft};right:${stoneRight};
          width:14px;height:14px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%,#555,#1a1005);
          border:1.5px solid #777;
          opacity:0;animation:attack-david-stone-${attackerIsLeft ? "left" : "right"} 480ms 200ms ease-in forwards;
        `;
        el.appendChild(stone);

        // Small impact puff
        const impX2 = targetIsLeft ? "6%" : "76%";
        const imp2 = document.createElement("div");
        imp2.setAttribute("aria-hidden", "true");
        imp2.style.cssText = `position:absolute;top:28%;left:${impX2};width:16%;height:50%;opacity:0;animation:attack-david-impact 250ms 660ms ease-out forwards;`;
        imp2.innerHTML = `<svg viewBox="0 0 60 100" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <line x1="30" y1="50" x2="30" y2="10" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
          <line x1="30" y1="50" x2="54" y2="22" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
          <line x1="30" y1="50" x2="58" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
          <line x1="30" y1="50" x2="50" y2="78" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
          <line x1="30" y1="50" x2="30" y2="90" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
          <line x1="30" y1="50" x2="10" y2="78" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
          <line x1="30" y1="50" x2="2"  y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
          <line x1="30" y1="50" x2="6"  y2="22" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
          <ellipse cx="30" cy="82" rx="18" ry="7" fill="#b8a070" opacity="0.35"/>
        </svg>`;
        el.appendChild(imp2);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 950);
        return;
      }

      /* ── ESTHER — Royal Decree ──────────────────────────────────
         A gold scroll unfurls in front of Esther, then a thick gold
         shockwave ring expands outward and hits the target.              */
      case "esther": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        // Gold scroll on Esther's side
        const scrLeft = attackerIsLeft ? "3%" : "auto";
        const scrRight = attackerIsLeft ? "auto" : "3%";
        const scroll = document.createElement("div");
        scroll.setAttribute("aria-hidden", "true");
        scroll.style.cssText = `position:absolute;top:12%;left:${scrLeft};right:${scrRight};width:18%;height:70%;animation:esther-decree-scroll 350ms ease-out forwards;`;
        scroll.innerHTML = `<svg viewBox="0 0 60 160" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- scroll body -->
          <rect x="8" y="20" width="44" height="120" rx="5" fill="${colors.cream}" stroke="${colors.gold}" stroke-width="3"/>
          <!-- top roll -->
          <ellipse cx="30" cy="20" rx="22" ry="8" fill="#e8d8a0" stroke="${colors.gold}" stroke-width="2.5"/>
          <!-- bottom roll -->
          <ellipse cx="30" cy="140" rx="22" ry="8" fill="#e8d8a0" stroke="${colors.gold}" stroke-width="2.5"/>
          <!-- text lines -->
          <rect x="14" y="40" width="28" height="3" rx="1" fill="${colors.navy}" opacity="0.6"/>
          <rect x="14" y="50" width="22" height="3" rx="1" fill="${colors.navy}" opacity="0.5"/>
          <rect x="14" y="60" width="26" height="3" rx="1" fill="${colors.navy}" opacity="0.5"/>
          <!-- "!" sigil -->
          <rect x="27" y="75" width="6" height="24" rx="2" fill="${colors.gold}" stroke="#7a5210" stroke-width="1"/>
          <circle cx="30" cy="107" r="4" fill="${colors.gold}" stroke="#7a5210" stroke-width="1"/>
        </svg>`;
        el.appendChild(scroll);

        // Gold shockwave ring expanding toward target (starts at 350ms)
        const waveLeft = attackerIsLeft ? "20%" : "auto";
        const waveRight = attackerIsLeft ? "auto" : "20%";
        const wave = document.createElement("div");
        wave.setAttribute("aria-hidden", "true");
        wave.style.cssText = `position:absolute;top:15%;left:${waveLeft};right:${waveRight};width:60%;height:70%;opacity:0;animation:esther-decree-wave-${attackerIsLeft ? "left" : "right"} 380ms 350ms ease-out forwards;`;
        wave.innerHTML = `<svg viewBox="0 0 300 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <ellipse cx="150" cy="100" rx="140" ry="88" fill="none" stroke="${colors.gold}" stroke-width="10" opacity="0.85"/>
          <ellipse cx="150" cy="100" rx="120" ry="72" fill="none" stroke="#ffe080" stroke-width="5" opacity="0.6"/>
        </svg>`;
        el.appendChild(wave);

        // Gold flash on target (at 700ms)
        const flashX = targetIsLeft ? "2%" : "74%";
        const flash = document.createElement("div");
        flash.setAttribute("aria-hidden", "true");
        flash.style.cssText = `position:absolute;top:5%;left:${flashX};width:22%;height:88%;opacity:0;animation:esther-decree-flash 250ms 700ms ease-out forwards;`;
        flash.innerHTML = `<svg viewBox="0 0 80 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <radialGradient id="edfG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#ffe060;stop-opacity:0.9"/>
              <stop offset="60%" style="stop-color:${colors.gold};stop-opacity:0.5"/>
              <stop offset="100%" style="stop-color:${colors.gold};stop-opacity:0"/>
            </radialGradient>
          </defs>
          <ellipse cx="40" cy="100" rx="38" ry="95" fill="url(#edfG)"/>
        </svg>`;
        el.appendChild(flash);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1000);
        return;
      }

      /* ── JUDAH — Spear Thrust ───────────────────────────────────
         A metal-tipped wooden spear thrusts rapidly from Judah toward the
         target (~250ms), then retracts (~200ms). Impact sparks.          */
      case "judah": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        // Spear shaft + tip
        const spearLeft = attackerIsLeft ? "0%" : "auto";
        const spearRight = attackerIsLeft ? "auto" : "0%";
        const spear = document.createElement("div");
        spear.setAttribute("aria-hidden", "true");
        spear.style.cssText = `position:absolute;top:30%;left:${spearLeft};right:${spearRight};width:70%;height:30%;animation:judah-spear-thrust-${attackerIsLeft ? "left" : "right"} 450ms ease-in-out forwards;transform-origin:${attackerIsLeft ? "left" : "right"} center;`;
        spear.innerHTML = `<svg viewBox="0 0 300 80" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- shaft -->
          <rect x="30" y="34" width="240" height="12" rx="5" fill="#8a5a20" stroke="#3a2008" stroke-width="2"/>
          <!-- tip (point) -->
          <polygon points="${attackerIsLeft ? "280,28 300,40 280,52" : "20,28 0,40 20,52"}" fill="#c0c0c0" stroke="#666" stroke-width="2"/>
          <!-- shoulder guard -->
          <rect x="${attackerIsLeft ? "255" : "15"}" y="26" width="16" height="28" rx="2" fill="#888" stroke="#444" stroke-width="1.5"/>
          <!-- wood grain -->
          <line x1="30" y1="39" x2="270" y2="39" stroke="#b07840" stroke-width="1" opacity="0.5"/>
        </svg>`;
        el.appendChild(spear);

        // Impact sparks at target (at 250ms)
        const sparkX = targetIsLeft ? "2%" : "72%";
        const sparks = document.createElement("div");
        sparks.setAttribute("aria-hidden", "true");
        sparks.style.cssText = `position:absolute;top:20%;left:${sparkX};width:22%;height:55%;opacity:0;animation:judah-spear-sparks 300ms 250ms ease-out forwards;`;
        sparks.innerHTML = `<svg viewBox="0 0 80 120" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <line x1="40" y1="60" x2="40" y2="8"  stroke="#c0c0c0" stroke-width="3" stroke-linecap="round"/>
          <line x1="40" y1="60" x2="68" y2="25" stroke="#c0c0c0" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="40" y1="60" x2="75" y2="60" stroke="#888" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="40" y1="60" x2="62" y2="95" stroke="#888" stroke-width="2" stroke-linecap="round"/>
          <line x1="40" y1="60" x2="15" y2="95" stroke="#888" stroke-width="2" stroke-linecap="round"/>
          <line x1="40" y1="60" x2="5"  y2="60" stroke="#c0c0c0" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="40" y1="60" x2="12" y2="25" stroke="#c0c0c0" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="40" cy="60" r="8" fill="#ffee80" opacity="0.5"/>
        </svg>`;
        el.appendChild(sparks);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 750);
        return;
      }

      /* ── RAMBAM — Wisdom Bolt ───────────────────────────────────
         A glowing gold shin/glyph (ש) appears between the heroes, then
         shoots toward the target as a gold bolt. Impact: gold ripple ring.*/
      case "rambam": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        // Gold glyph in the center
        const glyph = document.createElement("div");
        glyph.setAttribute("aria-hidden", "true");
        glyph.style.cssText = `position:absolute;top:20%;left:35%;width:30%;height:60%;animation:rambam-glyph 280ms ease-out forwards;`;
        glyph.innerHTML = `<svg viewBox="0 0 80 120" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <filter id="rwGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          <!-- stylised shin (ש): three vertical strokes with shared base -->
          <rect x="10" y="20" width="8" height="50" rx="3" fill="${colors.gold}" filter="url(#rwGlow)" opacity="0.95"/>
          <rect x="36" y="10" width="8" height="60" rx="3" fill="${colors.gold}" filter="url(#rwGlow)" opacity="0.95"/>
          <rect x="62" y="20" width="8" height="50" rx="3" fill="${colors.gold}" filter="url(#rwGlow)" opacity="0.95"/>
          <!-- shared base bar -->
          <rect x="8" y="68" width="64" height="8" rx="3" fill="${colors.gold}" opacity="0.9"/>
          <!-- glow halo -->
          <ellipse cx="40" cy="50" rx="36" ry="48" fill="none" stroke="#ffe060" stroke-width="4" opacity="0.5"/>
        </svg>`;
        el.appendChild(glyph);

        // Gold bolt projectile (appears at 280ms, flies to target)
        const boltLeft = attackerIsLeft ? "32%" : "auto";
        const boltRight = attackerIsLeft ? "auto" : "32%";
        const bolt = document.createElement("div");
        bolt.setAttribute("aria-hidden", "true");
        bolt.style.cssText = `position:absolute;top:30%;left:${boltLeft};right:${boltRight};width:36%;height:40%;opacity:0;animation:rambam-bolt-${attackerIsLeft ? "left" : "right"} 300ms 280ms ease-in forwards;`;
        bolt.innerHTML = `<svg viewBox="0 0 160 80" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="rboltG" x1="${attackerIsLeft ? "0%" : "100%"}" y1="0%" x2="${attackerIsLeft ? "100%" : "0%"}" y2="0%">
              <stop offset="0%" style="stop-color:#ffe060;stop-opacity:1"/>
              <stop offset="60%" style="stop-color:${colors.gold};stop-opacity:0.9"/>
              <stop offset="100%" style="stop-color:${colors.gold};stop-opacity:0.2"/>
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="40" rx="78" ry="24" fill="url(#rboltG)" opacity="0.9"/>
          <ellipse cx="80" cy="40" rx="50" ry="12" fill="#ffe880" opacity="0.7"/>
        </svg>`;
        el.appendChild(bolt);

        // Gold ripple ring impact at target (at 560ms)
        const ripX = targetIsLeft ? "1%" : "72%";
        const rip = document.createElement("div");
        rip.setAttribute("aria-hidden", "true");
        rip.style.cssText = `position:absolute;top:10%;left:${ripX};width:25%;height:80%;opacity:0;animation:rambam-ripple 280ms 560ms ease-out forwards;`;
        rip.innerHTML = `<svg viewBox="0 0 100 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <ellipse cx="50" cy="100" rx="46" ry="92" fill="none" stroke="${colors.gold}" stroke-width="8" opacity="0.85"/>
          <ellipse cx="50" cy="100" rx="34" ry="68" fill="none" stroke="#ffe060" stroke-width="5" opacity="0.6"/>
          <ellipse cx="50" cy="100" rx="20" ry="40" fill="none" stroke="#fff8c0" stroke-width="3" opacity="0.4"/>
        </svg>`;
        el.appendChild(rip);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 900);
        return;
      }

      /* ── GOLDA — Iron Word ──────────────────────────────────────
         Bold "WORD!" in dark navy slams toward target with a gray kinetic
         shockwave ring expanding on impact.                               */
      case "golda": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        // "WORD!" text block appears then flies toward target
        const wordLeft = attackerIsLeft ? "8%" : "auto";
        const wordRight = attackerIsLeft ? "auto" : "8%";
        const word = document.createElement("div");
        word.setAttribute("aria-hidden", "true");
        word.textContent = "WORD!";
        word.style.cssText = `
          position:absolute;top:25%;left:${wordLeft};right:${wordRight};
          font-family:Georgia,serif;font-size:38px;font-weight:900;letter-spacing:-1px;
          color:${colors.navy};text-shadow:2px 2px 0 #000,-1px -1px 0 #888,0 0 8px rgba(26,42,79,0.5);
          white-space:nowrap;opacity:0;
          animation:golda-word-slam-${attackerIsLeft ? "left" : "right"} 650ms ease-in forwards;
        `;
        el.appendChild(word);

        // Gray kinetic shockwave at target (at 580ms)
        const swX = targetIsLeft ? "1%" : "72%";
        const sw = document.createElement("div");
        sw.setAttribute("aria-hidden", "true");
        sw.style.cssText = `position:absolute;top:8%;left:${swX};width:24%;height:84%;opacity:0;animation:golda-shockwave 250ms 580ms ease-out forwards;`;
        sw.innerHTML = `<svg viewBox="0 0 90 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <ellipse cx="45" cy="100" rx="42" ry="95" fill="none" stroke="#888" stroke-width="10" opacity="0.75"/>
          <ellipse cx="45" cy="100" rx="30" ry="68" fill="none" stroke="#bbb" stroke-width="5" opacity="0.5"/>
        </svg>`;
        el.appendChild(sw);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 900);
        return;
      }

      /* ── EINSTEIN — Equation Spark ──────────────────────────────
         A jagged blue-white lightning bolt zigzags from Einstein to the
         target. A small "Δ" trails behind. Shorter/less wide than special.*/
      case "einstein": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        // Lightning bolt path across the arena
        const boltFromLeft = attackerIsLeft ? "22%" : "0";
        const boltFromRight = attackerIsLeft ? "0" : "22%";
        const bolt = document.createElement("div");
        bolt.setAttribute("aria-hidden", "true");
        bolt.style.cssText = `
          position:absolute;top:28%;
          left:${attackerIsLeft ? "22%" : "0"};right:${attackerIsLeft ? "0" : "22%"};
          height:40%;opacity:0;
          animation:einstein-spark-bolt 550ms ease-out forwards;
          transform-origin:${attackerIsLeft ? "left" : "right"} center;
        `;
        bolt.innerHTML = `<svg viewBox="0 0 500 120" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="esparkG" x1="${attackerIsLeft ? "0%" : "100%"}" y1="0%" x2="${attackerIsLeft ? "100%" : "0%"}" y2="0%">
              <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
              <stop offset="40%" style="stop-color:#80c8ff;stop-opacity:0.95"/>
              <stop offset="100%" style="stop-color:#2266cc;stop-opacity:0.3"/>
            </linearGradient>
          </defs>
          <!-- zigzag bolt -->
          <polyline points="${attackerIsLeft
            ? "0,60 80,20 140,80 220,10 300,75 380,30 460,65 500,55"
            : "500,60 420,20 360,80 280,10 200,75 120,30 40,65 0,55"
          }" fill="none" stroke="url(#esparkG)" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
          <!-- bright core -->
          <polyline points="${attackerIsLeft
            ? "0,60 80,20 140,80 220,10 300,75 380,30 460,65 500,55"
            : "500,60 420,20 360,80 280,10 200,75 120,30 40,65 0,55"
          }" fill="none" stroke="white" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>
        </svg>`;
        el.appendChild(bolt);

        // Trailing "Δ" symbol near the attacker
        const deltaLeft = attackerIsLeft ? "24%" : "auto";
        const deltaRight = attackerIsLeft ? "auto" : "24%";
        const delta = document.createElement("div");
        delta.setAttribute("aria-hidden", "true");
        delta.textContent = "Δ";
        delta.style.cssText = `
          position:absolute;top:18%;left:${deltaLeft};right:${deltaRight};
          font-family:Georgia,serif;font-size:28px;font-weight:700;
          color:#80c8ff;text-shadow:0 0 10px rgba(100,180,255,0.9);
          opacity:0;animation:einstein-spark-delta 550ms ease-out forwards;
        `;
        el.appendChild(delta);

        // Spark flash at target (at 450ms)
        const sfX = targetIsLeft ? "1%" : "72%";
        const sparkFlash = document.createElement("div");
        sparkFlash.setAttribute("aria-hidden", "true");
        sparkFlash.style.cssText = `position:absolute;top:10%;left:${sfX};width:24%;height:80%;opacity:0;animation:einstein-spark-impact 250ms 450ms ease-out forwards;`;
        sparkFlash.innerHTML = `<svg viewBox="0 0 90 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <radialGradient id="espkiG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9"/>
              <stop offset="40%" style="stop-color:#80c8ff;stop-opacity:0.7"/>
              <stop offset="100%" style="stop-color:#2266cc;stop-opacity:0"/>
            </radialGradient>
          </defs>
          <ellipse cx="45" cy="100" rx="42" ry="94" fill="url(#espkiG)"/>
        </svg>`;
        el.appendChild(sparkFlash);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 750);
        return;
      }

      default: {
        // Generic fallback: original curved white→red arc slash
        const xPct = targetIdx === 0 ? 6 : 72;
        const el = document.createElement("div");
        el.className = "attack-fx";
        el.style.left = `${xPct}%`;
        el.style.top = "10%";
        el.style.width = "22%";
        el.style.height = "70%";
        el.innerHTML = `<svg viewBox="0 0 80 160" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="slashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95"/>
              <stop offset="60%" style="stop-color:#ffffff;stop-opacity:0.8"/>
              <stop offset="100%" style="stop-color:#cc2200;stop-opacity:0.6"/>
            </linearGradient>
          </defs>
          <path d="M10,15 Q55,60 65,145" fill="none" stroke="url(#slashGrad)" stroke-width="9" stroke-linecap="round"/>
          <path d="M20,10 Q60,55 70,140" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
          <path d="M5,25 Q45,65 55,155" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
        </svg>`;
        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 360);
        return;
      }
    }
  }

  // Per-hero defend FX — dispatches by defender hero id
  function playDefendFx(playerIdx, defenderHeroId) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;
    const svgNS = "http://www.w3.org/2000/svg";
    const isLeft = playerIdx === 0;

    switch (defenderHeroId) {

      /* ── MOSES — Pillar of Cloud ────────────────────────────────
         3–5 overlapping white ellipses puff in around Moses, grow then
         settle with a subtle drift. Soft outline.                         */
      case "moses": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        const cLeft = isLeft ? "0%" : "auto";
        const cRight = isLeft ? "auto" : "0%";
        const cloud = document.createElement("div");
        cloud.setAttribute("aria-hidden", "true");
        cloud.style.cssText = `position:absolute;top:2%;left:${cLeft};right:${cRight};width:30%;height:90%;animation:moses-cloud 1200ms ease-out forwards;`;
        cloud.innerHTML = `<svg viewBox="0 0 110 280" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- overlapping cloud puffs -->
          <ellipse cx="55" cy="140" rx="50" ry="70" fill="white" stroke="#ddd" stroke-width="2" opacity="0.88"/>
          <ellipse cx="30" cy="100" rx="38" ry="55" fill="white" stroke="#ddd" stroke-width="2" opacity="0.82"/>
          <ellipse cx="80" cy="100" rx="36" ry="52" fill="white" stroke="#ddd" stroke-width="2" opacity="0.82"/>
          <ellipse cx="55" cy="65"  rx="30" ry="42" fill="white" stroke="#ddd" stroke-width="2" opacity="0.78"/>
          <ellipse cx="30" cy="170" rx="28" ry="40" fill="white" stroke="#ddd" stroke-width="1.5" opacity="0.7"/>
          <ellipse cx="80" cy="170" rx="26" ry="38" fill="white" stroke="#ddd" stroke-width="1.5" opacity="0.7"/>
          <!-- soft inner glow -->
          <ellipse cx="55" cy="120" rx="36" ry="52" fill="white" opacity="0.3"/>
        </svg>`;
        el.appendChild(cloud);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      /* ── DAVID — Lion's Cloak ───────────────────────────────────
         A tawny-gold cloak/fur wraps in from one side (~300ms wrap) then
         settles. Triangular fur tufts along the bottom.                   */
      case "david": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        const clkLeft = isLeft ? "0%" : "auto";
        const clkRight = isLeft ? "auto" : "0%";
        const cloak = document.createElement("div");
        cloak.setAttribute("aria-hidden", "true");
        cloak.style.cssText = `position:absolute;top:5%;left:${clkLeft};right:${clkRight};width:28%;height:88%;animation:david-cloak-wrap-${isLeft ? "left" : "right"} 1200ms ease-out forwards;transform-origin:${isLeft ? "right" : "left"} center;`;
        cloak.innerHTML = `<svg viewBox="0 0 100 260" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="dcG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#c8922a;stop-opacity:0.9"/>
              <stop offset="60%" style="stop-color:#a07010;stop-opacity:0.85"/>
              <stop offset="100%" style="stop-color:#785008;stop-opacity:0.7"/>
            </linearGradient>
          </defs>
          <!-- main cloak body -->
          <path d="M20,0 L80,0 Q90,60 85,140 Q80,200 70,240 L50,255 L30,240 Q20,200 15,140 Q10,60 20,0Z" fill="url(#dcG)" stroke="#5a3a05" stroke-width="2.5"/>
          <!-- shoulder drape left -->
          <path d="M20,0 Q5,20 8,60 Q12,80 20,80 Q14,50 20,0Z" fill="#c8922a" stroke="#5a3a05" stroke-width="2"/>
          <!-- shoulder drape right -->
          <path d="M80,0 Q95,20 92,60 Q88,80 80,80 Q86,50 80,0Z" fill="#c8922a" stroke="#5a3a05" stroke-width="2"/>
          <!-- fur tufts at bottom -->
          <polygon points="30,238 38,258 46,238" fill="#d4a020" stroke="#7a5210" stroke-width="1.5"/>
          <polygon points="44,242 52,260 60,242" fill="#c8922a" stroke="#7a5210" stroke-width="1.5"/>
          <polygon points="54,238 62,258 70,238" fill="#d4a020" stroke="#7a5210" stroke-width="1.5"/>
          <!-- mane texture lines -->
          <path d="M38,20 Q35,60 36,100" fill="none" stroke="#7a5210" stroke-width="1.5" opacity="0.4"/>
          <path d="M50,15 Q48,55 49,100" fill="none" stroke="#7a5210" stroke-width="1.5" opacity="0.4"/>
          <path d="M62,20 Q65,60 63,100" fill="none" stroke="#7a5210" stroke-width="1.5" opacity="0.4"/>
        </svg>`;
        el.appendChild(cloak);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      /* ── ESTHER — Court Veil ────────────────────────────────────
         A translucent gold veil drops from above. Decorative jewel dots
         along the bottom. Sways gently.                                   */
      case "esther": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        const vLeft = isLeft ? "0%" : "auto";
        const vRight = isLeft ? "auto" : "0%";
        const veil = document.createElement("div");
        veil.setAttribute("aria-hidden", "true");
        veil.style.cssText = `position:absolute;top:0;left:${vLeft};right:${vRight};width:28%;height:95%;animation:esther-veil-drop 1200ms ease-out forwards;transform-origin:top center;`;
        veil.innerHTML = `<svg viewBox="0 0 100 300" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="evG" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${colors.gold};stop-opacity:0.5"/>
              <stop offset="70%" style="stop-color:#ffe090;stop-opacity:0.4"/>
              <stop offset="100%" style="stop-color:${colors.gold};stop-opacity:0.25"/>
            </linearGradient>
          </defs>
          <!-- veil body -->
          <rect x="5" y="0" width="90" height="280" fill="url(#evG)" rx="4"/>
          <!-- vertical decorative stripes -->
          <line x1="30" y1="0" x2="30" y2="280" stroke="${colors.gold}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
          <line x1="50" y1="0" x2="50" y2="280" stroke="${colors.gold}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
          <line x1="70" y1="0" x2="70" y2="280" stroke="${colors.gold}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
          <!-- bottom jewel dots -->
          <circle cx="15"  cy="272" r="4" fill="${colors.gold}" opacity="0.85"/>
          <circle cx="28"  cy="278" r="3.5" fill="#ffe080" opacity="0.85"/>
          <circle cx="41"  cy="272" r="4" fill="${colors.gold}" opacity="0.85"/>
          <circle cx="54"  cy="278" r="3.5" fill="#ffe080" opacity="0.85"/>
          <circle cx="67"  cy="272" r="4" fill="${colors.gold}" opacity="0.85"/>
          <circle cx="80"  cy="278" r="3.5" fill="#ffe080" opacity="0.85"/>
          <circle cx="90"  cy="272" r="4" fill="${colors.gold}" opacity="0.85"/>
          <!-- border -->
          <rect x="5" y="0" width="90" height="280" fill="none" stroke="${colors.gold}" stroke-width="2.5" rx="4" opacity="0.7"/>
        </svg>`;
        el.appendChild(veil);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      /* ── JUDAH — Phalanx Shield ─────────────────────────────────
         A solid round bronze shield with a gold menorah etched in the
         center materializes in front of Judah. Slight oscillation.        */
      case "judah": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        const shLeft = isLeft ? "8%" : "auto";
        const shRight = isLeft ? "auto" : "8%";
        const shield = document.createElement("div");
        shield.setAttribute("aria-hidden", "true");
        shield.style.cssText = `position:absolute;top:10%;left:${shLeft};right:${shRight};width:22%;height:78%;animation:judah-phalanx 1200ms ease-out forwards;`;
        shield.innerHTML = `<svg viewBox="0 0 100 220" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <radialGradient id="jpshG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#c8922a;stop-opacity:1"/>
              <stop offset="55%" style="stop-color:#9a6810;stop-opacity:1"/>
              <stop offset="100%" style="stop-color:#7a4808;stop-opacity:1"/>
            </radialGradient>
          </defs>
          <!-- shield body (rounded rect / oval) -->
          <ellipse cx="50" cy="110" rx="46" ry="104" fill="url(#jpshG)" stroke="#5a3a05" stroke-width="4"/>
          <!-- outer rim -->
          <ellipse cx="50" cy="110" rx="46" ry="104" fill="none" stroke="${colors.gold}" stroke-width="5" opacity="0.9"/>
          <ellipse cx="50" cy="110" rx="38" ry="92" fill="none" stroke="#9a6810" stroke-width="2" opacity="0.6"/>
          <!-- menorah (simplified chanukiah) -->
          <!-- central stem -->
          <rect x="48" y="70" width="4" height="70" fill="${colors.gold}" stroke="#5a3a05" stroke-width="1"/>
          <!-- arms left/right pairs -->
          <line x1="50" y1="120" x2="24" y2="120" stroke="${colors.gold}" stroke-width="3" stroke-linecap="round"/>
          <line x1="24" y1="120" x2="24" y2="90"  stroke="${colors.gold}" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="50" y1="115" x2="34" y2="115" stroke="${colors.gold}" stroke-width="3" stroke-linecap="round"/>
          <line x1="34" y1="115" x2="34" y2="88"  stroke="${colors.gold}" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="50" y1="120" x2="76" y2="120" stroke="${colors.gold}" stroke-width="3" stroke-linecap="round"/>
          <line x1="76" y1="120" x2="76" y2="90"  stroke="${colors.gold}" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="50" y1="115" x2="66" y2="115" stroke="${colors.gold}" stroke-width="3" stroke-linecap="round"/>
          <line x1="66" y1="115" x2="66" y2="88"  stroke="${colors.gold}" stroke-width="2.5" stroke-linecap="round"/>
          <!-- base -->
          <rect x="36" y="136" width="28" height="6" rx="2" fill="${colors.gold}" stroke="#5a3a05" stroke-width="1"/>
          <!-- shamash (center tall) flame -->
          <path d="M50,70 Q47,64 48,57 Q50,61 50,55 Q52,61 52,57 Q53,64 50,70Z" fill="#ff9900" opacity="0.9"/>
        </svg>`;
        el.appendChild(shield);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      /* ── RAMBAM — Philosophical Calm ────────────────────────────
         Soft cyan-blue aura (concentric ripple circles) emanates from
         Rambam, with 2–3 floating Hebrew-letter glyphs orbiting slowly.  */
      case "rambam": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        const aLeft = isLeft ? "0%" : "auto";
        const aRight = isLeft ? "auto" : "0%";
        const aura = document.createElement("div");
        aura.setAttribute("aria-hidden", "true");
        aura.style.cssText = `position:absolute;top:0%;left:${aLeft};right:${aRight};width:30%;height:100%;animation:rambam-calm 1200ms ease-out forwards;`;
        aura.innerHTML = `<svg viewBox="0 0 110 300" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <radialGradient id="rcalmG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#40c0d0;stop-opacity:0.0"/>
              <stop offset="50%" style="stop-color:#40c0d0;stop-opacity:0.18"/>
              <stop offset="100%" style="stop-color:#40c0d0;stop-opacity:0.0"/>
            </radialGradient>
          </defs>
          <ellipse cx="55" cy="150" rx="52" ry="145" fill="url(#rcalmG)"/>
          <!-- ripple rings -->
          <ellipse cx="55" cy="150" rx="50" ry="140" fill="none" stroke="#40c0d0" stroke-width="4" opacity="0.7"/>
          <ellipse cx="55" cy="150" rx="38" ry="108" fill="none" stroke="#60d8e8" stroke-width="3" opacity="0.55"/>
          <ellipse cx="55" cy="150" rx="26" ry="74"  fill="none" stroke="#80e8f8" stroke-width="2.5" opacity="0.45"/>
        </svg>`;
        el.appendChild(aura);

        // Orbiting Hebrew-ish glyphs (3 letters at different heights)
        const letters = ["מ", "ח", "ש"];
        const offsets = ["8%", "42%", "74%"];
        const glyphLeftBase = isLeft ? 2 : "auto";
        const glyphRightBase = isLeft ? "auto" : 2;
        letters.forEach((letter, i) => {
          const g = document.createElement("div");
          g.setAttribute("aria-hidden", "true");
          g.textContent = letter;
          g.style.cssText = `
            position:absolute;
            top:${offsets[i]};
            left:${isLeft ? `${4 + i * 6}%` : "auto"};
            right:${isLeft ? "auto" : `${4 + i * 6}%`};
            font-family:serif;font-size:22px;font-weight:700;
            color:#40c0d0;text-shadow:0 0 8px rgba(64,192,208,0.8);
            opacity:0;
            animation:rambam-glyph-orbit 1200ms ${i * 120}ms ease-out forwards;
          `;
          el.appendChild(g);
        });

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      /* ── GOLDA — Diplomatic Shield ──────────────────────────────
         2–3 cream document sheets with ink lines + red stamp circle slide
         in from the side and form a barrier in front of Golda.            */
      case "golda": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        const docData = [
          { left: isLeft ? "2%"  : "auto", right: isLeft ? "auto" : "2%",  top: "8%",  width: "18%", height: "68%", delay: 0,   rot: isLeft ? -5 : 5  },
          { left: isLeft ? "8%"  : "auto", right: isLeft ? "auto" : "8%",  top: "12%", width: "18%", height: "65%", delay: 100, rot: 0                },
          { left: isLeft ? "14%" : "auto", right: isLeft ? "auto" : "14%", top: "8%",  width: "18%", height: "68%", delay: 200, rot: isLeft ? 4 : -4  },
        ];

        docData.forEach((d, i) => {
          const doc = document.createElement("div");
          doc.setAttribute("aria-hidden", "true");
          doc.style.cssText = `
            position:absolute;top:${d.top};left:${d.left};right:${d.right};
            width:${d.width};height:${d.height};
            opacity:0;transform:rotate(${d.rot}deg);
            animation:golda-doc-slide-${isLeft ? "left" : "right"} 1200ms ${d.delay}ms ease-out forwards;
          `;
          doc.innerHTML = `<svg viewBox="0 0 60 160" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
            <!-- paper body -->
            <rect x="2" y="2" width="56" height="156" rx="3" fill="#f5f0e0" stroke="#c8b870" stroke-width="2"/>
            <!-- ink text lines -->
            <rect x="8"  y="18" width="34" height="3" rx="1" fill="#333" opacity="0.55"/>
            <rect x="8"  y="27" width="28" height="3" rx="1" fill="#333" opacity="0.45"/>
            <rect x="8"  y="36" width="32" height="3" rx="1" fill="#333" opacity="0.5"/>
            <rect x="8"  y="45" width="26" height="3" rx="1" fill="#333" opacity="0.45"/>
            <rect x="8"  y="54" width="30" height="3" rx="1" fill="#333" opacity="0.45"/>
            <rect x="8"  y="63" width="20" height="3" rx="1" fill="#333" opacity="0.4"/>
            <rect x="8"  y="72" width="32" height="3" rx="1" fill="#333" opacity="0.45"/>
            <rect x="8"  y="81" width="28" height="3" rx="1" fill="#333" opacity="0.4"/>
            <!-- red stamp circle -->
            <circle cx="38" cy="120" r="14" fill="none" stroke="#cc2200" stroke-width="3" opacity="0.8"/>
            <circle cx="38" cy="120" r="10" fill="none" stroke="#cc2200" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.6"/>
            <text x="38" y="124" text-anchor="middle" font-size="8" font-weight="bold" fill="#cc2200" opacity="0.8">OK</text>
          </svg>`;
          el.appendChild(doc);
        });

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      /* ── EINSTEIN — Theory Shield ───────────────────────────────
         A small dark-green chalkboard rectangle appears in front of
         Einstein with two lines of equations. Brief glow pulse.           */
      case "einstein": {
        const el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
        el.style.cssText = "position:absolute;inset:0;z-index:5;pointer-events:none;";

        const cbLeft = isLeft ? "4%" : "auto";
        const cbRight = isLeft ? "auto" : "4%";
        const board = document.createElement("div");
        board.setAttribute("aria-hidden", "true");
        board.style.cssText = `position:absolute;top:15%;left:${cbLeft};right:${cbRight};width:24%;height:65%;animation:einstein-chalkboard 1200ms ease-out forwards;`;
        board.innerHTML = `<svg viewBox="0 0 90 170" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <filter id="ecbGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          <!-- board body -->
          <rect x="2" y="2" width="86" height="166" rx="4" fill="#1a4a1a" stroke="#0a2a0a" stroke-width="3"/>
          <!-- chalk tray -->
          <rect x="5" y="158" width="80" height="7" rx="2" fill="#3a2a10" stroke="#1a1a0a" stroke-width="1.5"/>
          <!-- wood frame -->
          <rect x="2" y="2" width="86" height="166" rx="4" fill="none" stroke="#5a4010" stroke-width="3"/>
          <!-- equation line 1 (∇·E = ρ/ε₀) -->
          <text x="8" y="65" font-family="serif" font-size="12" fill="white" opacity="0.9">&#x2207;&#xB7;E = &#x3C1;/&#x3B5;&#x2080;</text>
          <!-- equation line 2 (F = ma) -->
          <text x="22" y="100" font-family="serif" font-size="14" fill="white" opacity="0.9">F = ma</text>
          <!-- glow outline -->
          <rect x="2" y="2" width="86" height="166" rx="4" fill="none" stroke="#40c040" stroke-width="3" opacity="0.5" filter="url(#ecbGlow)"/>
        </svg>`;
        el.appendChild(board);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      default: {
        // Generic fallback: original blue shield bubble
        const xPct = playerIdx === 0 ? 15 : 85;
        const el = document.createElement("div");
        el.className = "defend-shield";
        el.style.left = `${xPct}%`;
        el.style.top = "55%";
        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1350);
        return;
      }
    }
  }

  // Color tokens for FX (mirrors Render.colors)
  const colors = { gold: "#d4a574", ink: "#1a1a1a", cream: "#fff8e7", terracotta: "#c1462d", navy: "#1a2a4f", olive: "#6b8e23" };

  // Per-hero special FX injected as transient overlay nodes inside .arena
  function playSpecialFx(activeIdx, heroId) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;

    // Determine which side the active fighter is on (left=0, right=1)
    // and where the opponent is
    const isLeft = activeIdx === 0;
    const activeSide = isLeft ? "left" : "right";
    const opponentSide = isLeft ? "right" : "left";

    const el = document.createElement("div");
    el.className = `special-fx special-fx-${heroId}`;
    el.setAttribute("aria-hidden", "true");

    const svgNS = "http://www.w3.org/2000/svg";

    switch (heroId) {

      /* ── MOSES: Part the Sea ───────────────────────────────────────
         Stage 1 (0–350ms):  two water walls slide IN from edges to meet in the centre
         Stage 2 (350–800ms): walls part outward, dry path revealed
         Stage 3 (800–1300ms): right wall (opponent side) slams back — arena shakes   */
      case "moses": {
        el.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;";

        // Left water wall
        const wL = document.createElement("div");
        wL.className = "moses-wall moses-wall-left";
        wL.setAttribute("aria-hidden", "true");
        wL.innerHTML = `<svg viewBox="0 0 120 240" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="wgL" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" style="stop-color:#0a2a6e;stop-opacity:1"/>
              <stop offset="70%" style="stop-color:#1a6adf;stop-opacity:0.95"/>
              <stop offset="100%" style="stop-color:#60b0ff;stop-opacity:0.85"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="120" height="220" fill="url(#wgL)"/>
          <!-- wavy white cap -->
          <path d="M0,15 Q15,0 30,15 Q45,30 60,15 Q75,0 90,15 Q105,30 120,15 L120,0 L0,0Z" fill="white" opacity="0.75"/>
          <path d="M0,28 Q20,14 40,28 Q60,42 80,28 Q100,14 120,28 L120,20 Q100,6 80,20 Q60,34 40,20 Q20,6 0,20Z" fill="white" opacity="0.4"/>
        </svg>`;
        wL.style.cssText = `position:absolute;top:0;left:0;width:42%;height:100%;animation:moses-wall-left 1300ms ease-in-out forwards;`;

        // Right water wall
        const wR = document.createElement("div");
        wR.className = "moses-wall moses-wall-right";
        wR.setAttribute("aria-hidden", "true");
        wR.innerHTML = `<svg viewBox="0 0 120 240" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="wgR" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" style="stop-color:#0a2a6e;stop-opacity:1"/>
              <stop offset="70%" style="stop-color:#1a6adf;stop-opacity:0.95"/>
              <stop offset="100%" style="stop-color:#60b0ff;stop-opacity:0.85"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="120" height="220" fill="url(#wgR)"/>
          <path d="M0,15 Q15,0 30,15 Q45,30 60,15 Q75,0 90,15 Q105,30 120,15 L120,0 L0,0Z" fill="white" opacity="0.75"/>
          <path d="M0,28 Q20,14 40,28 Q60,42 80,28 Q100,14 120,28 L120,20 Q100,6 80,20 Q60,34 40,20 Q20,6 0,20Z" fill="white" opacity="0.4"/>
        </svg>`;
        wR.style.cssText = `position:absolute;top:0;right:0;width:42%;height:100%;animation:moses-wall-right 1300ms ease-in-out forwards;`;

        el.appendChild(wL);
        el.appendChild(wR);
        arena.appendChild(el);

        // Screen shake on arena at crash point (~850ms)
        window.setTimeout(() => {
          arena.style.animation = "arena-shake 200ms ease-in-out";
          window.setTimeout(() => { arena.style.animation = ""; }, 210);
        }, 850);

        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1350);
        return; // early return; element already appended
      }

      /* ── DAVID: Sling Stone ──────────────────────────────────────
         Stage 1 (0–380ms):  small circle whirls in a tight loop near David's hand
         Stage 2 (380–850ms): stone flies fast to opponent with blur tail
         Stage 3 (850–1150ms): starburst impact + dust at opponent             */
      case "david": {
        el.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;";

        // Sling whirl: a small orbiting dot around David's hand position
        const handX = isLeft ? "13%" : "82%";
        const whirl = document.createElement("div");
        whirl.className = "david-whirl";
        whirl.setAttribute("aria-hidden", "true");
        whirl.style.cssText = `position:absolute;top:38%;left:${handX};width:50px;height:50px;animation:david-whirl 380ms linear forwards;`;
        whirl.innerHTML = `<svg viewBox="0 0 50 50" width="50" height="50" xmlns="${svgNS}">
          <circle cx="40" cy="25" r="8" fill="#2a1a0a" stroke="#555" stroke-width="1.5"/>
          <!-- sling rope -->
          <line x1="25" y1="25" x2="40" y2="25" stroke="#6b4c2a" stroke-width="1.5" opacity="0.8"/>
        </svg>`;
        el.appendChild(whirl);

        // Stone projectile (appears at 380ms, flies to opponent)
        const stoneX = isLeft ? "18%" : "auto";
        const stoneRight = isLeft ? "auto" : "18%";
        const stone = document.createElement("div");
        stone.className = "david-stone";
        stone.setAttribute("aria-hidden", "true");
        stone.style.cssText = `
          position:absolute;top:36%;left:${stoneX};right:${stoneRight};
          width:22px;height:22px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%,#555,#1a1005);
          border:2px solid #777;box-shadow:0 2px 6px rgba(0,0,0,0.5);
          opacity:0;animation:david-stone-fly-${activeSide} 500ms 380ms ease-in forwards;
        `;
        el.appendChild(stone);

        // Impact burst at opponent side (appears at 880ms)
        const impactX = isLeft ? "78%" : "4%";
        const impact = document.createElement("div");
        impact.className = "david-impact";
        impact.setAttribute("aria-hidden", "true");
        impact.style.cssText = `position:absolute;top:20%;left:${impactX};width:18%;height:60%;opacity:0;animation:david-impact 350ms 860ms ease-out forwards;`;
        impact.innerHTML = `<svg viewBox="0 0 80 140" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- radial yellow lines -->
          <line x1="40" y1="70" x2="40" y2="10" stroke="#ffcc00" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
          <line x1="40" y1="70" x2="75" y2="30" stroke="#ffcc00" stroke-width="3.5" stroke-linecap="round" opacity="0.85"/>
          <line x1="40" y1="70" x2="78" y2="70" stroke="#ffcc00" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>
          <line x1="40" y1="70" x2="65" y2="115" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
          <line x1="40" y1="70" x2="40" y2="130" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
          <line x1="40" y1="70" x2="15" y2="115" stroke="#ffcc00" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
          <line x1="40" y1="70" x2="5"  y2="70" stroke="#ffcc00" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>
          <line x1="40" y1="70" x2="8"  y2="30" stroke="#ffcc00" stroke-width="3.5" stroke-linecap="round" opacity="0.85"/>
          <!-- dust puff -->
          <ellipse cx="40" cy="110" rx="28" ry="12" fill="#b8a070" opacity="0.45"/>
        </svg>`;
        el.appendChild(impact);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1250);
        return;
      }

      /* ── ESTHER: Reversal ─────────────────────────────────────────
         A gold-rimmed oval mirror materialises in front of Esther.
         Three arrows fly IN from opponent side, bounce back glowing red.
         "REVERSAL!" text floats above.                                      */
      case "esther": {
        el.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;";

        // Mirror oval — positioned in front of Esther
        const mLeft = isLeft ? "8%" : "auto";
        const mRight = isLeft ? "auto" : "8%";
        const mirror = document.createElement("div");
        mirror.className = "esther-mirror";
        mirror.setAttribute("aria-hidden", "true");
        mirror.style.cssText = `position:absolute;top:8%;left:${mLeft};right:${mRight};width:20%;height:78%;animation:esther-mirror 1200ms ease-out forwards;`;
        mirror.innerHTML = `<svg viewBox="0 0 80 220" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <radialGradient id="mirrorGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#e8f4ff;stop-opacity:0.7"/>
              <stop offset="70%" style="stop-color:#a8d8ff;stop-opacity:0.4"/>
              <stop offset="100%" style="stop-color:#4488cc;stop-opacity:0.15"/>
            </radialGradient>
          </defs>
          <!-- gold frame -->
          <ellipse cx="40" cy="110" rx="36" ry="100" fill="none" stroke="${colors.gold}" stroke-width="7" opacity="0.95"/>
          <ellipse cx="40" cy="110" rx="30" ry="92" fill="url(#mirrorGrad)"/>
          <!-- inner shimmer lines -->
          <ellipse cx="40" cy="110" rx="22" ry="72" fill="none" stroke="white" stroke-width="2" stroke-dasharray="6 4" opacity="0.5"/>
          <!-- decorative gems on frame -->
          <circle cx="40" cy="12" r="4" fill="${colors.gold}" stroke="#fff" stroke-width="1"/>
          <circle cx="40" cy="208" r="4" fill="${colors.gold}" stroke="#fff" stroke-width="1"/>
          <circle cx="6" cy="90" r="3" fill="${colors.gold}" stroke="#fff" stroke-width="1"/>
          <circle cx="74" cy="90" r="3" fill="${colors.gold}" stroke="#fff" stroke-width="1"/>
        </svg>`;
        el.appendChild(mirror);

        // Three incoming arrows (from opponent side) then bouncing back as red
        // Arrow 1 (delay 200ms), arrow 2 (delay 400ms), arrow 3 (delay 600ms)
        const arrowDir = isLeft ? 1 : -1; // +1 = arrows come from right; -1 = from left
        for (let i = 0; i < 3; i++) {
          const arr = document.createElement("div");
          arr.className = "esther-arrow";
          arr.setAttribute("aria-hidden", "true");
          const yPct = 25 + i * 18;
          const startX = isLeft ? "82%" : "2%";
          arr.style.cssText = `position:absolute;top:${yPct}%;left:${startX};width:80px;height:14px;opacity:0;animation:esther-arrow-${isLeft ? "rtl" : "ltr"} 300ms ${200 + i * 200}ms ease-in forwards;`;
          arr.innerHTML = `<svg viewBox="0 0 80 14" width="80" height="14" xmlns="${svgNS}">
            <defs>
              <linearGradient id="arrGrad${i}" x1="${isLeft ? "100%" : "0%"}" y1="0%" x2="${isLeft ? "0%" : "100%"}" y2="0%">
                <stop offset="0%" style="stop-color:#4499ff;stop-opacity:0.9"/>
                <stop offset="100%" style="stop-color:#99ccff;stop-opacity:0.5"/>
              </linearGradient>
            </defs>
            <line x1="${isLeft ? "80" : "0"}" y1="7" x2="${isLeft ? "12" : "68"}" y2="7" stroke="url(#arrGrad${i})" stroke-width="3" stroke-linecap="round"/>
            <polygon points="${isLeft ? "0,7 14,2 14,12" : "80,7 66,2 66,12"}" fill="#4499ff" opacity="0.9"/>
          </svg>`;
          el.appendChild(arr);

          // Bounce-back arrow (red, opposite direction)
          const bounce = document.createElement("div");
          bounce.className = "esther-bounce";
          bounce.setAttribute("aria-hidden", "true");
          const bStartX = isLeft ? "28%" : "52%";
          bounce.style.cssText = `position:absolute;top:${yPct}%;left:${bStartX};width:80px;height:14px;opacity:0;animation:esther-bounce-${isLeft ? "ltr" : "rtl"} 250ms ${600 + i * 150}ms ease-out forwards;`;
          bounce.innerHTML = `<svg viewBox="0 0 80 14" width="80" height="14" xmlns="${svgNS}">
            <defs>
              <linearGradient id="bGrad${i}" x1="${isLeft ? "0%" : "100%"}" y1="0%" x2="${isLeft ? "100%" : "0%"}" y2="0%">
                <stop offset="0%" style="stop-color:#ff2200;stop-opacity:0.95"/>
                <stop offset="100%" style="stop-color:#ffaa00;stop-opacity:0.6"/>
              </linearGradient>
            </defs>
            <line x1="${isLeft ? "0" : "80"}" y1="7" x2="${isLeft ? "68" : "12"}" y2="7" stroke="url(#bGrad${i})" stroke-width="4" stroke-linecap="round"/>
            <polygon points="${isLeft ? "80,7 66,2 66,12" : "0,7 14,2 14,12"}" fill="#ff2200" opacity="0.95"/>
          </svg>`;
          el.appendChild(bounce);
        }

        // "REVERSAL!" text above mirror
        const label = document.createElement("div");
        label.className = "esther-label";
        label.setAttribute("aria-hidden", "true");
        label.textContent = "REVERSAL!";
        const lblLeft = isLeft ? "4%" : "auto";
        const lblRight = isLeft ? "auto" : "4%";
        label.style.cssText = `
          position:absolute;top:2%;left:${lblLeft};right:${lblRight};
          font-family:Georgia,serif;font-size:22px;font-weight:700;
          color:${colors.gold};text-shadow:1px 1px 0 #000,0 0 12px rgba(212,165,116,0.8);
          white-space:nowrap;opacity:0;animation:esther-label 800ms 300ms ease-out forwards;
        `;
        el.appendChild(label);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
        return;
      }

      /* ── JUDAH: Menorah Flame ─────────────────────────────────────
         Stage 1 (0–400ms):  full chanukiah rises from bottom on Judah's side
         Stage 2 (400–900ms): 9 candles ignite left-to-right, each a teardrop flame
         Stage 3 (900–1350ms): flames arc off and fireball lands on opponent         */
      case "judah": {
        el.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;";

        // Menorah base — on Judah's side
        const menLeft = isLeft ? "2%" : "auto";
        const menRight = isLeft ? "auto" : "2%";
        const menorah = document.createElement("div");
        menorah.className = "judah-menorah";
        menorah.setAttribute("aria-hidden", "true");
        menorah.style.cssText = `position:absolute;bottom:0;left:${menLeft};right:${menRight};width:28%;height:90%;animation:judah-menorah-rise 400ms ease-out forwards;`;
        menorah.innerHTML = `<svg viewBox="0 0 120 240" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- base -->
          <rect x="42" y="220" width="36" height="16" rx="4" fill="#b8862a" stroke="#7a5210" stroke-width="2"/>
          <!-- central stem -->
          <rect x="57" y="120" width="6" height="100" fill="#c89830" stroke="#7a5210" stroke-width="1.5"/>
          <!-- central candle holder -->
          <rect x="54" y="110" width="12" height="14" rx="2" fill="#c89830" stroke="#7a5210" stroke-width="1.5"/>
          <!-- 4 left branches (stepped up toward center) -->
          <line x1="57" y1="180" x2="10" y2="180" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="10" y1="180" x2="10" y2="148" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <line x1="57" y1="175" x2="28" y2="175" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="28" y1="175" x2="28" y2="147" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <line x1="57" y1="168" x2="43" y2="168" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="43" y1="168" x2="43" y2="142" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <line x1="57" y1="160" x2="53" y2="160" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="53" y1="160" x2="53" y2="136" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <!-- 4 right branches (mirrored) -->
          <line x1="63" y1="180" x2="110" y2="180" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="110" y1="180" x2="110" y2="148" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <line x1="63" y1="175" x2="92" y2="175" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="92" y1="175" x2="92" y2="147" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <line x1="63" y1="168" x2="77" y2="168" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="77" y1="168" x2="77" y2="142" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <line x1="63" y1="160" x2="67" y2="160" stroke="#c89830" stroke-width="5" stroke-linecap="round"/>
          <line x1="67" y1="160" x2="67" y2="136" stroke="#c89830" stroke-width="4" stroke-linecap="round"/>
          <!-- candle stubs (tops of each candle position) -->
          <rect x="6"   y="134" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="24"  y="133" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="39"  y="128" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="49"  y="122" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="56"  y="96"  width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="63"  y="122" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="73"  y="128" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="88"  y="133" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
          <rect x="106" y="134" width="8" height="14" rx="1.5" fill="#ffe8aa" stroke="#c89830" stroke-width="1"/>
        </svg>`;
        el.appendChild(menorah);

        // 9 flames igniting left-to-right (delays 400–840ms, step 55ms)
        // Flame positions (x in 0-120 viewBox): 10,28,43,53,60,67,77,92,110
        const flameXs = [10, 28, 43, 53, 60, 67, 77, 92, 110];
        // y tops of each candle row (menorah bottom = 240, height=90% of arena, candles at 134,133,128,122,96,122,128,133,134)
        // We'll put each flame as a child overlay SVG on top of the menorah
        const flameWrap = document.createElement("div");
        flameWrap.style.cssText = `position:absolute;bottom:0;left:${menLeft};right:${menRight};width:28%;height:90%;pointer-events:none;`;
        flameXs.forEach((fx, i) => {
          const fEl = document.createElement("div");
          fEl.className = "judah-flame";
          fEl.setAttribute("aria-hidden", "true");
          // flame positions in percent of the flameWrap (which is 120×240 viewbox)
          // pct x = fx/120, y varies per candle top
          const candleTopY = [134, 133, 128, 122, 96, 122, 128, 133, 134];
          const fxPct = (fx / 120) * 100;
          const fyPct = ((candleTopY[i] - 30) / 240) * 100;
          fEl.style.cssText = `
            position:absolute;
            left:calc(${fxPct}% - 7px);
            top:${fyPct}%;
            width:14px;height:26px;
            opacity:0;
            animation:judah-flame-ignite 200ms ${400 + i * 55}ms ease-out forwards;
          `;
          fEl.innerHTML = `<svg viewBox="0 0 14 26" width="14" height="26" xmlns="${svgNS}">
            <path d="M7,25 Q1,18 3,12 Q5,16 5,10 Q7,14 7,6 Q9,14 9,10 Q11,16 11,12 Q13,18 7,25Z" fill="#e86010" stroke="none"/>
            <path d="M7,25 Q3,19 5,14 Q7,18 7,10 Q9,18 9,14 Q11,19 7,25Z" fill="#f5a020" opacity="0.85"/>
            <path d="M7,24 Q5,20 6,17 Q7,19 7,14 Q8,19 8,17 Q9,20 7,24Z" fill="#ffee44" opacity="0.9"/>
          </svg>`;
          flameWrap.appendChild(fEl);
        });
        el.appendChild(flameWrap);

        // Fireball launching to opponent at 900ms
        const fb = document.createElement("div");
        fb.className = "judah-fireball";
        fb.setAttribute("aria-hidden", "true");
        const fbFromX = isLeft ? "18%" : "72%";
        fb.style.cssText = `
          position:absolute;top:25%;left:${fbFromX};
          width:36px;height:36px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%,#fff700,#ff8800,#cc2200);
          box-shadow:0 0 18px 6px rgba(255,140,0,0.6);
          opacity:0;animation:judah-fireball-${activeSide} 450ms 900ms ease-in forwards;
        `;
        el.appendChild(fb);

        // Impact burst at opponent at 1340ms
        const fImpact = document.createElement("div");
        fImpact.className = "judah-fimpact";
        fImpact.setAttribute("aria-hidden", "true");
        const fiLeft = isLeft ? "74%" : "2%";
        fImpact.style.cssText = `position:absolute;top:5%;left:${fiLeft};width:22%;height:80%;opacity:0;animation:judah-fimpact 280ms 1330ms ease-out forwards;`;
        fImpact.innerHTML = `<svg viewBox="0 0 80 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <path d="M40,100 Q20,60 5,80 Q25,75 15,55 Q35,80 30,60 Q40,85 40,65 Q50,85 55,60 Q65,80 50,55 Q75,75 70,80 Q55,60 40,100Z" fill="#ff8800" opacity="0.92"/>
          <path d="M40,100 Q28,72 25,55 Q40,75 40,55 Q55,75 60,55 Q57,72 40,100Z" fill="#ffee00" opacity="0.85"/>
          <ellipse cx="40" cy="165" rx="26" ry="10" fill="#555" opacity="0.3"/>
        </svg>`;
        el.appendChild(fImpact);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1650);
        return;
      }

      /* ── RAMBAM: Healing Touch ────────────────────────────────────
         Stage 1 (0–400ms):  open book appears floating above Rambam, glyphs on pages
         Stage 2 (400–900ms): golden particles stream DOWN from book into Rambam; green-gold halo
         Stage 3 (900–1300ms): book fades; particles fade                             */
      case "rambam": {
        el.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;";

        // Book floating above Rambam
        const bkLeft = isLeft ? "1%" : "auto";
        const bkRight = isLeft ? "auto" : "1%";
        const book = document.createElement("div");
        book.className = "rambam-book";
        book.setAttribute("aria-hidden", "true");
        book.style.cssText = `position:absolute;top:4%;left:${bkLeft};right:${bkRight};width:26%;height:38%;animation:rambam-book 1300ms ease-out forwards;`;
        book.innerHTML = `<svg viewBox="0 0 100 90" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- cover -->
          <rect x="2" y="10" width="96" height="70" rx="4" fill="#c8a060" stroke="#7a5210" stroke-width="2.5"/>
          <!-- spine -->
          <rect x="46" y="10" width="8" height="70" fill="#9a7238" stroke="#7a5210" stroke-width="1"/>
          <!-- left page -->
          <rect x="4" y="12" width="40" height="66" rx="2" fill="#fff8e0" stroke="#c8a060" stroke-width="1"/>
          <!-- right page -->
          <rect x="56" y="12" width="40" height="66" rx="2" fill="#fff8e0" stroke="#c8a060" stroke-width="1"/>
          <!-- Hebrew glyph rects (abstract) left page -->
          <rect x="8"  y="18" width="18" height="3" rx="1" fill="#3a2810" opacity="0.7"/>
          <rect x="8"  y="25" width="28" height="3" rx="1" fill="#3a2810" opacity="0.6"/>
          <rect x="8"  y="32" width="22" height="3" rx="1" fill="#3a2810" opacity="0.65"/>
          <rect x="8"  y="39" width="26" height="3" rx="1" fill="#3a2810" opacity="0.6"/>
          <rect x="8"  y="46" width="20" height="3" rx="1" fill="#3a2810" opacity="0.55"/>
          <rect x="8"  y="53" width="28" height="3" rx="1" fill="#3a2810" opacity="0.5"/>
          <rect x="8"  y="60" width="16" height="3" rx="1" fill="#3a2810" opacity="0.55"/>
          <!-- right page glyphs -->
          <rect x="60" y="18" width="18" height="3" rx="1" fill="#3a2810" opacity="0.7"/>
          <rect x="60" y="25" width="28" height="3" rx="1" fill="#3a2810" opacity="0.6"/>
          <rect x="60" y="32" width="22" height="3" rx="1" fill="#3a2810" opacity="0.65"/>
          <rect x="60" y="39" width="26" height="3" rx="1" fill="#3a2810" opacity="0.6"/>
          <rect x="60" y="46" width="20" height="3" rx="1" fill="#3a2810" opacity="0.55"/>
          <rect x="60" y="53" width="28" height="3" rx="1" fill="#3a2810" opacity="0.5"/>
          <rect x="60" y="60" width="16" height="3" rx="1" fill="#3a2810" opacity="0.55"/>
        </svg>`;
        el.appendChild(book);

        // Golden particle stream (5 staggered dots falling from book to hero)
        for (let p = 0; p < 6; p++) {
          const part = document.createElement("div");
          part.className = "rambam-particle";
          part.setAttribute("aria-hidden", "true");
          const pxOff = -4 + p * 3;
          const pLeft = isLeft ? `calc(10% + ${pxOff}px)` : `auto`;
          const pRight = isLeft ? "auto" : `calc(10% + ${pxOff}px)`;
          part.style.cssText = `
            position:absolute;
            top:34%;left:${pLeft};right:${pRight};
            width:8px;height:8px;border-radius:50%;
            background:radial-gradient(circle,#ffe066,#d4a020);
            box-shadow:0 0 6px 2px rgba(255,200,0,0.5);
            opacity:0;
            animation:rambam-particle 600ms ${400 + p * 80}ms ease-in forwards;
          `;
          el.appendChild(part);
        }

        // Green-gold halo around Rambam body
        const haloLeft = isLeft ? "0%" : "auto";
        const haloRight = isLeft ? "auto" : "0%";
        const halo = document.createElement("div");
        halo.className = "rambam-halo";
        halo.setAttribute("aria-hidden", "true");
        halo.style.cssText = `position:absolute;top:8%;left:${haloLeft};right:${haloRight};width:28%;height:82%;opacity:0;animation:rambam-halo 900ms 400ms ease-out forwards;`;
        halo.innerHTML = `<svg viewBox="0 0 100 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <radialGradient id="haloG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#44ee44;stop-opacity:0.0"/>
              <stop offset="65%" style="stop-color:#44ee44;stop-opacity:0.12"/>
              <stop offset="100%" style="stop-color:#88ff44;stop-opacity:0.0"/>
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="100" rx="46" ry="94" fill="url(#haloG)"/>
          <ellipse cx="50" cy="100" rx="46" ry="94" fill="none" stroke="#44dd44" stroke-width="5" stroke-dasharray="8 4" opacity="0.7"/>
          <ellipse cx="50" cy="100" rx="38" ry="80" fill="none" stroke="${colors.gold}" stroke-width="3" opacity="0.5"/>
        </svg>`;
        el.appendChild(halo);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1350);
        return;
      }

      /* ── GOLDA: Resolve ────────────────────────────────────────────
         Stage 1 (0–300ms):  white-gold outline glow around Golda
         Stage 2 (300–700ms): iron-gray armor plates snap on, sparks fly
         Stage 3 (700–1100ms): armor shatters into shards flying up, fist icon pulses
         Stage 4 (1100–1300ms): fade out                                              */
      case "golda": {
        el.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;";

        // Outline glow
        const glowLeft = isLeft ? "0%" : "auto";
        const glowRight = isLeft ? "auto" : "0%";
        const glow = document.createElement("div");
        glow.className = "golda-glow";
        glow.setAttribute("aria-hidden", "true");
        glow.style.cssText = `position:absolute;top:5%;left:${glowLeft};right:${glowRight};width:28%;height:88%;animation:golda-glow 1300ms ease-out forwards;`;
        glow.innerHTML = `<svg viewBox="0 0 100 220" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <filter id="goldGlow">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          <ellipse cx="50" cy="110" rx="44" ry="102" fill="none" stroke="#fff8a0" stroke-width="8" opacity="0.85" filter="url(#goldGlow)"/>
          <ellipse cx="50" cy="110" rx="40" ry="96" fill="none" stroke="${colors.gold}" stroke-width="4" opacity="0.6"/>
        </svg>`;
        el.appendChild(glow);

        // Iron armor plates (appear at 300ms)
        const armorLeft = isLeft ? "2%" : "auto";
        const armorRight = isLeft ? "auto" : "2%";
        const armor = document.createElement("div");
        armor.className = "golda-armor";
        armor.setAttribute("aria-hidden", "true");
        armor.style.cssText = `position:absolute;top:20%;left:${armorLeft};right:${armorRight};width:26%;height:55%;opacity:0;animation:golda-armor 800ms 300ms ease-out forwards;`;
        armor.innerHTML = `<svg viewBox="0 0 90 120" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- chest plate -->
          <path d="M20,10 L70,10 L80,50 L45,65 L10,50Z" fill="#8a8a8a" stroke="#444" stroke-width="2.5"/>
          <path d="M30,12 L60,12 L68,45 L45,57 L22,45Z" fill="#aaa" stroke="#666" stroke-width="1"/>
          <!-- left shoulder plate -->
          <path d="M5,8 L22,8 L18,35 L2,30Z" fill="#7a7a7a" stroke="#444" stroke-width="2"/>
          <!-- right shoulder plate -->
          <path d="M68,8 L85,8 L88,30 L72,35Z" fill="#7a7a7a" stroke="#444" stroke-width="2"/>
          <!-- rivets -->
          <circle cx="35" cy="20" r="2.5" fill="#555"/>
          <circle cx="55" cy="20" r="2.5" fill="#555"/>
          <circle cx="45" cy="38" r="2.5" fill="#555"/>
          <!-- spark lines -->
          <line x1="0"  y1="0"  x2="-8" y2="-12" stroke="#ffee00" stroke-width="2" opacity="0.8"/>
          <line x1="90" y1="5"  x2="98" y2="-8"  stroke="#ffee00" stroke-width="2" opacity="0.8"/>
          <line x1="45" y1="0"  x2="48" y2="-10" stroke="#ffee00" stroke-width="1.5" opacity="0.7"/>
        </svg>`;
        el.appendChild(armor);

        // Shards flying up (appear at 700ms)
        const shardLeft = isLeft ? "2%" : "auto";
        const shardRight = isLeft ? "auto" : "2%";
        for (let s = 0; s < 5; s++) {
          const shard = document.createElement("div");
          shard.className = "golda-shard";
          shard.setAttribute("aria-hidden", "true");
          const sx = 5 + s * 18;
          shard.style.cssText = `
            position:absolute;top:35%;left:calc(${isLeft ? "4%" : "auto"} + ${sx}px);right:${isLeft ? "auto" : `calc(4% + ${sx}px)`};
            width:10px;height:16px;opacity:0;
            animation:golda-shard 500ms ${700 + s * 40}ms ease-out forwards;
          `;
          shard.innerHTML = `<svg viewBox="0 0 10 16" width="10" height="16" xmlns="${svgNS}">
            <polygon points="5,0 10,16 0,16" fill="#8a8a8a" stroke="#444" stroke-width="1" opacity="0.9"/>
          </svg>`;
          el.appendChild(shard);
        }

        // Fist icon pulses (appears at 750ms)
        const fistLeft = isLeft ? "14%" : "auto";
        const fistRight = isLeft ? "auto" : "14%";
        const fist = document.createElement("div");
        fist.className = "golda-fist";
        fist.setAttribute("aria-hidden", "true");
        fist.style.cssText = `position:absolute;top:45%;left:${fistLeft};right:${fistRight};width:32px;height:32px;opacity:0;animation:golda-fist 550ms 750ms ease-out forwards;`;
        fist.innerHTML = `<svg viewBox="0 0 32 32" width="32" height="32" xmlns="${svgNS}">
          <!-- simple raised fist -->
          <rect x="9"  y="14" width="14" height="12" rx="3" fill="${colors.gold}" stroke="#7a5210" stroke-width="1.5"/>
          <rect x="10" y="8"  width="5"  height="8"  rx="2" fill="${colors.gold}" stroke="#7a5210" stroke-width="1.5"/>
          <rect x="16" y="7"  width="5"  height="8"  rx="2" fill="${colors.gold}" stroke="#7a5210" stroke-width="1.5"/>
          <rect x="6"  y="17" width="5"  height="6"  rx="2" fill="${colors.gold}" stroke="#7a5210" stroke-width="1.5"/>
          <!-- thumb -->
          <rect x="6"  y="20" width="5"  height="4"  rx="2" fill="${colors.gold}" stroke="#7a5210" stroke-width="1"/>
        </svg>`;
        el.appendChild(fist);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1350);
        return;
      }

      /* ── EINSTEIN: E=mc² ─────────────────────────────────────────
         Stage 1 (0–400ms):   "E = mc²" in big white serif materialises above Einstein
         Stage 2 (400–700ms):  equation pulses, "²" flashes brighter
         Stage 3 (700–1000ms): wide energy beam fires horizontally to opponent
         Stage 4 (1000–1300ms): huge starburst explosion at impact + arena shake       */
      case "einstein": {
        el.style.cssText = "position:absolute;inset:0;z-index:6;pointer-events:none;";

        // Equation text
        const eqLeft = isLeft ? "2%" : "auto";
        const eqRight = isLeft ? "auto" : "2%";
        const eq = document.createElement("div");
        eq.className = "einstein-eq";
        eq.setAttribute("aria-hidden", "true");
        eq.innerHTML = `E = mc<sup style="font-size:0.65em;vertical-align:super;">2</sup>`;
        eq.style.cssText = `
          position:absolute;top:4%;left:${eqLeft};right:${eqRight};
          font-family:Georgia,serif;font-size:52px;font-weight:700;color:#ffffff;
          text-shadow:0 0 18px rgba(255,240,100,0.9),0 0 6px rgba(255,255,255,0.7);
          white-space:nowrap;opacity:0;
          animation:einstein-eq 700ms ease-out forwards;
        `;
        el.appendChild(eq);

        // Energy beam (fires at 700ms)
        const beamFromX = isLeft ? "24%" : "0";
        const beamToX   = isLeft ? "100%" : "76%";
        const beam = document.createElement("div");
        beam.className = "einstein-beam";
        beam.setAttribute("aria-hidden", "true");
        beam.style.cssText = `
          position:absolute;top:38%;
          left:${isLeft ? "24%" : "0"};right:${isLeft ? "0" : "24%"};
          height:44px;opacity:0;
          animation:einstein-beam 350ms 700ms ease-in forwards;
          transform-origin:${isLeft ? "left" : "right"} center;
        `;
        beam.innerHTML = `<svg viewBox="0 0 400 44" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <linearGradient id="beamG" x1="${isLeft ? "0%" : "100%"}" y1="0%" x2="${isLeft ? "100%" : "0%"}" y2="0%">
              <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95"/>
              <stop offset="30%" style="stop-color:#ffff80;stop-opacity:0.9"/>
              <stop offset="70%" style="stop-color:#ffdd00;stop-opacity:0.85"/>
              <stop offset="100%" style="stop-color:#ff8800;stop-opacity:0.5"/>
            </linearGradient>
          </defs>
          <rect x="0" y="6" width="400" height="32" fill="url(#beamG)" rx="4"/>
          <rect x="0" y="16" width="400" height="12" fill="white" opacity="0.5" rx="2"/>
        </svg>`;
        el.appendChild(beam);

        // Explosion starburst at opponent (at 1040ms)
        const exLeft = isLeft ? "75%" : "2%";
        const explosion = document.createElement("div");
        explosion.className = "einstein-explosion";
        explosion.setAttribute("aria-hidden", "true");
        explosion.style.cssText = `position:absolute;top:5%;left:${exLeft};width:22%;height:88%;opacity:0;animation:einstein-explosion 380ms 1040ms ease-out forwards;`;
        explosion.innerHTML = `<svg viewBox="0 0 90 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <defs>
            <radialGradient id="exG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
              <stop offset="30%" style="stop-color:#ffff44;stop-opacity:0.9"/>
              <stop offset="70%" style="stop-color:#ff8800;stop-opacity:0.7"/>
              <stop offset="100%" style="stop-color:#ff2200;stop-opacity:0"/>
            </radialGradient>
          </defs>
          <!-- starburst rays -->
          <polygon points="45,100 41,60 49,60" fill="#ffff44" opacity="0.9"/>
          <polygon points="45,100 68,72 62,80" fill="#ffff44" opacity="0.85"/>
          <polygon points="45,100 80,100 72,96" fill="#ffcc00" opacity="0.85"/>
          <polygon points="45,100 66,130 62,120" fill="#ff8800" opacity="0.8"/>
          <polygon points="45,100 45,140 41,132" fill="#ff8800" opacity="0.8"/>
          <polygon points="45,100 24,128 28,120" fill="#ff8800" opacity="0.8"/>
          <polygon points="45,100 10,100 18,104" fill="#ffcc00" opacity="0.85"/>
          <polygon points="45,100 22,72 28,80" fill="#ffff44" opacity="0.85"/>
          <!-- core glow -->
          <circle cx="45" cy="100" r="38" fill="url(#exG)"/>
        </svg>`;
        el.appendChild(explosion);

        // Arena shake at 1040ms
        window.setTimeout(() => {
          arena.style.animation = "arena-shake 220ms ease-in-out";
          window.setTimeout(() => { arena.style.animation = ""; }, 230);
        }, 1040);

        arena.appendChild(el);
        window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1450);
        return;
      }

      default:
        break;
    }

    arena.appendChild(el);
    window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
  }

  // Charge FX for Einstein — an energy ball that grows near his head each tick
  function playChargeFx(activeIdx) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;

    const isLeft = activeIdx === 0;

    // Track charge tick count via a data attribute on the arena
    const tickKey = "data-einstein-charge";
    const tick = parseInt(arena.getAttribute(tickKey) || "0", 10) + 1;
    arena.setAttribute(tickKey, String(tick));

    // Ball grows: tick1=40px, tick2=60px
    const size = 30 + tick * 18;
    const ballLeft = isLeft ? `calc(12% - ${size / 2}px)` : "auto";
    const ballRight = isLeft ? "auto" : `calc(12% - ${size / 2}px)`;

    const el = document.createElement("div");
    el.className = "special-fx special-fx-charge-ball";
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `
      position:absolute;
      top:calc(12% - ${size / 2}px);
      left:${ballLeft};right:${ballRight};
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:radial-gradient(circle at 38% 38%,#ffffff,#ffff44 35%,#ffaa00 65%,#ff5500 100%);
      box-shadow:0 0 ${size * 0.6}px ${size * 0.3}px rgba(255,200,0,0.7),
                 0 0 ${size * 0.3}px ${size * 0.15}px rgba(255,255,100,0.9);
      z-index:6;pointer-events:none;
      animation:einstein-charge-ball 1200ms ease-out forwards;
    `;

    arena.appendChild(el);
    window.setTimeout(() => {
      if (el.isConnected) el.remove();
      // Reset tick counter after ball fades so next special starts fresh
      if (tick >= 2) arena.setAttribute(tickKey, "0");
    }, 1250);
  }

  function showCallout(text, variant) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;
    const old = arena.querySelector(".callout");
    if (old) old.remove();
    const node = document.createElement("div");
    // Optional variant class (e.g. "combo", "bighit") for styling. Falsy → plain
    // callout. Variant is whitespace-trimmed and kept simple — only one class
    // appended after the base.
    node.className = variant ? `callout ${String(variant).trim()}` : "callout";
    node.textContent = text;
    arena.appendChild(node);
    window.setTimeout(() => { if (node.isConnected) node.remove(); }, 1200);
  }

  const TUTORIAL_STEPS = [
    {
      title: "Welcome to Heritage Heroes",
      body: "You'll duel as a hero from history. The first to lose all their HP loses the match."
    },
    {
      title: "Attack and Defend",
      body: "On your turn you have three big buttons. 'Attack' deals damage. 'Defend' halves the next attack against you."
    },
    {
      title: "Your Special Move",
      body: "Each hero has a unique signature move. Powerful — but it has a cooldown after you use it."
    },
    {
      title: "Trivia Unlocks Your Special",
      body: "Every time you use your hero's Special, a trivia question about that hero pops up. Get it right and the Special fires. Get it wrong and your turn passes — try again next time. Don't worry, there's no penalty for guessing!"
    },
    {
      title: "That's it!",
      body: "Take your time. There's no clock. Click 'BEGIN' on the main menu to play."
    }
  ];

  function renderTutorial(stepIndex) {
    const step = TUTORIAL_STEPS[stepIndex];
    const isLast = stepIndex === TUTORIAL_STEPS.length - 1;
    return `
<div class="overlay">
  <div class="overlay-card">
    <h3>${Render.escapeHtml(step.title)}</h3>
    <p>${Render.escapeHtml(step.body)}</p>
    <div class="overlay-buttons">
      ${stepIndex > 0 ? `<button data-action="tutorial-prev" class="secondary">Back</button>` : ""}
      <button data-action="tutorial-skip" class="secondary">Skip</button>
      <button data-action="${isLast ? "tutorial-done" : "tutorial-next"}">${isLast ? "Done" : "Next"}</button>
    </div>
    <div class="overlay-progress">Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}</div>
  </div>
</div>`;
  }

  function renderHelp() {
    return `
<div class="overlay">
  <div class="overlay-card">
    <h3>How to Play</h3>
    <ul class="help-list">
      <li><strong>Attack</strong> — Deal damage to the opponent.</li>
      <li><strong>Defend</strong> — The next attack against you is halved.</li>
      <li><strong>Special</strong> — Your hero's signature move. Has a 3-turn cooldown.</li>
      <li>First player to reach 0 HP loses.</li>
      <li>Click your move when it's your turn. There is no timer.</li>
    </ul>
    <div class="overlay-buttons help-actions">
      <button data-action="replay-tutorial" class="secondary">&#x1F4D6; Replay Tutorial</button>
      <button data-action="close-overlay">Got it</button>
    </div>
  </div>
</div>`;
  }

  function renderHelpButton() {
    return `<button class="help-button" data-action="show-help" title="How to Play">?</button>`;
  }

  // ── "What's New" overlay ──────────────────────────────────────────────────
  // Reads state.changelog (provided by main.js) and renders the LATEST entry
  // (last item in the array) as a celebratory list. Returns "" when the
  // changelog is missing or empty so callers can safely concatenate the result.
  function renderWhatsNew(state) {
    const cl = (state && Array.isArray(state.changelog)) ? state.changelog : [];
    if (cl.length === 0) return "";
    const latest = cl[cl.length - 1];
    if (!latest || !Array.isArray(latest.changes) || latest.changes.length === 0) return "";
    const changesHtml = latest.changes.map(function (c) {
      const icon = c && c.icon ? c.icon : "";
      const title = c && c.title ? c.title : "";
      const desc = c && c.description ? c.description : "";
      return `
        <li class="whats-new-item">
          <span class="whats-new-icon">${icon}</span>
          <div class="whats-new-text">
            <strong>${Render.escapeHtml(title)}</strong>
            <p>${Render.escapeHtml(desc)}</p>
          </div>
        </li>`;
    }).join("");
    const playerName = (state && state.save && typeof state.save.playerName === "string") ? state.save.playerName : "";
    const subtitle = playerName
      ? `Welcome back, ${Render.escapeHtml(playerName)}! Here's what's new since you last played:`
      : `Welcome back! Here's what's new since you last played:`;
    return `
<div class="overlay">
  <div class="overlay-card whats-new-card">
    <div class="whats-new-header">
      <span class="whats-new-badge">NEW</span>
      <h3>${Render.escapeHtml(latest.title || "")}</h3>
    </div>
    <p class="whats-new-subtitle">${subtitle}</p>
    <ul class="whats-new-list">${changesHtml}</ul>
    <div class="overlay-buttons">
      <button data-action="dismiss-whats-new">Got it!</button>
    </div>
  </div>
</div>`;
  }

  function renderQuitConfirm(state) {
    // In arcade, "pick new heroes" restarts the ladder; in quick, it returns to char select.
    const charSelectLabel = state.mode === "arcade" ? "Pick a different hero" : "Pick new heroes";
    const arcadeWarning = (state.mode === "arcade" && state.arcade)
      ? `<div class="arcade-warning">This will end your Arcade Ladder run. You've defeated <strong>${state.arcade.defeated.length} of 6</strong> opponents &mdash; that progress will be lost.</div>`
      : `<p>What would you like to do?</p>`;
    return `
<div class="overlay">
  <div class="overlay-card">
    <h3>Quit this match?</h3>
    ${arcadeWarning}
    <div class="overlay-buttons">
      <button data-action="cancel-quit" class="secondary">Keep playing</button>
      <button data-action="quit-to-charselect" class="secondary">${Render.escapeHtml(charSelectLabel)}</button>
      <button data-action="quit-to-title">Main menu</button>
    </div>
  </div>
</div>`;
  }

  const OPTION_LABELS = ["A", "B", "C", "D"];

  function renderTriviaOverlay(state, triviaState) {
    if (!triviaState) return "";
    const hero = Heroes.byId(triviaState.heroId);
    if (!hero) return "";
    // Use the pre-picked question stashed on triviaState
    const t = {
      question: triviaState.question,
      options: triviaState.options,
      correctIndex: triviaState.correctIndex,
      explanation: triviaState.explanation
    };
    if (!t.question || !Array.isArray(t.options)) return "";

    if (triviaState.phase === "question") {
      const optionButtons = t.options.map((opt, i) => `
        <button class="trivia-option-btn" data-action="trivia-answer" data-index="${i}">
          <strong>${OPTION_LABELS[i]}.</strong> ${Render.escapeHtml(opt)}
        </button>
      `).join("");
      return `
<div class="overlay">
  <div class="overlay-card trivia-card">
    <h3>Quiz: ${Render.escapeHtml(hero.name)}</h3>
    <p class="trivia-question">${Render.escapeHtml(t.question)}</p>
    <div class="trivia-options">${optionButtons}</div>
    <div class="overlay-buttons">
      <button data-action="trivia-skip" class="secondary">Skip (turn will be lost)</button>
    </div>
  </div>
</div>`;
    }

    // phase === "result"
    const chosen = triviaState.chosenIndex;
    const correct = t.correctIndex;
    const isCorrect = chosen === correct;
    const resultClass = isCorrect ? "trivia-correct" : "trivia-wrong";
    const resultHeading = isCorrect ? "Correct!" : "Not quite.";

    const chosenText = t.options[chosen] !== undefined ? Render.escapeHtml(t.options[chosen]) : "";
    const correctText = Render.escapeHtml(t.options[correct]);

    const answerDetail = isCorrect
      ? `<p>You chose: <strong>${OPTION_LABELS[chosen]}. ${chosenText}</strong></p>`
      : `<p>You chose: <strong>${OPTION_LABELS[chosen]}. ${chosenText}</strong></p>
         <p>Correct answer: <strong>${OPTION_LABELS[correct]}. ${correctText}</strong></p>`;

    return `
<div class="overlay">
  <div class="overlay-card trivia-card">
    <h3 class="${resultClass}">${resultHeading}</h3>
    ${answerDetail}
    <p class="trivia-explanation">${Render.escapeHtml(t.explanation)}</p>
    <div class="overlay-buttons">
      <button data-action="trivia-close">${isCorrect ? "Use Special!" : "Continue"}</button>
    </div>
  </div>
</div>`;
  }

  function renderStudySession(state) {
    const study = state.study;
    const hero = Heroes.byId(study.heroId);
    const qIdx = study.questionOrder[study.currentIndex];
    const trivia = hero.trivia[qIdx];
    const qNum = study.currentIndex + 1;
    const total = study.questionOrder.length;

    const optionButtons = trivia.options.map((opt, i) => {
      let cls = "study-option";
      let disabled = "";
      if (study.lastChoice !== null) {
        disabled = "disabled";
        if (i === trivia.correctIndex) cls += " correct-answer";
        else if (i === study.lastChoice && i !== trivia.correctIndex) cls += " wrong-answer";
      }
      return `<button class="${cls}" data-action="study-answer" data-index="${i}" ${disabled}>${Render.escapeHtml(opt)}</button>`;
    }).join("");

    let feedbackPanel = "";
    if (study.lastChoice !== null) {
      const isCorrect = study.lastChoice === trivia.correctIndex;
      const isLast = study.currentIndex === total - 1;
      const nextAction = isLast ? "study-finish" : "study-next";
      const nextLabel = isLast ? "See Results" : "Next &rarr;";
      const resultClass = isCorrect ? "correct" : "wrong";
      const resultText = isCorrect
        ? "Correct!"
        : `Not quite &mdash; the answer was: ${Render.escapeHtml(trivia.options[trivia.correctIndex])}`;
      feedbackPanel = `
<div class="study-feedback ${resultClass}">
  <p class="study-feedback-result">${resultText}</p>
  <p class="study-explanation">${Render.escapeHtml(trivia.explanation)}</p>
  <button data-action="${nextAction}" class="study-next-btn">${nextLabel}</button>
</div>`;
    }

    const filledPct = Math.round((qNum / total) * 100);

    return `
<section class="screen screen-study">
  <div class="study-header">
    <h2>${Render.escapeHtml(hero.name)} &mdash; Question ${qNum} of ${total}</h2>
  </div>
  <div class="study-progress">
    <div class="study-progress-fill" style="width:${filledPct}%"></div>
  </div>
  <p class="study-question">${Render.escapeHtml(trivia.question)}</p>
  <div class="study-options">${optionButtons}</div>
  ${feedbackPanel}
  <button data-action="quit-to-title" class="back study-quit">Quit Studying</button>
</section>`;
  }

  function renderStudyResult(state) {
    const study = state.study;
    const hero = Heroes.byId(study.heroId);
    const total = study.questionOrder.length;
    const score = study.answers.reduce((acc, chosen, i) => {
      const qIdx = study.questionOrder[i];
      return acc + (chosen === hero.trivia[qIdx].correctIndex ? 1 : 0);
    }, 0);

    const isPerfect = score === total;

    let banner = "";
    if (isPerfect) {
      banner = `<div class="mastery-banner">&#x1F31F; ${Render.escapeHtml(hero.name).toUpperCase()} MASTERED! &#x1F31F;</div>`;
    } else {
      banner = `<p class="study-retry-line">Nice work &mdash; try again to master ${Render.escapeHtml(hero.name)}.</p>`;
    }

    const masteredCount = state.save && state.save.mastered
      ? Object.values(state.save.mastered).filter(Boolean).length
      : 0;

    let achievementLine = "";
    if (study.justMastered) {
      if (masteredCount === 7) {
        achievementLine = `<p class="scholar-achievement">&#x1F3C6; Achievement unlocked: Heritage Scholar! All 7 heroes mastered!</p>`;
      } else {
        achievementLine = `<p class="scholar-achievement">Achievement unlocked: ${Render.escapeHtml(hero.name)} Mastery (${masteredCount} of 7 heroes mastered)</p>`;
      }
    }

    const resultItems = study.questionOrder.map((qIdx, i) => {
      const trivia = hero.trivia[qIdx];
      const chosen = study.answers[i];
      const isCorrect = chosen === trivia.correctIndex;
      const icon = isCorrect ? "&#x2713;" : "&#x2717;";
      const cls = isCorrect ? "study-result-item correct" : "study-result-item wrong";
      const wrongLine = !isCorrect
        ? `<span class="study-result-answer">Answer: ${Render.escapeHtml(trivia.options[trivia.correctIndex])}</span>`
        : "";
      return `<div class="${cls}"><span class="study-result-icon">${icon}</span><span class="study-result-q">${Render.escapeHtml(trivia.question)}</span>${wrongLine}</div>`;
    }).join("");

    return `
<section class="screen screen-study-result">
  <h2>You got ${score} / ${total} correct.</h2>
  ${banner}
  ${achievementLine}
  <div class="study-result-grid">${resultItems}</div>
  <div class="result-buttons">
    <button data-action="study-restart">Try ${Render.escapeHtml(hero.name)} Again</button>
    <button data-action="study-another" class="secondary">Study Another Hero</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
  }

  // ── Heritage Quiz screens ─────────────────────────────────────────────────

  function renderQuiz(state) {
    const quiz = state.quiz;
    if (!quiz) return "";
    const entry = quiz.pool[quiz.currentIndex];
    if (!entry) return "";
    const hero = Heroes.byId(entry.heroId);
    if (!hero) return "";
    const trivia = hero.trivia[entry.qIdx];
    if (!trivia) return "";

    const portrait = Render.renderHero({ heroId: hero.id, pose: "idle", facing: "right" });

    const isAnswered = quiz.lastChoice !== null;
    const optionButtons = trivia.options.map((opt, i) => {
      let cls = "quiz-option";
      let disabled = "";
      if (isAnswered) {
        disabled = "disabled";
        if (i === trivia.correctIndex) cls += " correct-answer";
        else if (i === quiz.lastChoice && i !== trivia.correctIndex) cls += " wrong-answer";
      }
      return `<button class="${cls}" data-action="quiz-answer" data-index="${i}" ${disabled}>${Render.escapeHtml(opt)}</button>`;
    }).join("");

    let feedbackPanel = "";
    if (isAnswered) {
      const isCorrect = quiz.lastChoice === trivia.correctIndex;
      // If wrong, the run ended — button advances to result. If correct, continue.
      const nextAction = "quiz-continue";
      const nextLabel = quiz.finished
        ? "See Results &rarr;"
        : "Continue &rarr;";
      const resultClass = isCorrect ? "correct" : "wrong";
      const resultText = isCorrect
        ? "Correct!"
        : `Not quite &mdash; the answer was: ${Render.escapeHtml(trivia.options[trivia.correctIndex])}`;
      feedbackPanel = `
<div class="quiz-feedback ${resultClass}">
  <p class="quiz-feedback-result">${resultText}</p>
  <p class="quiz-explanation">${Render.escapeHtml(trivia.explanation)}</p>
  <button data-action="${nextAction}" class="quiz-next-btn">${nextLabel}</button>
</div>`;
    }

    const qNum = quiz.currentIndex + 1;
    const total = quiz.pool.length;

    return `
<section class="screen screen-quiz">
  <div class="quiz-header">
    <div class="quiz-portrait">${portrait}</div>
    <div class="quiz-header-info">
      <h2 class="quiz-hero-name">${Render.escapeHtml(hero.name)}</h2>
      <p class="quiz-question-meta">Question ${qNum} of ${total}</p>
    </div>
    <div class="quiz-streak" aria-label="Current streak">
      <span class="quiz-streak-flame">&#x1F525;</span>
      <span class="quiz-streak-num">${quiz.streak}</span>
    </div>
  </div>
  <p class="quiz-question">${Render.escapeHtml(trivia.question)}</p>
  <div class="quiz-options">${optionButtons}</div>
  ${feedbackPanel}
  <button data-action="quiz-quit" class="back quiz-quit">Quit Quiz</button>
</section>`;
  }

  function renderQuizResult(state) {
    const quiz = state.quiz;
    if (!quiz) return "";
    const streak = quiz.streak;
    const total = quiz.pool.length;
    const isPerfect = streak >= total;
    const save = state.save || {};
    const best = Number.isInteger(save.quizBestStreak) ? save.quizBestStreak : streak;

    let banner = "";
    if (isPerfect) {
      banner = `<div class="quiz-result-banner perfect">&#x1F31F; PERFECT QUIZ! ${streak} / ${total} &#x1F31F;</div>`;
    } else {
      banner = `<div class="quiz-result-banner">Streak ended at ${streak}</div>`;
    }

    const newBestLine = quiz.isNewBest && streak > 0
      ? `<div class="quiz-new-best">&#x1F3C6; New personal best! Previous: ${quiz.previousBest}</div>`
      : "";

    const bestLine = `<p class="quiz-best-line">Best ever: <strong>${best}</strong> in a row</p>`;

    // Recap: show the last 10 answered (or fewer). currentIndex is the index where
    // the wrong answer landed (or pool.length on perfect). Build entries up to and
    // including that question.
    const stoppedAt = isPerfect ? quiz.pool.length : quiz.currentIndex + 1;
    const startIdx = Math.max(0, stoppedAt - 10);
    const recapItems = [];
    for (let i = startIdx; i < stoppedAt; i++) {
      const entry = quiz.pool[i];
      if (!entry) continue;
      const hero = Heroes.byId(entry.heroId);
      if (!hero || !hero.trivia || !hero.trivia[entry.qIdx]) continue;
      const trivia = hero.trivia[entry.qIdx];
      const isFinalWrong = !isPerfect && i === quiz.currentIndex;
      const isCorrect = !isFinalWrong;
      const icon = isCorrect ? "&#x2713;" : "&#x2717;";
      const cls = isCorrect ? "quiz-recap-item correct" : "quiz-recap-item wrong";
      const heroLabel = `<span class="quiz-recap-hero">${Render.escapeHtml(hero.name)}</span>`;
      const wrongLine = isFinalWrong
        ? `<span class="quiz-recap-answer">Answer: ${Render.escapeHtml(trivia.options[trivia.correctIndex])}</span>`
        : "";
      recapItems.push(`<div class="${cls}"><span class="quiz-recap-icon">${icon}</span>${heroLabel}<span class="quiz-recap-q">${Render.escapeHtml(trivia.question)}</span>${wrongLine}</div>`);
    }
    const recapHtml = recapItems.length > 0
      ? `<div class="quiz-recap-grid">${recapItems.join("")}</div>`
      : "";
    const recapLabel = recapItems.length > 0
      ? `<p class="quiz-recap-label">${startIdx > 0 ? `Last ${recapItems.length} questions` : "Your answers"}</p>`
      : "";

    const confetti = (quiz.isNewBest && streak > 0) ? renderConfetti({ count: 35 }) : "";

    return `
<section class="screen screen-quiz-result">
  ${confetti}
  <h2>Heritage Quiz</h2>
  ${banner}
  ${newBestLine}
  ${bestLine}
  ${recapLabel}
  ${recapHtml}
  <div class="result-buttons">
    <button data-action="quiz-restart">Try Again</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
  }

  // ── Achievement metadata ──────────────────────────────────────────────────
  const ACHIEVEMENT_LIST = [
    { key: "firstWin",         title: "First Steps",            description: "Win your first match",                              icon: "🏅", category: "combat",  progress: null },
    { key: "arcadeChampion",   title: "Arcade Champion",        description: "Complete the Arcade Ladder",                        icon: "🏆", category: "combat",  progress: null },
    { key: "hardChampion",     title: "Hard-Mode Champion",     description: "Complete the Arcade Ladder on Hard difficulty",      icon: "💎", category: "mode",    progress: null },
    { key: "heroOfThePeople",  title: "Hero of the People",     description: "Win at least one match with every hero",            icon: "🌟", category: "combat",  progress: (save) => {
      const ph = (save.stats && save.stats.perHero) || {};
      const wonCount = Object.values(ph).filter(h => h.won >= 1).length;
      return { current: wonCount, target: 7 };
    }},
    { key: "triviaApprentice", title: "Trivia Apprentice",      description: "Answer 10 trivia questions correctly",              icon: "📚", category: "trivia",  progress: (save) => ({ current: (save.stats && save.stats.triviaCorrect) || 0, target: 10 }) },
    { key: "triviaScholar",    title: "Trivia Scholar",         description: "Answer 50 trivia questions correctly",              icon: "📖", category: "trivia",  progress: (save) => ({ current: (save.stats && save.stats.triviaCorrect) || 0, target: 50 }) },
    { key: "triviaSage",       title: "Trivia Sage",            description: "Answer 150 trivia questions correctly",             icon: "🧙", category: "trivia",  progress: (save) => ({ current: (save.stats && save.stats.triviaCorrect) || 0, target: 150 }) },
    { key: "heritageScholar",  title: "Heritage Scholar",       description: "Master all 7 heroes",                               icon: "🎓", category: "mode",    progress: (save) => {
      const masteredCount = Object.values(save.mastered || {}).filter(Boolean).length;
      return { current: masteredCount, target: 7 };
    }},
    { key: "streakOf5",        title: "Hot Streak",             description: "Answer 5 trivia questions correctly in a row",      icon: "🔥", category: "trivia",  progress: null },
    { key: "streakOf10",       title: "On Fire",                description: "Answer 10 trivia questions correctly in a row",     icon: "⚡", category: "trivia",  progress: null },
    { key: "comeback",         title: "Comeback Kid",           description: "Win a match after dropping below 20 HP",           icon: "💪", category: "combat",  progress: null },
    { key: "centurion",        title: "Centurion",              description: "Play 100 total matches",                            icon: "💯", category: "combat",  progress: (save) => ({ current: (save.stats && save.stats.matchesPlayed) || 0, target: 100 }) },
    { key: "bossSlayer",       title: "Boss Slayer",            description: "Defeat a Boss in Arcade Ladder",                   icon: "👹", category: "combat",  progress: null },
    { key: "endlessSurvivor",  title: "Survivor",               description: "Reach a 5-win streak in Endless Survival",          icon: "🥉", category: "streak",  progress: (save) => {
      const vals = Object.values(save.endlessHighScore || {});
      const max = vals.length > 0 ? Math.max(0, ...vals) : 0;
      return { current: max, target: 5 };
    }},
    { key: "endlessMarathon",  title: "Marathon",               description: "Reach a 10-win streak in Endless Survival",         icon: "🥈", category: "streak",  progress: (save) => {
      const vals = Object.values(save.endlessHighScore || {});
      const max = vals.length > 0 ? Math.max(0, ...vals) : 0;
      return { current: max, target: 10 };
    }},
    { key: "endlessLegend",    title: "Endless Legend",         description: "Reach a 20-win streak in Endless Survival",         icon: "🥇", category: "streak",  progress: (save) => {
      const vals = Object.values(save.endlessHighScore || {});
      const max = vals.length > 0 ? Math.max(0, ...vals) : 0;
      return { current: max, target: 20 };
    }},
    { key: "dailyStreak3",     title: "Daily Devoted",          description: "Complete the daily challenge 3 days in a row",      icon: "🗓️", category: "streak",  progress: (save) => {
      const daily = save.daily || { currentStreak: 0, bestStreak: 0 };
      return { current: Math.max(daily.currentStreak, daily.bestStreak), target: 3 };
    }},
    { key: "dailyStreak7",     title: "Weekly Warrior",         description: "Complete the daily challenge 7 days in a row",      icon: "📅", category: "streak",  progress: (save) => {
      const daily = save.daily || { currentStreak: 0, bestStreak: 0 };
      return { current: Math.max(daily.currentStreak, daily.bestStreak), target: 7 };
    }},
    { key: "dailyStreak30",    title: "Monthly Monk",           description: "Complete the daily challenge 30 days in a row",     icon: "🏆", category: "streak",  progress: (save) => {
      const daily = save.daily || { currentStreak: 0, bestStreak: 0 };
      return { current: Math.max(daily.currentStreak, daily.bestStreak), target: 30 };
    }},
    { key: "tournamentWinner", title: "Tournament Winner",      description: "Win a Tournament",                                  icon: "🏟️", category: "mode",    progress: (save) => ({ current: save.tournamentsWon || 0, target: 1 }) },
    { key: "tournamentMaster", title: "Tournament Master",      description: "Win 5 Tournaments",                                 icon: "🥇", category: "mode",    progress: (save) => ({ current: save.tournamentsWon || 0, target: 5 }) },
    { key: "tournamentLegend", title: "Tournament Legend",      description: "Win 20 Tournaments",                                icon: "👑", category: "mode",    progress: (save) => ({ current: save.tournamentsWon || 0, target: 20 }) },
    { key: "quizStreak5",      title: "Heritage Spark",         description: "Got 5 quiz questions correct in a row",             icon: "✨", category: "quiz",    progress: (save) => ({ current: Number.isInteger(save.quizBestStreak) ? save.quizBestStreak : 0, target: 5 }) },
    { key: "quizStreak10",     title: "Heritage Flame",         description: "Got 10 quiz questions correct in a row",            icon: "🔥", category: "quiz",    progress: (save) => ({ current: Number.isInteger(save.quizBestStreak) ? save.quizBestStreak : 0, target: 10 }) },
    { key: "quizStreak20",     title: "Heritage Beacon",        description: "Got 20 quiz questions correct in a row",            icon: "🌟", category: "quiz",    progress: (save) => ({ current: Number.isInteger(save.quizBestStreak) ? save.quizBestStreak : 0, target: 20 }) },
    { key: "questFirst",       title: "Goal Setter",            description: "Complete your first daily quest",                   icon: "📜", category: "mode",    progress: (save) => ({ current: (save.dailyQuests && save.dailyQuests.lifetimeCompleted) || 0, target: 1 }) },
    { key: "questTriple",      title: "Daily Sweep",            description: "Complete BOTH daily quests in the same day",        icon: "✨", category: "mode",    progress: null },
    { key: "questStreak7",     title: "Quest Champion",         description: "Complete BOTH daily quests for 7 days in a row",    icon: "🏅", category: "streak",  progress: (save) => ({ current: (save.dailyQuests && Math.max(save.dailyQuests.currentStreak || 0, save.dailyQuests.bestStreak || 0)) || 0, target: 7 }) }
  ];

  // ── Achievement toast queue ───────────────────────────────────────────────
  let _toastQueue = [];
  let _toastBusy  = false;

  function _drainToastQueue() {
    if (_toastBusy || _toastQueue.length === 0) return;
    const key = _toastQueue.shift();
    _toastBusy = true;
    showAchievementToast(key, () => {
      _toastBusy = false;
      _drainToastQueue();
    });
  }

  function queueAchievementToast(key) {
    _toastQueue.push(key);
    _drainToastQueue();
  }

  function showToast(message) {
    if (typeof document === "undefined") return;
    const toast = document.createElement("div");
    toast.className = "share-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("share-toast-out");
      setTimeout(() => { if (toast.isConnected) toast.remove(); }, 400);
    }, 2400);
  }

  function showAchievementToast(key, onDone) {
    if (typeof document === "undefined") { if (onDone) onDone(); return; }
    const meta = ACHIEVEMENT_LIST.find(a => a.key === key);
    if (!meta) { if (onDone) onDone(); return; }

    const el = document.createElement("div");
    el.className = "achievement-toast";
    el.innerHTML = `
      <span class="toast-icon">${meta.icon}</span>
      <div class="toast-body">
        <div class="toast-title">Achievement Unlocked: ${Render.escapeHtml(meta.title)}</div>
        <div class="toast-desc">${Render.escapeHtml(meta.description)}</div>
      </div>`;
    document.body.appendChild(el);

    // Slide in
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => { el.classList.add("toast-visible"); });
    });

    const HOLD = 3000;
    window.setTimeout(() => {
      el.classList.remove("toast-visible");
      el.addEventListener("transitionend", () => {
        if (el.isConnected) el.remove();
        if (onDone) onDone();
      }, { once: true });
      // Fallback if transitionend doesn't fire
      window.setTimeout(() => { if (el.isConnected) el.remove(); if (onDone) onDone(); }, 600);
    }, HOLD);
  }

  // ── Hall of Heroes screen ────────────────────────────────────────────────
  function renderHall(state) {
    const mastered = state.save && state.save.mastered ? state.save.mastered : {};
    const cards = Heroes.list.map(h => {
      const masteredStar = mastered[h.id] ? "&#x1F31F; " : "";
      return `
<div class="hall-hero-card" data-action="view-profile" data-hero="${h.id}">
  <div class="hall-portrait">${Render.renderHero({ heroId: h.id, pose: "idle", facing: "right" })}</div>
  <div class="hall-hero-name">${masteredStar}${Render.escapeHtml(h.name)}</div>
  <div class="era">${Render.escapeHtml(h.era)}</div>
  <button class="hall-learn-btn" data-action="view-profile" data-hero="${h.id}">Learn More</button>
</div>`;
    }).join("");

    return `
<section class="screen hall-screen">
  <h2>Hall of Heroes</h2>
  <p class="tagline">Browse each hero and learn their story.</p>
  <button data-action="open-compare" class="compare-cta">&#x2696;&#xFE0F; Compare Heroes</button>
  <div class="hall-grid">${cards}</div>
  <button data-action="goto-title" class="back">&larr; Back</button>
</section>`;
  }

  // ── Hero Comparison Tool ─────────────────────────────────────────────────
  // Two-step flow off the Hall of Heroes: compare-pick (choose Hero A then B)
  // then compare (side-by-side stats, bios, era gap, head-to-head record).

  function renderComparePick(state) {
    const selecting = (state.compare && state.compare.selecting) || 1;
    const heading = selecting === 1
      ? "Compare Heroes &mdash; pick Hero A"
      : "Compare Heroes &mdash; pick Hero B";

    const cards = Heroes.list.map(h => `
      <button class="compare-pick-card" data-action="compare-pick-hero" data-hero="${h.id}">
        <div class="compare-pick-portrait">${Render.renderHero({ heroId: h.id, pose: "idle", facing: "right" })}</div>
        <div class="compare-pick-name">${Render.escapeHtml(h.name)}</div>
        <div class="compare-pick-era">${Render.escapeHtml(h.era)}</div>
      </button>
    `).join("");

    return `
<section class="screen screen-compare-pick">
  <h2>${heading}</h2>
  <div class="compare-pick-grid">${cards}</div>
  <button data-action="compare-back-to-hall" class="back">&larr; Back to Hall</button>
</section>`;
  }

  function renderCompare(state) {
    const c = state.compare;
    if (!c || !c.picks[1] || !c.picks[2]) return "";
    const hA = Heroes.byId(c.picks[1]);
    const hB = Heroes.byId(c.picks[2]);
    if (!hA || !hB) return "";

    // Era gap calculation (rough midpoint of profile.dates ranges).
    const yearGap = _eraYearGap(hA, hB);

    // Head-to-head record (from save.matchups). Keys are "winnerId|loserId".
    const matchups = (state.save && state.save.matchups) || {};
    const aVsB = matchups[hA.id + "|" + hB.id] || { wins: 0, losses: 0 };
    const bVsA = matchups[hB.id + "|" + hA.id] || { wins: 0, losses: 0 };

    // Mastery status (Study Mode mastery stars).
    const mastered = (state.save && state.save.mastered) || {};
    const aMastered = !!mastered[hA.id];
    const bMastered = !!mastered[hB.id];

    // Per-hero stats.
    const perHero = (state.save && state.save.stats && state.save.stats.perHero) || {};
    const aStats = perHero[hA.id] || { played: 0, won: 0 };
    const bStats = perHero[hB.id] || { played: 0, won: 0 };

    // Endless best streak / arcade clear count per hero.
    const eA = (state.save && state.save.endlessHighScore && state.save.endlessHighScore[hA.id]) || 0;
    const eB = (state.save && state.save.endlessHighScore && state.save.endlessHighScore[hB.id]) || 0;
    const arA = (state.save && state.save.arcade && state.save.arcade[hA.id]) || 0;
    const arB = (state.save && state.save.arcade && state.save.arcade[hB.id]) || 0;

    const portrait = (id) => Render.renderHero({ heroId: id, pose: "idle", facing: "right" });

    // Canonical rivalry flavor — reinforces the educational thread next to
    // the era-gap line. Most pairings return null (no line rendered).
    const compareRivalry = _rivalryFor(hA.id, hB.id);
    const rivalryLine = compareRivalry
      ? `<p class="compare-rivalry">${compareRivalry.icon} <strong>${Render.escapeHtml(compareRivalry.tag)}</strong></p>`
      : "";

    const h2hTotal = aVsB.wins + aVsB.losses + bVsA.wins + bVsA.losses;
    const h2hBlock = h2hTotal > 0
      ? `<div class="compare-h2h">
           <p class="compare-h2h-label">Head-to-head when YOU control them:</p>
           <p class="compare-h2h-records">
             <span>As ${Render.escapeHtml(hA.name)}: <strong>${aVsB.wins}-${aVsB.losses}</strong> vs ${Render.escapeHtml(hB.name)}</span>
             <span>As ${Render.escapeHtml(hB.name)}: <strong>${bVsA.wins}-${bVsA.losses}</strong> vs ${Render.escapeHtml(hA.name)}</span>
           </p>
         </div>`
      : `<p class="compare-h2h-empty">No head-to-head matches yet &mdash; try this matchup in Practice!</p>`;

    return `
<section class="screen screen-compare">
  <h2>Hero Comparison</h2>
  <div class="compare-grid">
    <div class="compare-col compare-col-a">
      <div class="compare-portrait">${portrait(hA.id)}</div>
      <h3 class="compare-name">${Render.escapeHtml(hA.name)} ${aMastered ? "&#x2605;" : ""}</h3>
      <p class="compare-era">${Render.escapeHtml(hA.era)}</p>
      <p class="compare-dates">${Render.escapeHtml((hA.profile && hA.profile.dates) || "")}</p>
      <p class="compare-bio">${Render.escapeHtml(hA.bio)}</p>
    </div>
    <div class="compare-col compare-col-b">
      <div class="compare-portrait">${portrait(hB.id)}</div>
      <h3 class="compare-name">${Render.escapeHtml(hB.name)} ${bMastered ? "&#x2605;" : ""}</h3>
      <p class="compare-era">${Render.escapeHtml(hB.era)}</p>
      <p class="compare-dates">${Render.escapeHtml((hB.profile && hB.profile.dates) || "")}</p>
      <p class="compare-bio">${Render.escapeHtml(hB.bio)}</p>
    </div>
  </div>

  <div class="compare-table-wrap">
    <table class="compare-table">
      <tbody>
        <tr><th>HP</th><td>${hA.hp}</td><td>${hB.hp}</td></tr>
        <tr><th>Attack</th><td>${Render.escapeHtml(hA.moves.attack.name)} (${hA.moves.attack.damage} dmg)</td><td>${Render.escapeHtml(hB.moves.attack.name)} (${hB.moves.attack.damage} dmg)</td></tr>
        <tr><th>Defend</th><td>${Render.escapeHtml(hA.moves.defend.name)}</td><td>${Render.escapeHtml(hB.moves.defend.name)}</td></tr>
        <tr><th>Special</th><td>${Render.escapeHtml(hA.moves.special.name)}</td><td>${Render.escapeHtml(hB.moves.special.name)}</td></tr>
        <tr><th>Your matches</th><td>${aStats.played} (${aStats.won} W)</td><td>${bStats.played} (${bStats.won} W)</td></tr>
        <tr><th>Endless best</th><td>${eA || "&mdash;"}</td><td>${eB || "&mdash;"}</td></tr>
        <tr><th>Arcade wins</th><td>${arA || "&mdash;"}</td><td>${arB || "&mdash;"}</td></tr>
      </tbody>
    </table>
  </div>

  ${yearGap ? `<p class="compare-eragap">&#x1F4DC; <strong>${yearGap}</strong></p>` : ""}
  ${rivalryLine}

  ${h2hBlock}

  <div class="compare-actions">
    <button data-action="compare-restart">Compare Different Heroes</button>
    <button data-action="compare-back-to-hall" class="secondary">Back to Hall</button>
  </div>
</section>`;
  }

  // Parses hero.profile.dates (e.g., "c. 1391-1271 BCE", "1135-1204", "1898-1978",
  // "1879-1955", "5th century BCE", "d. 160 BCE") into a midpoint year and computes
  // a human-readable gap. Returns "Same year" / "~50 years apart" /
  // "About 3,000 years apart" or null if either set of dates can't be parsed.
  function _eraYearGap(heroA, heroB) {
    const yA = _midpointYear(heroA && heroA.profile && heroA.profile.dates);
    const yB = _midpointYear(heroB && heroB.profile && heroB.profile.dates);
    if (yA === null || yB === null) return null;
    const diff = Math.abs(yA - yB);
    if (diff === 0) return "Same year";
    if (diff < 100) return `~${diff} years apart`;
    if (diff < 1000) return `About ${Math.round(diff / 10) * 10} years apart`;
    // Round to nearest 100 for clarity; use thousands-grouped formatting.
    const rounded = Math.round(diff / 100) * 100;
    return `About ${rounded.toLocaleString("en-US")} years apart`;
  }

  function _midpointYear(datesStr) {
    if (typeof datesStr !== "string") return null;
    // Detect BCE/B.C.E./BC suffixes (any of: BCE, BC, B.C.E., B.C.).
    const isBCE = /\bB\.?C\.?E?\.?\b/i.test(datesStr);
    // "5th century BCE" form: parse the century number into a midpoint year.
    const centuryMatch = datesStr.match(/(\d{1,2})(?:st|nd|rd|th)\s*century/i);
    if (centuryMatch) {
      const c = parseInt(centuryMatch[1], 10);
      // Midpoint of the Nth century (-50 from its end). E.g. 5th c. = year 450.
      const mid = (c * 100) - 50;
      return isBCE ? -mid : mid;
    }
    // Otherwise capture up to four-digit numbers (years).
    const nums = datesStr.match(/\d{1,4}/g);
    if (!nums || nums.length === 0) return null;
    let start = parseInt(nums[0], 10);
    let end = nums.length >= 2 ? parseInt(nums[1], 10) : start;
    if (isBCE) { start = -start; end = -end; }
    return Math.round((start + end) / 2);
  }

  // Returns the hero's position on a 1500 BCE → present timeline as an
  // integer percentage [0..100]. Returns null if the hero or their dates
  // can't be parsed. Used by the Hero Profile overlay's era timeline.
  function _heroEraPosition(heroId) {
    const h = Heroes.byId(heroId);
    if (!h) return null;
    const y = _midpointYear(h.profile && h.profile.dates);
    if (y === null) return null;
    // Timeline range: 1500 BCE (-1500) → 2026 CE
    const minY = -1500;
    const maxY = 2026;
    if (y < minY) return 0;
    if (y > maxY) return 100;
    return Math.round(((y - minY) / (maxY - minY)) * 100);
  }

  // ── Hero Profile modal ───────────────────────────────────────────────────
  function renderProfile(state, heroId) {
    const h = Heroes.byId(heroId);
    if (!h) return "";
    const profile = h.profile || {};
    const mastered = state.save && state.save.mastered ? state.save.mastered : {};
    const perHero = (state.save && state.save.stats && state.save.stats.perHero && state.save.stats.perHero[heroId])
      ? state.save.stats.perHero[heroId]
      : { played: 0, won: 0, triviaCorrect: 0, triviaTotal: 0 };

    const trivAcc = perHero.triviaTotal > 0
      ? Math.round((perHero.triviaCorrect / perHero.triviaTotal) * 100)
      : 0;
    const masteryHtml = mastered[heroId]
      ? `<span class="profile-mastery-earned">&#x1F31F; EARNED</span>`
      : `<span class="profile-mastery-hint">Get all 20 trivia questions right in Study Mode to earn the star</span>`;

    // Extra per-hero progress lines — only shown when nonzero so a brand-new
    // save stays uncluttered. Endless best and Arcade clears are tracked in
    // separate save buckets from stats.perHero (see storage.defaults).
    const endlessBest = (state.save && state.save.endlessHighScore && state.save.endlessHighScore[heroId]) || 0;
    const arcadeWins  = (state.save && state.save.arcade && state.save.arcade[heroId]) || 0;
    const endlessLine = endlessBest > 0 ? `<div>Endless best run: <strong>${endlessBest}</strong></div>` : "";
    const arcadeLine  = arcadeWins  > 0 ? `<div>Arcade ladder clears: <strong>${arcadeWins}</strong></div>` : "";

    // Head-to-head: this hero vs each of the OTHER 6, drawn from save.matchups
    // (key format "<thisHeroId>|<opponentId>"). Only shown when at least one
    // recorded matchup exists, so a fresh save sees no empty section.
    const matchups = (state.save && state.save.matchups) || {};
    const h2hRows = [];
    for (const otherHero of Heroes.list) {
      if (otherHero.id === heroId) continue;
      const record = matchups[heroId + "|" + otherHero.id];
      if (record && (record.wins + record.losses) > 0) {
        h2hRows.push({ otherId: otherHero.id, name: otherHero.name, wins: record.wins, losses: record.losses });
      }
    }
    // Sort by total games desc (most-played first), then win rate desc as tiebreak.
    h2hRows.sort((a, b) => {
      const totalA = a.wins + a.losses;
      const totalB = b.wins + b.losses;
      if (totalA !== totalB) return totalB - totalA;
      const rateA = totalA > 0 ? a.wins / totalA : 0;
      const rateB = totalB > 0 ? b.wins / totalB : 0;
      return rateB - rateA;
    });

    let h2hSection = "";
    if (h2hRows.length > 0) {
      const rows = h2hRows.map(r => {
        const total = r.wins + r.losses;
        const pct = Math.round((r.wins / total) * 100);
        const cls = r.wins > r.losses ? "h2h-winning" : r.wins < r.losses ? "h2h-losing" : "h2h-even";
        return `<div class="profile-h2h-row ${cls}">
          <span class="profile-h2h-opp">vs ${Render.escapeHtml(r.name)}</span>
          <span class="profile-h2h-record">${r.wins}-${r.losses}</span>
          <span class="profile-h2h-pct">${pct}%</span>
        </div>`;
      }).join("");
      h2hSection = `
    <div class="profile-section">
      <h3 class="profile-section-title">Head-to-Head as ${Render.escapeHtml(h.name)}</h3>
      <div class="profile-h2h-list">${rows}</div>
    </div>`;
    }

    // Era timeline: places all 7 heroes on a 1500 BCE → present-day axis,
    // highlighting the current one. Helps players see at a glance how this
    // hero relates chronologically to the rest of the roster.
    const eraPct = _heroEraPosition(heroId);
    let eraTimeline = "";
    if (eraPct !== null) {
      const allMarkers = Heroes.list
        .map(other => ({ id: other.id, name: other.name, pct: _heroEraPosition(other.id) }))
        .filter(m => m.pct !== null)
        .map(m => {
          const isThis = m.id === heroId;
          return `<div class="era-timeline-marker ${isThis ? "active" : ""}"
                       style="left:${m.pct}%"
                       title="${Render.escapeHtml(m.name)}"></div>`;
        }).join("");
      eraTimeline = `
    <div class="profile-section">
      <h3 class="profile-section-title">Position in History</h3>
      <div class="era-timeline">
        <div class="era-timeline-axis">${allMarkers}</div>
        <div class="era-timeline-labels">
          <span>1500 BCE</span>
          <span>1 CE</span>
          <span>1000 CE</span>
          <span>Present</span>
        </div>
      </div>
    </div>`;
    }

    const portrait = Render.renderHero({ heroId: h.id, pose: "idle", facing: "right" });

    return `
<div class="overlay profile-overlay">
  <div class="overlay-card profile-card">
    <div class="profile-portrait">${portrait}</div>
    <h2 class="profile-name">${Render.escapeHtml(h.name)}</h2>
    <div class="profile-meta">
      <span class="era">${Render.escapeHtml(h.era)}</span>
      ${profile.dates ? `<span class="profile-dates">${Render.escapeHtml(profile.dates)}</span>` : ""}
    </div>
    ${profile.bio ? `<p class="profile-bio">${Render.escapeHtml(profile.bio)}</p>` : ""}
    ${profile.quote ? `<p class="profile-quote">&ldquo;${Render.escapeHtml(profile.quote)}&rdquo;</p>` : ""}

    <div class="profile-section">
      <h3 class="profile-section-title">Special Move</h3>
      <p><strong>${Render.escapeHtml(h.moves.special.name)}</strong> &mdash; ${Render.escapeHtml(h.moves.special.description)}</p>
    </div>

    <div class="profile-section">
      <h3 class="profile-section-title">Your Progress</h3>
      <div class="profile-progress">
        <div>Trivia accuracy: ${perHero.triviaCorrect}/${perHero.triviaTotal} (${trivAcc}%)</div>
        <div>Matches won: ${perHero.won} of ${perHero.played} played</div>
        ${endlessLine}
        ${arcadeLine}
        <div>Mastery: ${masteryHtml}</div>
      </div>
    </div>
    ${h2hSection}
    ${eraTimeline}

    <div class="overlay-buttons">
      <button data-action="close-profile">Close</button>
    </div>
  </div>
</div>`;
  }

  // ── Endless Survival screens ──────────────────────────────────────────────
  function renderEndlessContinue(state) {
    const e = state.endless;
    if (!e) return "";
    const nextHero = Heroes.byId(e.nextOpponentId);
    const nextPortrait = nextHero
      ? Render.renderHero({ heroId: e.nextOpponentId, pose: "idle", facing: "right" })
      : "";
    const nextName = nextHero ? Render.escapeHtml(nextHero.name) : "???";
    const healFrom = e.healInfo ? e.healInfo.from : 0;
    const healTo   = e.healInfo ? e.healInfo.to   : 0;
    return `
<section class="screen screen-endless-continue">
  <h1>Round ${e.streak} cleared!</h1>
  <div class="streak-indicator">Streak: ${e.streak}</div>

  <div class="endless-heal">
    <p>Healing 25 HP (${healFrom} &rarr; ${healTo})</p>
  </div>

  <div class="endless-next">
    <h3>Next opponent:</h3>
    <div class="next-opponent-card">
      <div class="next-opponent-portrait">${nextPortrait}</div>
      <p class="next-name">${nextName}</p>
      <p class="next-ready">ready to fight</p>
    </div>
  </div>

  <div class="endless-actions">
    <button data-action="continue-endless">Continue (Round ${e.streak + 1})</button>
    <button data-action="end-endless-run" class="secondary">End Run (Save Score)</button>
  </div>
</section>`;
  }

  function renderEndlessResult(state) {
    const e = state.endless;
    if (!e) return "";
    const heroName = (Heroes.byId(e.heroId) || { name: e.heroId }).name;
    const bestScore = (state.save && state.save.endlessHighScore && state.save.endlessHighScore[e.heroId]) || 0;
    const newBestHtml = e.isNewBest
      ? `<div class="new-best-banner">&#x1F3C6; NEW PERSONAL BEST! &#x1F3C6;</div>
         <p class="previous-best">Previous best: ${e.previousBest}</p>`
      : `<p class="previous-best">Your best with ${Render.escapeHtml(heroName)}: ${bestScore}</p>`;
    const confetti = e.isNewBest ? renderConfetti({ count: 35 }) : "";
    const downloadBtn = (state.match && state.match.winner !== null && state.match.winner !== undefined)
      ? `<button data-action="download-result-card" class="share-btn">&#x1F4F8; Download Result Card</button>`
      : "";
    return `
<section class="screen screen-endless-result">
  ${confetti}
  <h1>Run ended.</h1>
  <div class="final-streak">Final streak: ${e.streak}</div>
  ${newBestHtml}
  <div class="endless-result-actions">
    <button data-action="retry-endless">Try Again</button>
    <button data-action="share-endless" class="share-btn">&#x1F4E8; Share your streak (${e.streak})</button>
    ${downloadBtn}
    <button data-action="pick-different-hero" class="secondary">Pick Different Hero</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
  }

  // ── Stats screen ─────────────────────────────────────────────────────────
  function renderDailyAlreadyDone(state) {
    const ds = (state.save && state.save.daily)
      ? { currentStreak: state.save.daily.currentStreak, bestStreak: state.save.daily.bestStreak, lifetimeCompletions: state.save.daily.lifetimeCompletions }
      : { currentStreak: 0, bestStreak: 0, lifetimeCompletions: 0 };
    return `
<div class="overlay">
  <div class="overlay-card">
    <h3>Already done!</h3>
    <p>You've completed today's challenge. Come back tomorrow for a new one.</p>
    <div class="daily-stats-mini">
      <div>&#x1F525; Current streak: <strong>${ds.currentStreak}</strong> day${ds.currentStreak === 1 ? "" : "s"}</div>
      <div>&#x1F3C6; Best: <strong>${ds.bestStreak}</strong></div>
      <div>Total: <strong>${ds.lifetimeCompletions}</strong> challenges</div>
    </div>
    <div class="overlay-buttons">
      <button data-action="close-daily-already-done">OK</button>
    </div>
  </div>
</div>`;
  }

  function _matchupInsights(matchups) {
    const entries = Object.entries(matchups).map(function([key, record]) {
      const parts = key.split("|");
      const playerId = parts[0];
      const opponentId = parts[1];
      const total = record.wins + record.losses;
      const winRate = total > 0 ? record.wins / total : 0;
      return { playerId, opponentId, wins: record.wins, losses: record.losses, total, winRate };
    });

    const totalCount = entries.length;

    // Sort by frequency descending; take top 5
    const top = entries.slice().sort(function(a, b) { return b.total - a.total; }).slice(0, 5);

    // Best/worst require min 2 matches for stability
    const stable = entries.filter(function(e) { return e.total >= 2; });
    const best = stable.length > 0 ? stable.slice().sort(function(a, b) {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.total - a.total;
    })[0] : null;
    const worst = stable.length > 0 ? stable.slice().sort(function(a, b) {
      if (a.winRate !== b.winRate) return a.winRate - b.winRate;
      return b.total - a.total;
    })[0] : null;

    return { totalCount, top, best, worst };
  }

  // Build the 5-week calendar grid block for the Stats screen.
  function _renderDailyCalendarBlock(save, todayIso) {
    const entries = Storage.dailyCalendar(save, 35, todayIso);
    // Pad the front so the grid aligns to a Sun-Sat row.
    // entries[0] is the oldest day; figure out its weekday index (0=Sun..6=Sat).
    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const firstWeekdayIdx = WEEKDAYS.indexOf(entries[0].weekday);
    const padCount = firstWeekdayIdx >= 0 ? firstWeekdayIdx : 0;

    const headerCells = WEEKDAYS.map(function (wd) {
      return `<div class="daily-calendar-header">${wd}</div>`;
    }).join("");

    const padCells = [];
    for (let i = 0; i < padCount; i++) {
      padCells.push(`<div class="daily-calendar-cell pad" aria-hidden="true"></div>`);
    }

    const dayCells = entries.map(function (e) {
      const classes = ["daily-calendar-cell"];
      if (e.completed) classes.push("completed");
      if (e.isToday) classes.push("today");
      if (e.isFuture) classes.push("future");
      const label = e.completed
        ? `${e.monthShort} ${e.dayOfMonth} — completed`
        : `${e.monthShort} ${e.dayOfMonth} — missed`;
      return `<div class="${classes.join(" ")}" title="${Render.escapeHtml(label)}" aria-label="${Render.escapeHtml(label)}">${e.dayOfMonth}</div>`;
    }).join("");

    return `
<div class="daily-calendar">
  <p class="daily-calendar-caption">Last 5 weeks</p>
  <div class="daily-calendar-grid">
    ${headerCells}
    ${padCells.join("")}
    ${dayCells}
  </div>
  <div class="daily-calendar-legend">
    <span class="daily-calendar-legend-item"><span class="daily-calendar-swatch completed"></span>Completed</span>
    <span class="daily-calendar-legend-item"><span class="daily-calendar-swatch"></span>Missed</span>
    <span class="daily-calendar-legend-item"><span class="daily-calendar-swatch today"></span>Today</span>
  </div>
</div>`;
  }

  // Build the compact 7-day strip for the Title screen.
  function _renderDailyStrip(save, todayIso) {
    const entries = Storage.dailyCalendar(save, 6, todayIso);
    const dots = entries.map(function (e) {
      const classes = ["daily-strip-dot"];
      if (e.completed) classes.push("completed");
      if (e.isToday) classes.push("today");
      const label = e.completed
        ? `${e.weekday} ${e.monthShort} ${e.dayOfMonth} — completed`
        : `${e.weekday} ${e.monthShort} ${e.dayOfMonth} — missed`;
      return `<span class="${classes.join(" ")}" title="${Render.escapeHtml(label)}" aria-label="${Render.escapeHtml(label)}"></span>`;
    }).join("");
    return `<div class="daily-strip" aria-label="Last 7 days of daily challenges">${dots}</div>`;
  }

  function renderStats(state) {
    const save = state.save || {};
    const stats = save.stats || { matchesPlayed: 0, matchesWon: 0, triviaCorrect: 0, triviaTotal: 0, perHero: {} };
    const achievements = save.achievements || {};
    const mastered = save.mastered || {};

    const winRate = stats.matchesPlayed > 0
      ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100)
      : 0;
    const accuracy = stats.triviaTotal > 0
      ? Math.round((stats.triviaCorrect / stats.triviaTotal) * 100)
      : 0;

    const endlessScores = save.endlessHighScore || {};
    const heroRows = Heroes.list.map(h => {
      const ph = (stats.perHero && stats.perHero[h.id]) || { played: 0, won: 0, triviaCorrect: 0, triviaTotal: 0 };
      const hWinRate = ph.played > 0 ? Math.round((ph.won / ph.played) * 100) : 0;
      const hAcc     = ph.triviaTotal > 0 ? Math.round((ph.triviaCorrect / ph.triviaTotal) * 100) : 0;
      const masteredStar = mastered[h.id] ? " ⭐" : "";
      const portrait = Render.renderHero({ heroId: h.id, pose: "idle", facing: "right" });
      const endlessBest = endlessScores[h.id] || 0;
      const endlessLine = endlessBest > 0
        ? `<span>Endless Best: ${endlessBest}</span>`
        : "";
      return `
<div class="stats-hero-row">
  <div class="stats-hero-portrait">${portrait}</div>
  <div class="stats-hero-name">${Render.escapeHtml(h.name)}${masteredStar}</div>
  <div class="stats-hero-nums">
    <span>Played: ${ph.played}</span>
    <span>Won: ${ph.won} (${hWinRate}%)</span>
    <span>Trivia: ${ph.triviaCorrect}/${ph.triviaTotal} (${hAcc}%)</span>
    ${endlessLine}
  </div>
</div>`;
    }).join("");

    const unlockedCount = ACHIEVEMENT_LIST.filter(a => !!achievements[a.key]).length;

    const dailyData = save.daily || { completedDates: [], currentStreak: 0, bestStreak: 0, lifetimeCompletions: 0 };
    // Compute live current streak for display
    const _todayIsoForStats = (function () {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dy}`;
    }());
    const _completedSetForStats = new Set(dailyData.completedDates);
    let _liveStreak = 0;
    (function () {
      const d2 = new Date(_todayIsoForStats + "T12:00:00");
      while (true) {
        const y2 = d2.getFullYear();
        const m2 = String(d2.getMonth() + 1).padStart(2, "0");
        const dy2 = String(d2.getDate()).padStart(2, "0");
        const iso2 = `${y2}-${m2}-${dy2}`;
        if (!_completedSetForStats.has(iso2)) break;
        _liveStreak += 1;
        d2.setDate(d2.getDate() - 1);
      }
    }());

    return `
<section class="screen stats-screen">
  <h2>Your Heritage</h2>
  <button data-action="goto-title" class="back">&larr; Back to Menu</button>

  <div class="stats-section">
    <h3>Heritage Quiz</h3>
    <div class="stats-overall">
      <div>&#x1F9E0; Best streak: <strong>${Number.isInteger(save.quizBestStreak) ? save.quizBestStreak : 0}</strong> in a row</div>
    </div>
  </div>

  <div class="stats-section">
    <h3>Daily Challenge</h3>
    <div class="stats-overall">
      <div>&#x1F525; Current streak: <strong>${_liveStreak}</strong> day${_liveStreak === 1 ? "" : "s"}</div>
      <div>&#x1F3C6; Best streak: <strong>${dailyData.bestStreak}</strong></div>
      <div>&#x1F4C5; Lifetime completions: <strong>${dailyData.lifetimeCompletions}</strong></div>
    </div>
    ${_renderDailyCalendarBlock(save, _todayIsoForStats)}
  </div>

  <div class="stats-section">
    <h3>Overall</h3>
    <div class="stats-overall">
      <div>Matches played: <strong>${stats.matchesPlayed}</strong></div>
      <div>Matches won: <strong>${stats.matchesWon}</strong> (${winRate}% win rate)</div>
      <div>Trivia answered: <strong>${stats.triviaTotal}</strong></div>
      <div>Trivia correct: <strong>${stats.triviaCorrect}</strong> (${accuracy}% accuracy)</div>
    </div>
  </div>

  <div class="stats-section">
    <h3>Heroes</h3>
    <div class="stats-table">${heroRows}</div>
  </div>

  ${(function() {
    const matchups = save.matchups || {};
    const insights = _matchupInsights(matchups);
    if (insights.totalCount === 0) return "";
    const highlightsHtml = (insights.best || insights.worst) ? `
<div class="matchup-highlights">
  ${insights.best ? `<p class="matchup-highlight">
    <span class="matchup-highlight-icon">🏆</span>
    <span class="matchup-highlight-label">Best matchup:</span>
    <strong>${Render.escapeHtml(Heroes.byId(insights.best.playerId).name)} vs ${Render.escapeHtml(Heroes.byId(insights.best.opponentId).name)}</strong>
    (${insights.best.wins}-${insights.best.losses})
  </p>` : ""}
  ${insights.worst ? `<p class="matchup-highlight">
    <span class="matchup-highlight-icon">😬</span>
    <span class="matchup-highlight-label">Worst matchup:</span>
    <strong>${Render.escapeHtml(Heroes.byId(insights.worst.playerId).name)} vs ${Render.escapeHtml(Heroes.byId(insights.worst.opponentId).name)}</strong>
    (${insights.worst.wins}-${insights.worst.losses})
  </p>` : ""}
</div>` : "";
    const topRowsHtml = insights.top.map(function(m) {
      const playerHero = Heroes.byId(m.playerId);
      const opponentHero = Heroes.byId(m.opponentId);
      if (!playerHero || !opponentHero) return "";
      return `
<div class="matchup-row">
  <div class="matchup-portraits">
    <div class="matchup-portrait">${Render.renderHero({ heroId: m.playerId, pose: "idle", facing: "right" })}</div>
    <span class="matchup-vs">vs</span>
    <div class="matchup-portrait">${Render.renderHero({ heroId: m.opponentId, pose: "idle", facing: "left" })}</div>
  </div>
  <div class="matchup-info">
    <p class="matchup-names">${Render.escapeHtml(playerHero.name)} vs ${Render.escapeHtml(opponentHero.name)}</p>
    <p class="matchup-record">${m.wins}-${m.losses}</p>
  </div>
</div>`;
    }).join("");
    return `
<div class="stats-section stats-matchups">
  <h3>Hero Matchups</h3>
  <p class="stats-section-subtitle">${insights.totalCount} unique matchup${insights.totalCount === 1 ? "" : "s"} played</p>
  ${highlightsHtml}
  <p class="matchup-top-label">Top Matchups by Frequency</p>
  <div class="matchup-list">${topRowsHtml}</div>
</div>`;
  })()}

  <div class="stats-section stats-trophy-summary">
    <h3>Achievements</h3>
    <p class="trophy-summary-count">${unlockedCount} of ${ACHIEVEMENT_LIST.length} unlocked</p>
    <button data-action="open-trophy-room">&#x1F3C6; View Trophy Room &rarr;</button>
  </div>

  <div class="stats-section danger-zone">
    <h3>Danger Zone</h3>
    <p>Reset all stats and achievements. This cannot be undone.</p>
    <button data-action="confirm-reset-stats" class="secondary">Reset All Stats</button>
  </div>

  <button data-action="goto-title" class="back">&larr; Back to Menu</button>
</section>`;
  }

  // ── Trophy Room ───────────────────────────────────────────────────────────

  function _formatTrophyDate(epoch) {
    if (!epoch || epoch <= 1) return null;
    const d = new Date(epoch);
    const today = new Date();
    if (d.getFullYear() === today.getFullYear() &&
        d.getMonth()    === today.getMonth() &&
        d.getDate()     === today.getDate()) {
      return "Today";
    }
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }

  function _renderTrophyCard(a, save) {
    const rawVal  = save.achievements[a.key];
    const isUnlocked = !!rawVal;
    const cls = isUnlocked ? "trophy-card unlocked" : "trophy-card locked";

    let statusHtml;
    if (isUnlocked) {
      const dateStr = _formatTrophyDate(rawVal);
      statusHtml = `<p class="trophy-status">&#x2713; Unlocked${dateStr ? " " + dateStr : ""}</p>`;
    } else if (a.progress) {
      const prog = a.progress(save);
      if (prog) {
        const pct = Math.min(100, Math.round(prog.current / prog.target * 100));
        statusHtml = `
<div class="trophy-progress">
  <div class="trophy-progress-bar"><div class="trophy-progress-fill" style="width:${pct}%"></div></div>
  <p class="trophy-progress-text">${prog.current} / ${prog.target}</p>
</div>`;
      } else {
        statusHtml = `<p class="trophy-locked-status">&#x1F512; Locked</p>`;
      }
    } else {
      statusHtml = `<p class="trophy-locked-status">&#x1F512; Locked</p>`;
    }

    return `
<div class="${cls}">
  <span class="trophy-category">${Render.escapeHtml(a.category)}</span>
  <div class="trophy-icon">${a.icon}</div>
  <h3 class="trophy-title">${Render.escapeHtml(a.title)}</h3>
  <p class="trophy-desc">${Render.escapeHtml(a.description)}</p>
  ${statusHtml}
</div>`;
  }

  function renderTrophyRoom(state) {
    const save = state.save || {};
    const achievements = save.achievements || {};
    const filter = state.trophyFilter || "all";
    const sort   = state.trophySort   || "recent";

    const total = ACHIEVEMENT_LIST.length;
    const unlockedCount = ACHIEVEMENT_LIST.filter(a => !!achievements[a.key]).length;

    // Filter
    let visible = ACHIEVEMENT_LIST.slice();
    if (filter === "unlocked") visible = visible.filter(a => !!achievements[a.key]);
    if (filter === "locked")   visible = visible.filter(a => !achievements[a.key]);

    // Sort
    function _progressPct(a) {
      if (!a.progress) return -1;
      const prog = a.progress(save);
      if (!prog) return -1;
      return prog.current / prog.target;
    }

    if (sort === "recent") {
      visible.sort((a, b) => {
        const av = achievements[a.key];
        const bv = achievements[b.key];
        if (!!av !== !!bv) return av ? -1 : 1;    // unlocked first
        if (av && bv) return (bv - av);           // newer timestamp first
        return _progressPct(b) - _progressPct(a); // locked: higher progress first
      });
    } else if (sort === "category") {
      visible.sort((a, b) => {
        const aUnl = !!achievements[a.key];
        const bUnl = !!achievements[b.key];
        if (aUnl !== bUnl) return aUnl ? -1 : 1;
        const catCmp = a.category.localeCompare(b.category);
        if (catCmp !== 0) return catCmp;
        return a.title.localeCompare(b.title);
      });
    } else if (sort === "progress") {
      visible.sort((a, b) => {
        const aUnl = !!achievements[a.key];
        const bUnl = !!achievements[b.key];
        if (aUnl !== bUnl) return aUnl ? -1 : 1;
        if (aUnl && bUnl) return 0;
        const ap = _progressPct(a);
        const bp = _progressPct(b);
        if (ap < 0 && bp >= 0) return 1;
        if (bp < 0 && ap >= 0) return -1;
        return bp - ap;
      });
    }

    const cards = visible.map(a => _renderTrophyCard(a, save)).join("");

    return `
<section class="screen screen-trophy-room">
  <h2>&#x1F3C6; Trophy Room</h2>
  <p class="subtitle">${unlockedCount} of ${total} unlocked</p>

  <div class="trophy-filters">
    <span class="trophy-filter-label">Show:</span>
    <button data-action="trophy-filter" data-filter="all"      class="trophy-chip ${filter === "all"      ? "active" : ""}">All (${total})</button>
    <button data-action="trophy-filter" data-filter="unlocked" class="trophy-chip ${filter === "unlocked" ? "active" : ""}">Unlocked (${unlockedCount})</button>
    <button data-action="trophy-filter" data-filter="locked"   class="trophy-chip ${filter === "locked"   ? "active" : ""}">Locked (${total - unlockedCount})</button>
  </div>

  <div class="trophy-sorts">
    <span class="trophy-filter-label">Sort:</span>
    <button data-action="trophy-sort" data-sort="recent"   class="trophy-chip ${sort === "recent"   ? "active" : ""}">Recent</button>
    <button data-action="trophy-sort" data-sort="category" class="trophy-chip ${sort === "category" ? "active" : ""}">Category</button>
    <button data-action="trophy-sort" data-sort="progress" class="trophy-chip ${sort === "progress" ? "active" : ""}">Progress</button>
  </div>

  <div class="trophy-grid">
    ${cards}
  </div>

  <button data-action="goto-title" class="back">&larr; Back</button>
</section>`;
  }

  function renderResetStatsConfirm() {
    return `
<div class="overlay">
  <div class="overlay-card">
    <h3>Reset All Stats?</h3>
    <p>This will permanently erase all match stats, trivia counts, and achievements. It cannot be undone.</p>
    <div class="overlay-buttons">
      <button data-action="cancel-reset-stats" class="secondary">Cancel</button>
      <button data-action="do-reset-stats">Reset Everything</button>
    </div>
  </div>
</div>`;
  }

  function renderSettings(state) {
    const musicOn = state.save && state.save.music;
    const sfxOn   = state.save && state.save.sfx;
    const animSpeed = (state.save && state.save.animSpeed) || "normal";
    const textSize  = (state.save && state.save.textSize)  || "normal";
    const theme     = (state.save && state.save.theme)     || "default";
    const strategyHints = (state.save && state.save.strategyHints) || "on";
    const masterVol = (state.save && Number.isInteger(state.save.masterVolume)) ? state.save.masterVolume : 100;
    const musicVol  = (state.save && Number.isInteger(state.save.musicVolume))  ? state.save.musicVolume  : 100;
    const sfxVol    = (state.save && Number.isInteger(state.save.sfxVolume))    ? state.save.sfxVolume    : 100;
    const playerName = (state.save && typeof state.save.playerName === "string") ? state.save.playerName : "";
    return `
<section class="screen screen-settings">
  <h2>Settings</h2>

  <div class="settings-group">
    <h3>Your name</h3>
    <p class="settings-help">Optional &mdash; appears in greetings and on your shareable result cards.</p>
    <input type="text" class="settings-name-input"
           data-action="set-player-name"
           maxlength="24"
           value="${Render.escapeHtml(playerName)}"
           placeholder="e.g. Grandpa, Sarah, etc."
           aria-label="Your display name" />
  </div>

  <div class="settings-group">
    <h3>Music</h3>
    <button data-action="toggle-music" class="settings-toggle ${musicOn ? "on" : "off"}">
      ${musicOn ? "ON" : "OFF"}
    </button>
    <p class="settings-help">Per-stage ambient background music during battles.</p>
  </div>

  <div class="settings-group">
    <h3>Sound Effects</h3>
    <button data-action="toggle-sfx" class="settings-toggle ${sfxOn ? "on" : "off"}">
      ${sfxOn ? "ON" : "OFF"}
    </button>
    <p class="settings-help">Move sounds, hit thuds, trivia chimes, achievement fanfares, and victory.</p>
  </div>

  <div class="settings-group">
    <h3>Volume</h3>
    <p class="settings-help">Fine-tune the audio levels. 0 acts as mute.</p>
    <div class="settings-volume-row">
      <label class="settings-volume-label" for="vol-master">Master</label>
      <input type="range" id="vol-master" min="0" max="100" value="${masterVol}"
             data-action="set-volume" data-type="master"
             class="settings-volume-slider"
             aria-label="Master volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${masterVol}" />
      <span class="settings-volume-value">${masterVol}%</span>
    </div>
    <div class="settings-volume-row">
      <label class="settings-volume-label" for="vol-music">Music</label>
      <input type="range" id="vol-music" min="0" max="100" value="${musicVol}"
             data-action="set-volume" data-type="music"
             class="settings-volume-slider"
             aria-label="Music volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${musicVol}" />
      <span class="settings-volume-value">${musicVol}%</span>
    </div>
    <div class="settings-volume-row">
      <label class="settings-volume-label" for="vol-sfx">SFX</label>
      <input type="range" id="vol-sfx" min="0" max="100" value="${sfxVol}"
             data-action="set-volume" data-type="sfx"
             class="settings-volume-slider"
             aria-label="Sound effects volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${sfxVol}" />
      <span class="settings-volume-value">${sfxVol}%</span>
    </div>
  </div>

  <div class="settings-group">
    <h3>Animation Speed</h3>
    <div class="settings-radio-group">
      <button data-action="set-anim-speed" data-speed="slow"
              class="settings-radio ${animSpeed === "slow" ? "selected" : ""}">Slow</button>
      <button data-action="set-anim-speed" data-speed="normal"
              class="settings-radio ${animSpeed === "normal" ? "selected" : ""}">Normal</button>
      <button data-action="set-anim-speed" data-speed="fast"
              class="settings-radio ${animSpeed === "fast" ? "selected" : ""}">Fast</button>
    </div>
    <p class="settings-help">Slow gives more time between AI turns. Fast cuts wait time roughly in half.</p>
  </div>

  <div class="settings-group">
    <h3>Text Size</h3>
    <div class="settings-radio-group">
      <button data-action="set-text-size" data-size="normal"
              class="settings-radio ${textSize === "normal" ? "selected" : ""}">Normal</button>
      <button data-action="set-text-size" data-size="large"
              class="settings-radio ${textSize === "large" ? "selected" : ""}">Large</button>
      <button data-action="set-text-size" data-size="xlarge"
              class="settings-radio ${textSize === "xlarge" ? "selected" : ""}">Extra Large</button>
    </div>
    <p class="settings-help">Larger text is easier to read.</p>
  </div>

  <div class="settings-group">
    <h3>Theme</h3>
    <p class="settings-help">High contrast is easier to read in bright light.</p>
    <div class="settings-radio-group">
      <button data-action="set-theme" data-theme="default"
              class="settings-radio ${theme === "default" ? "selected" : ""}">Default</button>
      <button data-action="set-theme" data-theme="high-contrast"
              class="settings-radio ${theme === "high-contrast" ? "selected" : ""}">High Contrast</button>
    </div>
  </div>

  <div class="settings-group">
    <h3>Battle hints</h3>
    <p class="settings-help">Show tactical tips during your turn (recommended for new players).</p>
    <div class="settings-radio-group">
      <button data-action="set-strategy-hints" data-value="on"
              class="settings-radio ${strategyHints === "on" ? "selected" : ""}">On</button>
      <button data-action="set-strategy-hints" data-value="off"
              class="settings-radio ${strategyHints === "off" ? "selected" : ""}">Off</button>
    </div>
  </div>

  <div class="settings-group">
    <h3>Help</h3>
    <p class="settings-help">Walk through the tutorial again any time.</p>
    <button data-action="replay-tutorial" class="settings-action-btn">&#x1F4D6; Replay Tutorial</button>
  </div>

  ${typeof Main !== "undefined" && Main.isInstallable && Main.isInstallable() ? `
  <div class="settings-group">
    <h3>Install</h3>
    <button data-action="install-app" class="settings-toggle on">&#x1F4E5; Install App</button>
    <p class="settings-help">Add to your home screen for fullscreen play and offline access.</p>
  </div>
  ` : ""}

  <div class="settings-group">
    <h3>Install on iPhone / iPad</h3>
    <p class="settings-help">In Safari, tap the Share button and choose "Add to Home Screen" to install Heritage Heroes as an app icon.</p>
  </div>

  <div class="settings-group settings-danger">
    <h3>Reset</h3>
    <button data-action="reset-all-prompt" class="settings-reset">Reset All Progress</button>
    <p class="settings-help">Wipes every save: stats, achievements, masteries, endless high scores, settings. Cannot be undone.</p>
  </div>

  <button data-action="goto-title" class="back">&larr; Back</button>
</section>`;
  }

  function renderResetAllConfirm() {
    return `
<div class="overlay">
  <div class="overlay-card">
    <h3>Reset Everything?</h3>
    <p>This wipes ALL progress including stats, mastery, achievements, endless high scores, and settings. It cannot be undone.</p>
    <div class="overlay-buttons">
      <button data-action="cancel-reset-all" class="secondary">Cancel</button>
      <button data-action="confirm-reset-all" class="danger">Yes, wipe everything</button>
    </div>
  </div>
</div>`;
  }

  function renderPauseOverlay(state) {
    return `
<div class="overlay">
  <div class="overlay-card">
    <h3>Paused</h3>
    <p class="subtitle">Take your time. The match is on hold.</p>
    <div class="overlay-buttons" style="flex-direction: column; gap: 10px;">
      <button data-action="resume-battle">&#x25B6; Resume</button>
      <button data-action="view-battle-log" class="secondary">View Match Log</button>
      <button data-action="confirm-quit" class="secondary">Quit Match</button>
    </div>
  </div>
</div>`;
  }

  function renderBattleLog(state) {
    const match = state.match;
    const log = match && match.log ? match.log : [];
    const turnNum = match ? Math.max(0, (match.turnNumber || 1) - 1) : 0;
    const lines = log.map(function (line, i) {
      return `<div class="log-line"><span class="log-num">${i + 1}.</span> ${Render.escapeHtml(line)}</div>`;
    }).join("");
    return `
<div class="overlay">
  <div class="overlay-card overlay-card-wide">
    <h3>Match Log</h3>
    <p class="subtitle">All moves so far (turn ${turnNum})</p>
    <div class="battle-log-full">
      ${lines || "<em>No moves yet.</em>"}
    </div>
    <div class="overlay-buttons">
      <button data-action="close-battle-log">&larr; Back to Pause</button>
    </div>
  </div>
</div>`;
  }

  // ── Match History helpers ────────────────────────────────────────────────────

  function _formatDate(iso) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const isToday = d.getFullYear() === now.getFullYear() &&
                      d.getMonth()    === now.getMonth() &&
                      d.getDate()     === now.getDate();
      if (isToday) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `Today ${hh}:${mm}`;
      }
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch (_) {
      return "";
    }
  }

  function _formatBiggestHit(bh) {
    if (!bh) return "—";
    return `${bh.damage} dmg on ${Render.escapeHtml(bh.targetName)} (${Render.escapeHtml(bh.moveName)})`;
  }

  const _MODE_LABELS = {
    quick: "Quick Match",
    arcade: "Arcade Ladder",
    endless: "Endless Survival"
  };

  function _renderHistoryRow(entry) {
    const winnerHeroId = entry.winnerSlot === 0 ? entry.hero0Id : entry.hero1Id;
    const winnerHero = Heroes.byId(winnerHeroId) || { name: winnerHeroId };
    const modeLabel = _MODE_LABELS[entry.mode] || entry.mode;
    const portrait0 = Render.renderHero({ heroId: entry.hero0Id, pose: "idle", facing: "right" });
    const portrait1 = Render.renderHero({ heroId: entry.hero1Id, pose: "idle", facing: "left" });
    return `
<button class="history-row" data-action="view-match-detail" data-match-id="${entry.id}">
  <div class="history-row-portraits">
    <div class="history-portrait ${entry.winnerSlot === 0 ? "winner" : "loser"}">${portrait0}</div>
    <span class="history-vs">vs</span>
    <div class="history-portrait ${entry.winnerSlot === 1 ? "winner" : "loser"}">${portrait1}</div>
  </div>
  <div class="history-row-info">
    <p class="history-result">${Render.escapeHtml(winnerHero.name)} won</p>
    <p class="history-meta">${Render.escapeHtml(modeLabel)} &middot; ${entry.turns} turns &middot; ${_formatDate(entry.date)}</p>
  </div>
</button>`;
  }

  function renderHistory(state) {
    const matches = (state.save && state.save.recentMatches) || [];
    const count = matches.length;
    return `
<section class="screen screen-history">
  <h2>Match History</h2>
  <p class="subtitle">Your last ${count} match${count === 1 ? "" : "es"}</p>
  <div class="history-list">
    ${matches.map(_renderHistoryRow).join("")}
  </div>
  <button data-action="goto-title" class="back">&larr; Back</button>
</section>`;
  }

  function renderMatchDetail(state) {
    const matches = (state.save && state.save.recentMatches) || [];
    const entry = matches.find(function (m) { return m.id === state.viewingMatchId; });
    if (!entry) {
      return `
<div class="overlay">
  <div class="overlay-card">
    <p>Match not found.</p>
    <div class="overlay-buttons">
      <button data-action="close-match-detail">Close</button>
    </div>
  </div>
</div>`;
    }
    const h0 = Heroes.byId(entry.hero0Id) || { name: entry.hero0Id };
    const h1 = Heroes.byId(entry.hero1Id) || { name: entry.hero1Id };
    const winnerHero = entry.winnerSlot === 0 ? h0 : h1;
    const loserHero  = entry.winnerSlot === 0 ? h1 : h0;
    const modeLabel  = _MODE_LABELS[entry.mode] || entry.mode;
    const logLines = (entry.log || []).map(function (line, i) {
      return `<div class="detail-log-line"><span class="log-num">${i + 1}.</span> ${Render.escapeHtml(line)}</div>`;
    }).join("");
    return `
<div class="overlay">
  <div class="overlay-card overlay-card-wide">
    <h3>${Render.escapeHtml(winnerHero.name)} defeated ${Render.escapeHtml(loserHero.name)}</h3>
    <p class="detail-mode">${Render.escapeHtml(modeLabel)} &middot; ${_formatDate(entry.date)}</p>
    <div class="detail-stats">
      <div><strong>Turns:</strong> ${entry.turns}</div>
      <div><strong>Biggest hit:</strong> ${_formatBiggestHit(entry.biggestHit)}</div>
      <div><strong>${Render.escapeHtml(h0.name)}'s specials:</strong> ${entry.specialsUsed ? entry.specialsUsed[0] : 0}</div>
      <div><strong>${Render.escapeHtml(h1.name)}'s specials:</strong> ${entry.specialsUsed ? entry.specialsUsed[1] : 0}</div>
      ${entry.triviaTotal > 0 ? `<div><strong>Trivia:</strong> ${entry.triviaCorrect}/${entry.triviaTotal} correct</div>` : ""}
    </div>
    <h4>Move Log</h4>
    <div class="detail-log">
      ${logLines || "<p>No moves recorded.</p>"}
    </div>
    <div class="overlay-buttons">
      <button data-action="close-match-detail">Close</button>
    </div>
  </div>
</div>`;
  }

  // ── Tournament screens ────────────────────────────────────────────────────

  function renderTournamentSetup(state) {
    return `
<section class="screen screen-tournament-setup">
  <h2>Tournament Setup</h2>
  <p class="subtitle">How many humans are playing?</p>
  <div class="setup-grid">
    <button data-action="tournament-set-humans" data-humans="1" class="setup-card">
      <h3>1 Human</h3>
      <p>+ 3 AI opponents. Classic solo bracket.</p>
    </button>
    <button data-action="tournament-set-humans" data-humans="2" class="setup-card">
      <h3>2 Humans</h3>
      <p>+ 2 AI. Each human gets an AI semifinal; may meet in the Final.</p>
    </button>
    <button data-action="tournament-set-humans" data-humans="3" class="setup-card">
      <h3>3 Humans</h3>
      <p>+ 1 AI. Player 1 vs Player 2 in Semi 1; Player 3 vs AI in Semi 2.</p>
    </button>
    <button data-action="tournament-set-humans" data-humans="4" class="setup-card">
      <h3>4 Humans</h3>
      <p>Full couch tournament. Two human-vs-human semis, then the Final.</p>
    </button>
  </div>
  <button data-action="goto-mode" class="back">&larr; Back</button>
</section>`;
  }

  function _tournamentHeroCard(heroId, label) {
    const h = Heroes.byId(heroId);
    if (!h) return `<div class="bracket-slot-tbd">???</div>`;
    const portrait = Render.renderHero({ heroId, pose: "idle", facing: "right" });
    const labelHtml = label ? `<span class="bracket-slot-label">${Render.escapeHtml(label)}</span>` : "";
    return `
<div class="bracket-hero-card">
  <div class="bracket-portrait">${portrait}</div>
  <span class="bracket-hero-name">${Render.escapeHtml(h.name)}</span>
  ${labelHtml}
</div>`;
  }

  function renderTournamentBracket(state) {
    const t = state.tournament;
    if (!t) return `<section class="screen screen-tournament-bracket"><p>No tournament in progress.</p></section>`;

    // Compute per-slot human labels (Player 1, Player 2, ...) or null for AI
    const humanSlotMap = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
    const humanSlots = humanSlotMap[t.humanCount] || [0];
    const slotLabel = [null, null, null, null];
    humanSlots.forEach((slotIdx, humanIdx) => {
      slotLabel[slotIdx] = `Player ${humanIdx + 1}`;
    });

    const semi1State = t.bracket.semi1Winner ? "resolved" : "active";
    const semi2State = t.bracket.semi2Winner ? "resolved" : (t.bracket.semi1Winner ? "active" : "pending");

    const semi1Resolved = !!t.bracket.semi1Winner;
    const semi2Resolved = !!t.bracket.semi2Winner;

    const slot0Winner = semi1Resolved && t.bracket.semi1WinnerSlot === 0;
    const slot1Winner = semi1Resolved && t.bracket.semi1WinnerSlot === 1;
    const slot2Winner = semi2Resolved && t.bracket.semi2WinnerSlot === 2;
    const slot3Winner = semi2Resolved && t.bracket.semi2WinnerSlot === 3;

    const slot0Class = semi1Resolved ? (slot0Winner ? "winner" : "loser") : "pending";
    const slot1Class = semi1Resolved ? (slot1Winner ? "winner" : "loser") : "pending";
    const slot2Class = semi2Resolved ? (slot2Winner ? "winner" : "loser") : "pending";
    const slot3Class = semi2Resolved ? (slot3Winner ? "winner" : "loser") : "pending";

    // Final bracket display
    const finalResolved = !!t.bracket.finalWinner;
    const finalSlot1Html = t.bracket.semi1Winner
      ? _tournamentHeroCard(t.bracket.semi1Winner, slotLabel[t.bracket.semi1WinnerSlot] || null)
      : `<div class="bracket-slot-tbd">TBD</div>`;
    const finalSlot2Html = t.bracket.semi2Winner
      ? _tournamentHeroCard(t.bracket.semi2Winner, slotLabel[t.bracket.semi2WinnerSlot] || null)
      : `<div class="bracket-slot-tbd">TBD</div>`;

    const finalSlot1WinClass = finalResolved
      ? (t.bracket.finalWinnerSlot === t.bracket.semi1WinnerSlot ? "winner" : "loser")
      : "pending";
    const finalSlot2WinClass = finalResolved
      ? (t.bracket.finalWinnerSlot === t.bracket.semi2WinnerSlot ? "winner" : "loser")
      : "pending";

    // Determine next action button
    let actionButton = "";
    if (!t.bracket.semi1Winner) {
      actionButton = `<button data-action="begin-tournament" class="big-btn">Begin Tournament</button>`;
    } else if (!t.bracket.semi2Winner) {
      actionButton = `<button data-action="continue-to-semi2" class="big-btn">Continue to Semifinal 2 &rarr;</button>`;
    } else if (!t.bracket.finalWinner) {
      actionButton = `<button data-action="continue-to-final" class="big-btn">Continue to Final &rarr;</button>`;
    }

    // Show "simulated" note only when Semi 2 was headlessly simulated (both AI)
    const semi2SimNote = (semi2Resolved && t.slotControllers[2] === "ai" && t.slotControllers[3] === "ai")
      ? `<p class="bracket-sim-note">Simulated: ${Render.escapeHtml((Heroes.byId(t.bracket.semi2Winner) || { name: t.bracket.semi2Winner }).name)} advances</p>`
      : "";

    return `
<section class="screen screen-tournament-bracket">
  <h2>Tournament</h2>
  <div class="bracket">
    <div class="bracket-match bracket-match-${semi1State}">
      <h3>Semifinal 1</h3>
      <div class="bracket-pair">
        <div class="bracket-slot ${slot0Class}">
          ${_tournamentHeroCard(t.slots[0], slotLabel[0])}
        </div>
        <span class="bracket-vs">vs</span>
        <div class="bracket-slot ${slot1Class}">
          ${_tournamentHeroCard(t.slots[1], slotLabel[1])}
        </div>
      </div>
    </div>
    <div class="bracket-match bracket-match-${semi2State}">
      <h3>Semifinal 2</h3>
      <div class="bracket-pair">
        <div class="bracket-slot ${slot2Class}">
          ${_tournamentHeroCard(t.slots[2], slotLabel[2])}
        </div>
        <span class="bracket-vs">vs</span>
        <div class="bracket-slot ${slot3Class}">
          ${_tournamentHeroCard(t.slots[3], slotLabel[3])}
        </div>
      </div>
      ${semi2SimNote}
    </div>
    <div class="bracket-match bracket-final">
      <h3>FINAL</h3>
      <div class="bracket-pair">
        <div class="bracket-slot ${finalSlot1WinClass}">
          ${finalSlot1Html}
        </div>
        <span class="bracket-vs">vs</span>
        <div class="bracket-slot ${finalSlot2WinClass}">
          ${finalSlot2Html}
        </div>
      </div>
    </div>
  </div>
  ${actionButton}
  <button data-action="goto-title" class="back">&larr; Forfeit &amp; Return</button>
</section>`;
  }

  function renderTournamentResult(state) {
    const t = state.tournament;
    if (!t) return `<section class="screen screen-tournament-result"><p>No tournament data.</p></section>`;

    const humanSlotMap = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
    const humanSlots = humanSlotMap[t.humanCount] || [0];

    // Winner identification
    if (t.bracket.finalWinner) {
      const winnerSlot = t.bracket.finalWinnerSlot;
      const winnerController = t.slotControllers ? t.slotControllers[winnerSlot] : "human";
      const winnerHeroId = t.slots[winnerSlot];
      const winnerHero = Heroes.byId(winnerHeroId);
      const winnerHeroName = winnerHero ? Render.escapeHtml(winnerHero.name) : winnerHeroId;

      // Compute which human number won (or null if AI)
      let winnerHumanNumber = null;
      if (winnerController === "human") {
        const humanIdx = humanSlots.indexOf(winnerSlot);
        winnerHumanNumber = humanIdx >= 0 ? humanIdx + 1 : 1;
      }

      const champLabel = winnerHumanNumber
        ? `Player ${winnerHumanNumber} (${winnerHeroName})`
        : `${winnerHeroName} (AI)`;
      const champText = winnerHumanNumber
        ? `Player ${winnerHumanNumber} is the Tournament Champion!`
        : `${winnerHeroName} wins the tournament!`;

      const portrait = Render.renderHero({ heroId: winnerHeroId, pose: "attack", facing: "right" });

      // Build bracket recap from actual slot data
      const semi1LoserSlot = t.bracket.semi1WinnerSlot === 0 ? 1 : 0;
      const semi2LoserSlot = t.bracket.semi2WinnerSlot === 2 ? 3 : 2;
      const finalLoserSlot = t.bracket.finalWinnerSlot === t.bracket.semi1WinnerSlot
        ? t.bracket.semi2WinnerSlot
        : t.bracket.semi1WinnerSlot;
      const semi1LoserHero = Heroes.byId(t.slots[semi1LoserSlot]);
      const semi2LoserHero = Heroes.byId(t.slots[semi2LoserSlot]);
      const finalLoserHero = Heroes.byId(t.slots[finalLoserSlot]);
      const winnerSemi1Name = semi1LoserHero ? Render.escapeHtml(semi1LoserHero.name) : "opponent";
      const winnerSemi2Name = semi2LoserHero ? Render.escapeHtml(semi2LoserHero.name) : "opponent";
      const winnerFinalName = finalLoserHero ? Render.escapeHtml(finalLoserHero.name) : "opponent";

      // Determine which semi the winner played in
      const winnerPlayedSemi1 = (winnerSlot === t.bracket.semi1WinnerSlot);
      const semiOppName = winnerPlayedSemi1 ? winnerSemi1Name : winnerSemi2Name;

      const tourneysWon = winnerHumanNumber && state.save && state.save.tournamentsWon
        ? state.save.tournamentsWon
        : null;
      const tourneysLine = tourneysWon !== null
        ? `<p class="champion-record">Tournaments won: <strong>${tourneysWon}</strong></p>`
        : "";

      return `
<section class="screen screen-tournament-result">
  ${renderConfetti({ count: 50 })}
  <div class="champion-banner">&#x1F3C6; TOURNAMENT CHAMPION! &#x1F3C6;</div>
  <div class="champion-portrait">${portrait}</div>
  <h2 class="champion-name">${winnerHeroName}</h2>
  <p class="champion-flavor">${Render.escapeHtml(champText)}</p>
  ${tourneysLine}
  <div class="bracket-recap">
    <p>Semifinal: defeated ${semiOppName}</p>
    <p>Final: defeated ${winnerFinalName}</p>
  </div>
  <div class="result-buttons">
    <button data-action="start-tournament">Play Another</button>
    ${winnerHumanNumber ? `<button data-action="share-tournament" class="share-btn">&#x1F4E8; Share this tournament</button>` : ""}
    ${state.match && state.match.winner !== null && state.match.winner !== undefined
      ? `<button data-action="download-result-card" class="share-btn">&#x1F4F8; Download Result Card</button>`
      : ""}
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
    }

    // A human was eliminated before the final
    const elimHero = Heroes.byId(t.eliminatedBy);
    const elimName = elimHero ? Render.escapeHtml(elimHero.name) : Render.escapeHtml(t.eliminatedBy || "an opponent");
    const roundLabel = t.currentMatch === "semi1" ? "Semifinals"
      : t.currentMatch === "semi2" ? "Semifinals"
      : "Final";
    const reachedFinalNote = t.currentMatch === "final"
      ? `<p class="sub">You made it to the Final.</p>`
      : "";

    return `
<section class="screen screen-tournament-result">
  <h2>Eliminated</h2>
  <p>Defeated by <strong>${elimName}</strong> in the ${roundLabel}.</p>
  ${reachedFinalNote}
  <div class="result-buttons">
    <button data-action="start-tournament">Try Again</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
  }

  // ── Heritage Timeline screen ─────────────────────────────────────────────
  const TIMELINE_ORDER = [
    { eraLabel: "Ancient Israel",  heroes: ["moses", "david"] },
    { eraLabel: "Persian Era",     heroes: ["esther"] },
    { eraLabel: "Maccabean Era",   heroes: ["judah"] },
    { eraLabel: "Medieval",        heroes: ["rambam"] },
    { eraLabel: "Modern",          heroes: ["einstein", "golda"] }
  ];

  function renderTimeline(state) {
    const mastered = state.save && state.save.mastered ? state.save.mastered : {};

    const trackHtml = TIMELINE_ORDER.map(group => {
      const heroCards = group.heroes.map(heroId => {
        const h = Heroes.byId(heroId);
        if (!h) return "";
        const isMastered = !!mastered[heroId];
        const portrait = Render.renderHero({ heroId, pose: "idle", facing: "right" });
        // Light-touch educational addition: surface the hero's signature
        // stage and its subtitle under the era line. Pure render — silently
        // skipped if the hero has no stageId or the stage isn't known.
        const stageInfo = h.stageId ? stageInfoOf(h.stageId) : null;
        const stageLine = stageInfo
          ? `<p class="timeline-stage">&#x1F4CD; ${Render.escapeHtml(stageInfo.name)} &mdash; ${Render.escapeHtml(stageInfo.subtitle)}</p>`
          : "";
        return `
<button class="timeline-hero" data-action="view-profile" data-hero="${heroId}">
  <div class="timeline-date">${Render.escapeHtml(h.profile && h.profile.dates ? h.profile.dates : "")}</div>
  <div class="timeline-portrait">${portrait}</div>
  <div class="timeline-info">
    <h3 class="timeline-name">${isMastered ? "&#x1F31F; " : ""}${Render.escapeHtml(h.name)}</h3>
    <span class="era">${Render.escapeHtml(h.era)}</span>
    ${stageLine}
    <p class="timeline-bio">${Render.escapeHtml(h.bio)}</p>
  </div>
</button>`;
      }).join("");

      return `
<div class="timeline-era">
  <h3 class="era-label">&mdash;&mdash; ${Render.escapeHtml(group.eraLabel)} &mdash;&mdash;</h3>
  ${heroCards}
</div>`;
    }).join("");

    return `
<section class="screen screen-timeline">
  <h2>Heritage Timeline</h2>
  <p class="subtitle">Seven heroes across 3,300 years of Jewish history</p>
  <div class="timeline-track">
    ${trackHtml}
  </div>
  <button data-action="goto-title" class="back">&larr; Back</button>
</section>`;
  }

  // Rich per-stage info — name, evocative subtitle, and a brief historical
  // description (3-4 sentences) shown in the optional stage-info overlay on
  // the stage-select screen. Content sourced from mainstream historical and
  // biblical references; deliberately conservative — no novel claims.
  const STAGE_INFO = {
    redsea: {
      name: "Red Sea",
      subtitle: "Where the Exodus crossed",
      description: "According to the Book of Exodus, the Israelites crossed the Red Sea on dry ground as Moses parted the waters with God's help. Pharaoh's chariots were swept away in the closing waves. The crossing marks the founding moment of the Israelite nation's liberation from slavery."
    },
    elah: {
      name: "Valley of Elah",
      subtitle: "Site of David vs Goliath",
      description: "The Valley of Elah in the Judean foothills is where, according to the Book of Samuel, the young shepherd David faced the Philistine champion Goliath. Armed only with a sling and five smooth stones, David struck the giant in the forehead and won the battle for Israel."
    },
    throne: {
      name: "Persian Throne",
      subtitle: "Esther's court in Susa",
      description: "The royal palace at Susa was the seat of the Persian Empire under King Ahasuerus (Xerxes I). Here Queen Esther risked her life to approach the king uninvited and reveal Haman's plot, leading to the deliverance of the Jewish people — commemorated each year at Purim."
    },
    temple: {
      name: "The Temple",
      subtitle: "Judah's rededicated holy place",
      description: "The Second Temple in Jerusalem was the spiritual center of Jewish life. After being desecrated by the Seleucid Greeks, Judah Maccabee and his brothers reclaimed it in 164 BCE and rededicated it — the founding miracle of Hanukkah, when a single jar of oil burned for eight days."
    },
    cordoba: {
      name: "Cordoba Study",
      subtitle: "Maimonides's Andalusian beginnings",
      description: "Cordoba, in Muslim-ruled Spain, was a thriving center of Jewish learning in the 12th century. Born here in 1138, Maimonides (Moshe ben Maimon) absorbed the city's tradition of philosophy, science, and Talmud — foundations that would shape his Mishneh Torah and Guide for the Perplexed."
    },
    knesset: {
      name: "The Knesset",
      subtitle: "Israel's parliament — Golda's stage",
      description: "The Knesset is the legislature of the State of Israel, located in Jerusalem. Golda Meir served as a member from 1949 and became Prime Minister in 1969 — the first woman to hold the office in Israel and one of the first in the world. She led the country through the Yom Kippur War of 1973."
    },
    princeton: {
      name: "Princeton Study",
      subtitle: "Einstein's American sanctuary",
      description: "Albert Einstein moved to Princeton, New Jersey in 1933, fleeing the rise of Nazism in Germany. At the Institute for Advanced Study he continued his work on a unified field theory until his death in 1955. A vocal Zionist, Einstein was offered the presidency of Israel in 1952 but declined."
    }
  };
  // Backward-compatible: existing callers pass a stageId and get back a
  // string (the human-readable stage name). Unknown ids fall through to the
  // id itself so callers stay safe even on bad data.
  function stageNameOf(stageId) {
    return (STAGE_INFO[stageId] && STAGE_INFO[stageId].name) || stageId;
  }
  // New: returns the full info object ({name, subtitle, description}) for a
  // known stage, or null. Used by the optional stage-info overlay and the
  // Heritage Timeline subtitle line.
  function stageInfoOf(stageId) {
    return STAGE_INFO[stageId] || null;
  }

  // Generates a stylized SVG card commemorating a completed match.
  // Returns the full <svg>...</svg> string ready for download as image/svg+xml,
  // or null if state lacks the data needed to render a meaningful card.
  // The SVG is self-contained: no external fonts, assets, or scripts.
  function renderVictoryCardSvg(state, opts) {
    const match = state && state.match;
    if (!match || !match.players || match.winner === null || match.winner === undefined) {
      return null;
    }

    const options = opts || {};
    const W = options.width  || 1200;
    const H = options.height || 630;  // 1.91:1 — standard social card ratio

    const winnerSlot = match.winner;
    const loserSlot  = 1 - winnerSlot;
    const winnerHero = Heroes.byId(match.players[winnerSlot].heroId);
    const loserHero  = Heroes.byId(match.players[loserSlot].heroId);
    if (!winnerHero || !loserHero) return null;

    const stageId   = match.stageId || winnerHero.stageId || "";
    const stageName = stageNameOf(stageId);
    const turns     = match.turnNumber || 0;
    const winnerHpLeft = match.players[winnerSlot].hp;

    // Title text: "VICTORY!" if human (slot 0) won vs AI, "DEFEAT!" if human
    // lost to AI, otherwise a neutral "[Hero] WINS!" for spectator / couch /
    // tournament cases where it isn't clearly "you" who won or lost.
    const c = (state && state.controllers) || [];
    const humanWon  = c[0] === "human" && c[1] === "ai" && winnerSlot === 0;
    const humanLost = c[0] === "human" && c[1] === "ai" && winnerSlot === 1;
    const titleText = humanWon  ? "VICTORY!"
                    : humanLost ? "DEFEAT!"
                    : `${winnerHero.name.toUpperCase()} WINS!`;
    const titleColor = humanWon  ? "#d4a574"   // gold
                     : humanLost ? "#c1462d"   // terracotta
                     : "#1a2a4f";              // navy

    // Render hero portraits via the existing renderHero builder. Each returns
    // a full <svg viewBox="0 0 200 200">...</svg> string. To embed them inside
    // our card we strip the outer <svg> tags and place the inner content into
    // a nested <svg> with its own position/size — SVG-in-SVG is valid.
    const winnerPortraitSvg = Render.renderHero({ heroId: winnerHero.id, pose: "idle", facing: "right" });
    const loserPortraitSvg  = Render.renderHero({ heroId: loserHero.id,  pose: "idle", facing: "left" });
    const winnerInner = winnerPortraitSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const loserInner  = loserPortraitSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

    // Layout
    const portraitW = 280;
    const portraitH = 280;
    const winnerX = W / 2 - portraitW / 2;
    const winnerY = 140;
    const loserPortraitW = 140;
    const loserPortraitH = 140;
    const loserX  = 70;
    const loserY  = H - loserPortraitH - 70;

    const escape = (s) => Render.escapeXml(s);

    // Optional player attribution — appears below the branding when the
    // player has set a display name in Settings.
    const playerName = (state && state.save && typeof state.save.playerName === "string") ? state.save.playerName : "";
    const playerLine = playerName
      ? `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-size="12" fill="#1a2a4f" opacity="0.6" font-style="italic">Played by ${escape(playerName)}</text>`
      : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Georgia, serif">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"  stop-color="#fff8e7"/>
      <stop offset="100%" stop-color="#faf3e0"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="#d4a574"/>
      <stop offset="100%" stop-color="#c1462d"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Decorative top + bottom borders -->
  <rect x="0" y="0" width="${W}" height="6" fill="url(#goldGrad)"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#goldGrad)"/>

  <!-- Big title -->
  <text x="${W / 2}" y="100" text-anchor="middle"
        font-size="96" font-weight="bold" fill="${titleColor}"
        stroke="#1a1a1a" stroke-width="3" paint-order="stroke fill"
        letter-spacing="4">${escape(titleText)}</text>

  <!-- Winner portrait (large, centered) -->
  <svg x="${winnerX}" y="${winnerY}" width="${portraitW}" height="${portraitH}" viewBox="0 0 200 200">
    ${winnerInner}
  </svg>

  <!-- Winner name + era -->
  <text x="${W / 2}" y="${winnerY + portraitH + 50}" text-anchor="middle"
        font-size="42" font-weight="bold" fill="#1a2a4f">${escape(winnerHero.name)}</text>
  <text x="${W / 2}" y="${winnerY + portraitH + 80}" text-anchor="middle"
        font-size="20" fill="#1a1a1a" opacity="0.75">${escape(winnerHero.era)}</text>

  <!-- Small loser portrait + "defeated" caption (bottom-left) -->
  <svg x="${loserX}" y="${loserY}" width="${loserPortraitW}" height="${loserPortraitH}" viewBox="0 0 200 200" opacity="0.65">
    ${loserInner}
  </svg>
  <text x="${loserX + loserPortraitW / 2}" y="${loserY + loserPortraitH + 20}"
        text-anchor="middle" font-size="14" fill="#1a1a1a" opacity="0.7">
    defeated ${escape(loserHero.name)}
  </text>

  <!-- Stage + turn count (bottom-right corner) -->
  <text x="${W - 40}" y="${H - 60}" text-anchor="end" font-size="18" fill="#1a2a4f" font-weight="bold">
    &#x1F4CD; ${escape(stageName)}
  </text>
  <text x="${W - 40}" y="${H - 30}" text-anchor="end" font-size="14" fill="#1a1a1a" opacity="0.7">
    ${turns} turns &#xb7; ${winnerHpLeft} HP remaining
  </text>

  <!-- Branding (bottom-center) -->
  <text x="${W / 2}" y="${H - 30}" text-anchor="middle" font-size="14" fill="#1a2a4f" opacity="0.7" font-style="italic">
    Heritage Heroes
  </text>
  ${playerLine}
</svg>`;
  }

  const STAGE_SELECT_HERO_ORDER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  function renderStageSelect(state) {
    const p1Hero = Heroes.byId(state.picks[1]);
    const p2Hero = Heroes.byId(state.picks[2]);
    const p1Name = p1Hero ? Render.escapeHtml(p1Hero.name) : state.picks[1];
    const p2Name = p2Hero ? Render.escapeHtml(p2Hero.name) : state.picks[2];
    const suggestedStageId = p2Hero ? p2Hero.stageId : null;

    const cards = STAGE_SELECT_HERO_ORDER.map(heroId => {
      const hero = Heroes.byId(heroId);
      if (!hero) return "";
      const isDefault = suggestedStageId && hero.stageId === suggestedStageId && heroId === state.picks[2];
      const info = stageInfoOf(hero.stageId);
      const subtitleHtml = (info && info.subtitle)
        ? `<p class="stage-subtitle">${Render.escapeHtml(info.subtitle)}</p>`
        : "";
      const stageName = stageNameOf(hero.stageId);
      // Info button is a sibling of the .stage-card button (nested buttons
      // are invalid HTML). We render it as an absolutely-positioned overlay
      // wrapping each card in a small container so the click target for
      // "view-stage-info" doesn't also fire "pick-stage".
      return `
        <div class="stage-card-wrap">
          <button class="stage-card${isDefault ? " recommended" : ""}" data-action="pick-stage" data-stage="${Render.escapeHtml(hero.stageId)}">
            ${isDefault ? '<span class="stage-recommended-badge">Suggested</span>' : ""}
            <div class="stage-thumbnail">${Stages.byId(hero.stageId)}</div>
            <p class="stage-name">${Render.escapeHtml(hero.name)}&rsquo;s ${Render.escapeHtml(stageName)}</p>
            ${subtitleHtml}
          </button>
          <button class="stage-info-btn" data-action="view-stage-info" data-stage="${Render.escapeHtml(hero.stageId)}" aria-label="Learn about ${Render.escapeHtml(stageName)}" title="Learn about ${Render.escapeHtml(stageName)}">&#x2139;</button>
        </div>`;
    }).join("");

    return `
<section class="screen screen-stage-select">
  <h2>Pick your battlefield</h2>
  <p class="subtitle">${p1Name} vs ${p2Name}</p>
  <div class="stage-grid">
    ${cards}
  </div>
  <button data-action="goto-mode" class="back">&larr; Back</button>
</section>`;
  }

  // Optional educational overlay shown when the player taps the small "ⓘ"
  // info button on a stage card. Returns "" when no stage is being viewed so
  // the render dispatcher can safely concatenate the result unconditionally.
  function renderStageInfoOverlay(state) {
    const id = state && state.viewingStageId;
    if (!id) return "";
    const info = stageInfoOf(id);
    if (!info) return "";
    const backdrop = (typeof Stages !== "undefined" && Stages && typeof Stages.byId === "function")
      ? Stages.byId(id)
      : "";
    return `
<div class="overlay">
  <div class="overlay-card stage-info-card">
    <div class="stage-info-backdrop">${backdrop}</div>
    <h2 class="stage-info-name">${Render.escapeHtml(info.name)}</h2>
    <p class="stage-info-subtitle">${Render.escapeHtml(info.subtitle)}</p>
    <p class="stage-info-desc">${Render.escapeHtml(info.description)}</p>
    <div class="overlay-buttons">
      <button data-action="close-stage-info">Close</button>
    </div>
  </div>
</div>`;
  }

  return {
    renderTitle, renderModeSelect, renderOpponentSelect, renderCharSelect, renderBattle,
    renderResult, renderTutorial, renderHelp, renderHelpButton, renderQuitConfirm,
    renderArcadeRoadmap, renderDifficultySelect, renderTriviaOverlay,
    renderStudySession, renderStudyResult, renderQuiz, renderQuizResult, renderStats, renderResetStatsConfirm,
    renderBossIntro, renderVsIntro, renderMatchEndSplash, renderHall, renderProfile,
    renderComparePick, renderCompare, _eraYearGap, _midpointYear, _heroEraPosition,
    renderEndlessContinue, renderEndlessResult,
    renderSettings, renderResetAllConfirm,
    renderPauseOverlay, renderBattleLog,
    renderHistory, renderMatchDetail,
    renderDailyAlreadyDone,
    renderWhatsNew,
    renderTimeline,
    renderTournamentSetup, renderTournamentBracket, renderTournamentResult,
    renderTrophyRoom,
    renderStageSelect,
    renderStageInfoOverlay,
    stageNameOf,
    stageInfoOf,
    renderVictoryCardSvg,
    renderHpChart,
    _renderRecapSections,  // exported for tests
    animateAction, flashHit, showDamageNumber, playAttackFx, playDefendFx,
    showCallout, playSpecialFx, playChargeFx,
    queueAchievementToast, showAchievementToast, showToast,
    ACHIEVEMENT_LIST,
    renderConfetti,
    battleStrategyHint,
    _heroSpotlightStats,  // exported for tests
    _vsIntroMatchupSummary,  // exported for tests
    _rivalryFor,  // exported for tests
    _matchElapsedString  // exported for tests
  };
})();

if (typeof module !== "undefined") module.exports = Screens;
