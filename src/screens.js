var Screens = (function () {
  const Heroes = (typeof require !== "undefined") ? require("./heroes.js") : window.Heroes;
  const Render = (typeof require !== "undefined") ? require("./render.js") : window.Render;
  const Stages = (typeof require !== "undefined") ? require("./stages.js") : window.Stages;
  const Combat = (typeof require !== "undefined") ? require("./combat.js") : window.Combat;

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
    const masteredCount = Object.values(mastered).filter(Boolean).length;
    let masteryLine = "";
    if (masteredCount === 7) {
      masteryLine = `<p class="scholar-banner">&#x1F31F; HERITAGE SCHOLAR &mdash; All 7 heroes mastered!</p>`;
    } else if (masteredCount > 0) {
      masteryLine = `<p class="mastered-count">&#x1F31F; Mastered: ${masteredCount} of 7 heroes</p>`;
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

    return `
<section class="screen screen-title">
  ${sparkles}
  <h1>Heritage Heroes</h1>
  <p class="tagline">A turn-based duel through history.</p>
  ${featuredPanel}
  <div class="title-buttons">
    <button data-action="goto-mode">BEGIN</button>
    <button data-action="open-hall" class="secondary">Hall of Heroes</button>
    <button data-action="view-stats" class="secondary">View Stats</button>
    <button data-action="show-help" class="secondary">How to Play</button>
    <button data-action="toggle-sound" class="secondary">${state.save && state.save.sound ? "Sound: ON" : "Sound: OFF"}</button>
  </div>
  ${totalWins > 0 ? `<p class="stats">Arcade wins: ${totalWins}</p>` : ""}
  ${masteryLine}
  ${endlessStreakLine}
</section>`;
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

  function renderCharSelect(state) {
    const heading = state.mode === "arcade"
      ? "Pick your hero for the Arcade Ladder"
      : state.mode === "study"
      ? "Pick a hero to study"
      : state.mode === "endless"
      ? "Pick a hero for your Endless run."
      : (state.selecting === 1 ? "Player 1, pick your hero" : "Player 2, pick your hero");

    const mastered = state.save && state.save.mastered ? state.save.mastered : {};

    const cards = Heroes.list.map(h => {
      const specialLine = `<strong>${Render.escapeHtml(h.moves.special.name)}</strong> — Special: ${Render.escapeHtml(h.moves.special.description)}`;
      const masteredStar = (state.mode === "study" && mastered[h.id]) ? "&#x1F31F; " : "";
      return `
      <div class="hero-card-wrap">
        <button class="hero-card" data-action="pick-hero" data-hero="${h.id}">
          <div class="hero-portrait">${Render.renderHero({ heroId: h.id, pose: "idle", facing: "right" })}</div>
          <div class="hero-meta">
            <h3>${masteredStar}${Render.escapeHtml(h.name)}</h3>
            <span class="era">${Render.escapeHtml(h.era)}</span>
            <p class="bio">${Render.escapeHtml(h.bio)}</p>
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

  function renderBattle(state) {
    const match = state.match;
    const p0 = match.players[0];
    const p1 = match.players[1];
    const h0 = Heroes.byId(p0.heroId);
    const h1 = Heroes.byId(p1.heroId);
    const defenderId = match.activePlayer === 0 ? h1.stageId : h0.stageId;
    const active = match.players[match.activePlayer];
    const activeHero = match.activePlayer === 0 ? h0 : h1;

    const charging = Combat.isCharging(match, match.activePlayer);
    const isHumanTurn = state.controllers[match.activePlayer] === "human";
    const moveButtons = charging
      ? `<button data-action="ai-step" data-move="charge">${Render.escapeHtml(activeHero.name)} is charging&hellip; (click to continue)</button>`
      : renderMoveButtons(activeHero, active);

    const turnLabel = `${activeHero.name}${state.controllers[match.activePlayer] === "ai" ? " (AI)" : (state.mode === "quick" ? ` — Player ${match.activePlayer + 1}` : "")}'s turn`;

    const arcadeRoadmapBanner = state.mode === "arcade" && state.arcade
      ? renderArcadeRoadmap(state, "compact")
      : "";

    // Boss visual treatment
    const isBoss0 = !!p0.bossTwist;
    const isBoss1 = !!p1.bossTwist;
    const label0 = isBoss0 ? `&#x1F451; BOSS ${Render.escapeHtml(h0.name)}` : Render.escapeHtml(h0.name);
    const label1 = isBoss1 ? `&#x1F451; BOSS ${Render.escapeHtml(h1.name)}` : Render.escapeHtml(h1.name);
    const fighter0Class = `fighter fighter-left${isBoss0 ? " is-boss" : ""}`;
    const fighter1Class = `fighter fighter-right${isBoss1 ? " is-boss" : ""}`;

    return `
<section class="screen screen-battle">
  ${arcadeRoadmapBanner}
  <div class="hp-bars">
    <div class="hp-cell">${Render.hpBar({ hp: p0.hp, max: p0.maxHp, label: label0, side: "left", rawLabel: true })}</div>
    <div class="vs-label">vs</div>
    <div class="hp-cell">${Render.hpBar({ hp: p1.hp, max: p1.maxHp, label: label1, side: "right", rawLabel: true })}</div>
  </div>
  <div class="arena">
    <div class="stage">${Stages.byId(defenderId)}</div>
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
  <div class="moves-row">${isHumanTurn ? moveButtons : `<button data-action="ai-step">Computer is thinking&hellip; (click)</button>`}</div>
  <div class="move-log">${match.log.slice(-5).map(l => `<div>${Render.escapeHtml(l)}</div>`).join("")}</div>
  <button data-action="confirm-quit" class="back">Quit match</button>
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

  // ── Helper: render Match Summary + Did You Know? sections ───────────────
  function _renderRecapSections(match, stats, h0, h1) {
    if (!stats) return "";
    const turns = (match.turnNumber || 1) - 1;
    const bh = stats.biggestHit;
    const biggestHitText = bh
      ? `${bh.damage} dmg on ${Render.escapeHtml(bh.targetName)} (${Render.escapeHtml(bh.moveName)})`
      : "None &mdash; no damage dealt";

    const triviaStat = stats.triviaTotal > 0
      ? `<div class="summary-row"><span class="summary-label">Trivia</span><span class="summary-value">${stats.triviaCorrect}&thinsp;/&thinsp;${stats.triviaTotal} correct</span></div>`
      : "";

    const fact = _pickDidYouKnow(h0, h1, stats);
    const portrait = Render.renderHero({ heroId: fact.hero.id, pose: "idle", facing: "right" });

    return `
<div class="match-summary">
  <h3>Match Summary</h3>
  <div class="summary-grid">
    <div class="summary-row"><span class="summary-label">Turns</span><span class="summary-value">${turns}</span></div>
    <div class="summary-row"><span class="summary-label">Biggest hit</span><span class="summary-value">${biggestHitText}</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h0.name)}'s specials</span><span class="summary-value">${stats.specialsUsed[0]}</span></div>
    <div class="summary-row"><span class="summary-label">${Render.escapeHtml(h1.name)}'s specials</span><span class="summary-value">${stats.specialsUsed[1]}</span></div>
    ${triviaStat}
  </div>
</div>
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
      const recap = _renderRecapSections(match, state.matchStats, h0, h1);
      return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}!</h2>
  <p class="tagline">${remaining} opponent${remaining === 1 ? "" : "s"} left.</p>
  ${roadmap}
  ${recap}
  <div class="result-buttons">
    <button data-action="arcade-next">Next Opponent</button>
    <button data-action="goto-title" class="secondary">Quit Run</button>
  </div>
</section>`;
    }

    const recap = _renderRecapSections(match, state.matchStats, h0, h1);
    return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} wins!</h2>
  <p class="tagline">${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}.</p>
  ${recap}
  <div class="result-buttons">
    <button data-action="rematch">Play Again</button>
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

  function showCallout(text) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;
    const old = arena.querySelector(".callout");
    if (old) old.remove();
    const node = document.createElement("div");
    node.className = "callout";
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
    <div class="overlay-buttons">
      <button data-action="close-overlay">Got it</button>
    </div>
  </div>
</div>`;
  }

  function renderHelpButton() {
    return `<button class="help-button" data-action="show-help" title="How to Play">?</button>`;
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

  // ── Achievement metadata ──────────────────────────────────────────────────
  const ACHIEVEMENT_LIST = [
    { key: "firstWin",         title: "First Steps",            description: "Win your first match",                              icon: "🏅" },
    { key: "arcadeChampion",   title: "Arcade Champion",        description: "Complete the Arcade Ladder",                        icon: "🏆" },
    { key: "hardChampion",     title: "Hard-Mode Champion",     description: "Complete the Arcade Ladder on Hard difficulty",      icon: "💎" },
    { key: "heroOfThePeople",  title: "Hero of the People",     description: "Win at least one match with every hero",            icon: "🌟" },
    { key: "triviaApprentice", title: "Trivia Apprentice",      description: "Answer 10 trivia questions correctly",              icon: "📚" },
    { key: "triviaScholar",    title: "Trivia Scholar",         description: "Answer 50 trivia questions correctly",              icon: "📖" },
    { key: "triviaSage",       title: "Trivia Sage",            description: "Answer 150 trivia questions correctly",             icon: "🧙" },
    { key: "heritageScholar",  title: "Heritage Scholar",       description: "Master all 7 heroes",                               icon: "🎓" },
    { key: "streakOf5",        title: "Hot Streak",             description: "Answer 5 trivia questions correctly in a row",      icon: "🔥" },
    { key: "streakOf10",       title: "On Fire",                description: "Answer 10 trivia questions correctly in a row",     icon: "⚡" },
    { key: "comeback",         title: "Comeback Kid",           description: "Win a match after dropping below 20 HP",           icon: "💪" },
    { key: "centurion",        title: "Centurion",              description: "Play 100 total matches",                            icon: "💯" },
    { key: "bossSlayer",       title: "Boss Slayer",            description: "Defeat a Boss in Arcade Ladder",                   icon: "👹" },
    { key: "endlessSurvivor", title: "Survivor",               description: "Reach a 5-win streak in Endless Survival",          icon: "🥉" },
    { key: "endlessMarathon", title: "Marathon",               description: "Reach a 10-win streak in Endless Survival",         icon: "🥈" },
    { key: "endlessLegend",   title: "Endless Legend",         description: "Reach a 20-win streak in Endless Survival",         icon: "🥇" }
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
  <div class="hall-grid">${cards}</div>
  <button data-action="goto-title" class="back">&larr; Back</button>
</section>`;
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
        <div>Mastery: ${masteryHtml}</div>
      </div>
    </div>

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
    return `
<section class="screen screen-endless-result">
  <h1>Run ended.</h1>
  <div class="final-streak">Final streak: ${e.streak}</div>
  ${newBestHtml}
  <div class="endless-result-actions">
    <button data-action="retry-endless">Try Again</button>
    <button data-action="pick-different-hero" class="secondary">Pick Different Hero</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
  }

  // ── Stats screen ─────────────────────────────────────────────────────────
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

    const achievementCards = ACHIEVEMENT_LIST.map(a => {
      const unlocked = !!achievements[a.key];
      const cls = unlocked ? "achievement-card" : "achievement-card locked";
      const lockOverlay = unlocked ? "" : `<div class="achievement-lock">🔒</div>`;
      return `
<div class="${cls}">
  <div class="achievement-icon">${a.icon}</div>
  <div class="achievement-title">${Render.escapeHtml(a.title)}</div>
  <div class="achievement-desc">${Render.escapeHtml(a.description)}</div>
  ${lockOverlay}
</div>`;
    }).join("");

    return `
<section class="screen stats-screen">
  <h2>Your Heritage</h2>
  <button data-action="goto-title" class="back">&larr; Back to Menu</button>

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

  <div class="stats-section">
    <h3>Achievements</h3>
    <div class="achievement-grid">${achievementCards}</div>
  </div>

  <div class="stats-section danger-zone">
    <h3>Danger Zone</h3>
    <p>Reset all stats and achievements. This cannot be undone.</p>
    <button data-action="confirm-reset-stats" class="secondary">Reset All Stats</button>
  </div>

  <button data-action="goto-title" class="back">&larr; Back to Menu</button>
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

  return {
    renderTitle, renderModeSelect, renderOpponentSelect, renderCharSelect, renderBattle,
    renderResult, renderTutorial, renderHelp, renderHelpButton, renderQuitConfirm,
    renderArcadeRoadmap, renderDifficultySelect, renderTriviaOverlay,
    renderStudySession, renderStudyResult, renderStats, renderResetStatsConfirm,
    renderBossIntro, renderHall, renderProfile,
    renderEndlessContinue, renderEndlessResult,
    animateAction, flashHit, showDamageNumber, playAttackFx, playDefendFx,
    showCallout, playSpecialFx, playChargeFx,
    queueAchievementToast, showAchievementToast,
    ACHIEVEMENT_LIST
  };
})();

if (typeof module !== "undefined") module.exports = Screens;
