var Screens = (function () {
  const Heroes = (typeof require !== "undefined") ? require("./heroes.js") : window.Heroes;
  const Render = (typeof require !== "undefined") ? require("./render.js") : window.Render;
  const Stages = (typeof require !== "undefined") ? require("./stages.js") : window.Stages;
  const Combat = (typeof require !== "undefined") ? require("./combat.js") : window.Combat;

  function renderTitle(state) {
    const stats = state.save && state.save.arcade ? state.save.arcade : {};
    const totalWins = Object.values(stats).reduce((s, n) => s + (n || 0), 0);
    return `
<section class="screen screen-title">
  <h1>Heritage Heroes</h1>
  <p class="tagline">A turn-based duel through history.</p>
  <div class="title-buttons">
    <button data-action="goto-mode">BEGIN</button>
    <button data-action="show-help" class="secondary">How to Play</button>
    <button data-action="toggle-sound" class="secondary">${state.save && state.save.sound ? "Sound: ON" : "Sound: OFF"}</button>
  </div>
  ${totalWins > 0 ? `<p class="stats">Arcade wins: ${totalWins}</p>` : ""}
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
      : (state.selecting === 1 ? "Player 1, pick your hero" : "Player 2, pick your hero");

    const cards = Heroes.list.map(h => `
      <button class="hero-card" data-action="pick-hero" data-hero="${h.id}">
        <div class="hero-portrait">${Render.renderHero({ heroId: h.id, pose: "idle", facing: "right" })}</div>
        <div class="hero-meta">
          <h3>${Render.escapeHtml(h.name)}</h3>
          <span class="era">${Render.escapeHtml(h.era)}</span>
          <p class="bio">${Render.escapeHtml(h.bio)}</p>
          <ul class="moves">
            <li><strong>${Render.escapeHtml(h.moves.attack.name)}</strong> — Basic Attack (${h.moves.attack.damage})</li>
            <li><strong>${Render.escapeHtml(h.moves.defend.name)}</strong> — Defend (halves next hit)</li>
            <li><strong>${Render.escapeHtml(h.moves.special.name)}</strong> — Special: ${Render.escapeHtml(h.moves.special.description)}</li>
          </ul>
        </div>
      </button>
    `).join("");

    return `
<section class="screen screen-charselect">
  <h2>${heading}</h2>
  <div class="hero-grid">${cards}</div>
  <button data-action="goto-mode" class="back">&larr; Back</button>
</section>`;
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

    return `
<section class="screen screen-battle">
  <div class="hp-bars">
    <div class="hp-cell">${Render.hpBar({ hp: p0.hp, max: p0.maxHp, label: h0.name, side: "left" })}</div>
    <div class="vs-label">vs</div>
    <div class="hp-cell">${Render.hpBar({ hp: p1.hp, max: p1.maxHp, label: h1.name, side: "right" })}</div>
  </div>
  <div class="arena">
    <div class="stage">${Stages.byId(defenderId)}</div>
    <div class="fighter fighter-left">${Render.renderHero({ heroId: h0.id, pose: "idle", facing: "right" })}</div>
    <div class="fighter fighter-right">${Render.renderHero({ heroId: h1.id, pose: "idle", facing: "left" })}</div>
  </div>
  <div class="turn-banner">${Render.escapeHtml(turnLabel)}</div>
  <div class="moves-row">${isHumanTurn ? moveButtons : `<button data-action="ai-step">Computer is thinking&hellip; (click)</button>`}</div>
  <div class="move-log">${match.log.slice(-5).map(l => `<div>${Render.escapeHtml(l)}</div>`).join("")}</div>
  <button data-action="confirm-quit" class="back">Quit match</button>
</section>`;
  }

  function renderMoveButtons(hero, playerState) {
    const cd = playerState.specialCooldown;
    return `
      <button data-action="player-move" data-move="attack">
        <strong>${Render.escapeHtml(hero.moves.attack.name)}</strong>
        <span class="sub">${Render.escapeHtml(hero.moves.attack.description)} (${hero.moves.attack.damage} dmg)</span>
      </button>
      <button data-action="player-move" data-move="defend">
        <strong>${Render.escapeHtml(hero.moves.defend.name)}</strong>
        <span class="sub">Halves the next incoming attack.</span>
      </button>
      <button data-action="player-move" data-move="special" ${cd > 0 ? "disabled" : ""}>
        <strong>${Render.escapeHtml(hero.moves.special.name)}</strong>
        <span class="sub">${cd > 0 ? `Ready in ${cd}` : Render.escapeHtml(hero.moves.special.description)}</span>
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

  function renderResult(state) {
    const match = state.match;
    const winnerIdx = match.winner;
    const winnerHero = Heroes.byId(match.players[winnerIdx].heroId);
    const loserHero  = Heroes.byId(match.players[1 - winnerIdx].heroId);

    if (state.mode === "arcade") {
      const playerHeroId = state.arcade.playerHeroId;
      const playerSlot = match.players.findIndex(p => p.heroId === playerHeroId);
      const playerWon = winnerIdx === playerSlot;
      if (!playerWon) {
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
        return renderArcadeEnding(playerHeroId);
      }
      return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}!</h2>
  <p class="tagline">${remaining} opponent${remaining === 1 ? "" : "s"} left.</p>
  <div class="result-buttons">
    <button data-action="arcade-next">Next Opponent</button>
    <button data-action="goto-title" class="secondary">Quit Run</button>
  </div>
</section>`;
    }

    return `
<section class="screen screen-result">
  <h2>${Render.escapeHtml(winnerHero.name)} wins!</h2>
  <p class="tagline">${Render.escapeHtml(winnerHero.name)} defeats ${Render.escapeHtml(loserHero.name)}.</p>
  <div class="result-buttons">
    <button data-action="rematch">Play Again</button>
    <button data-action="goto-title" class="secondary">Main Menu</button>
  </div>
</section>`;
  }

  function renderArcadeEnding(heroId) {
    const hero = Heroes.byId(heroId);
    const ending = ARCADE_ENDINGS[heroId] || "Victory.";
    return `
<section class="screen screen-result screen-ending">
  <h2>${Render.escapeHtml(hero.name)} prevails!</h2>
  <p class="ending">${Render.escapeHtml(ending)}</p>
  <p class="tagline">Arcade Ladder complete.</p>
  <div class="result-buttons">
    <button data-action="goto-title">Main Menu</button>
  </div>
</section>`;
  }

  function animateAction(playerIdx, kind) {
    if (typeof document === "undefined") return;
    const fighter = document.querySelector(playerIdx === 0 ? ".fighter-left" : ".fighter-right");
    if (!fighter) return;
    fighter.classList.remove("act-attack", "act-defend", "act-special");
    void fighter.offsetWidth; // force reflow to restart animation
    fighter.classList.add(`act-${kind}`);
    window.setTimeout(() => fighter.classList.remove(`act-${kind}`), 700);
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
      case "moses": {
        // Horizontal wave sweeping from Moses's side across the arena
        el.className += " special-fx-wave";
        el.style.cssText = `
          position:absolute; bottom:10%; left:${isLeft ? "0" : "auto"}; right:${isLeft ? "auto" : "0"};
          width:60%; height:30%; z-index:6; pointer-events:none;
          animation: fx-wave-sweep 1200ms ease-out forwards;
          transform-origin: ${isLeft ? "left" : "right"} center;
        `;
        el.innerHTML = `<svg viewBox="0 0 200 80" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <path d="M0,40 Q25,10 50,40 Q75,70 100,40 Q125,10 150,40 Q175,70 200,40" fill="none" stroke="#1a8cff" stroke-width="8" opacity="0.85" stroke-linecap="round"/>
          <path d="M0,50 Q25,20 50,50 Q75,80 100,50 Q125,20 150,50 Q175,80 200,50" fill="none" stroke="#5ab4ff" stroke-width="5" opacity="0.7" stroke-linecap="round"/>
        </svg>`;
        break;
      }
      case "david": {
        // Stone flying from David to opponent
        el.className += " special-fx-stone";
        el.style.cssText = `
          position:absolute; top:30%; ${isLeft ? "left:20%" : "right:20%"};
          width:20px; height:20px; border-radius:50%;
          background:#1a1a1a; border:2px solid #444;
          z-index:6; pointer-events:none;
          animation: fx-stone-fly-${activeSide} 1000ms ease-in forwards;
        `;
        break;
      }
      case "esther": {
        // Shimmering arc in front of Esther
        el.className += " special-fx-arc";
        el.style.cssText = `
          position:absolute; top:10%; ${isLeft ? "left:2%" : "right:2%"};
          width:28%; height:80%; z-index:6; pointer-events:none;
          animation: fx-arc-shimmer 1200ms ease-out forwards;
        `;
        el.innerHTML = `<svg viewBox="0 0 80 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <path d="M${isLeft ? "20,10 Q70,100 20,190" : "60,10 Q10,100 60,190"}" fill="none" stroke="${colors.gold}" stroke-width="12" opacity="0.7" stroke-linecap="round"/>
          <path d="M${isLeft ? "30,20 Q72,100 30,180" : "50,20 Q8,100 50,180"}" fill="none" stroke="#fff" stroke-width="4" opacity="0.5" stroke-linecap="round"/>
        </svg>`;
        break;
      }
      case "judah": {
        // Orange/red flame shapes on opponent's position
        el.className += " special-fx-flame";
        el.style.cssText = `
          position:absolute; bottom:5%; ${isLeft ? "right:2%" : "left:2%"};
          width:26%; height:80%; z-index:6; pointer-events:none;
          animation: fx-flame-burst 1200ms ease-out forwards;
        `;
        el.innerHTML = `<svg viewBox="0 0 80 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <path d="M40,190 Q20,160 28,130 Q18,140 22,110 Q30,120 32,100 Q38,120 42,90 Q48,120 50,100 Q54,120 58,110 Q62,140 52,130 Q60,160 40,190Z" fill="#e85520" stroke="#c1462d" stroke-width="2"/>
          <path d="M40,190 Q26,162 34,138 Q38,148 40,125 Q44,148 46,138 Q54,162 40,190Z" fill="#f5a623" opacity="0.8"/>
          <path d="M40,185 Q30,168 36,155 Q40,162 40,148 Q44,162 44,155 Q50,168 40,185Z" fill="#ffdd44" opacity="0.9"/>
        </svg>`;
        break;
      }
      case "rambam": {
        // Green/gold glow halo around Rambam
        el.className += " special-fx-halo";
        el.style.cssText = `
          position:absolute; top:5%; ${isLeft ? "left:0%" : "right:0%"};
          width:28%; height:55%; z-index:6; pointer-events:none;
          animation: fx-halo-glow 1200ms ease-out forwards;
        `;
        el.innerHTML = `<svg viewBox="0 0 100 150" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <ellipse cx="50" cy="75" rx="46" ry="68" fill="none" stroke="#44cc44" stroke-width="10" opacity="0.6"/>
          <ellipse cx="50" cy="75" rx="38" ry="58" fill="none" stroke="${colors.gold}" stroke-width="6" opacity="0.5"/>
          <ellipse cx="50" cy="75" rx="30" ry="48" fill="#44cc44" opacity="0.08"/>
        </svg>`;
        break;
      }
      case "golda": {
        // Golden aura sparkles around Golda
        el.className += " special-fx-sparkle";
        el.style.cssText = `
          position:absolute; top:0%; ${isLeft ? "left:0%" : "right:0%"};
          width:32%; height:100%; z-index:6; pointer-events:none;
          animation: fx-sparkle-aura 1200ms ease-out forwards;
        `;
        el.innerHTML = `<svg viewBox="0 0 100 240" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <!-- star sparkles -->
          <polygon points="50,10 52,16 58,16 53,20 55,26 50,22 45,26 47,20 42,16 48,16" fill="${colors.gold}" opacity="0.9"/>
          <polygon points="20,50 21.5,55 26,55 22.5,58 24,63 20,60 16,63 17.5,58 14,55 18.5,55" fill="${colors.gold}" opacity="0.8"/>
          <polygon points="80,50 81.5,55 86,55 82.5,58 84,63 80,60 76,63 77.5,58 74,55 78.5,55" fill="${colors.gold}" opacity="0.8"/>
          <polygon points="15,120 16,124 20,124 17,127 18,131 15,128 12,131 13,127 10,124 14,124" fill="${colors.gold}" opacity="0.75"/>
          <polygon points="85,120 86,124 90,124 87,127 88,131 85,128 82,131 83,127 80,124 84,124" fill="${colors.gold}" opacity="0.75"/>
          <polygon points="50,180 52,186 58,186 53,190 55,196 50,192 45,196 47,190 42,186 48,186" fill="${colors.gold}" opacity="0.85"/>
          <polygon points="30,220 31,224 35,224 32,227 33,231 30,228 27,231 28,227 25,224 29,224" fill="${colors.gold}" opacity="0.7"/>
          <polygon points="70,220 71,224 75,224 72,227 73,231 70,228 67,231 68,227 65,224 69,224" fill="${colors.gold}" opacity="0.7"/>
        </svg>`;
        break;
      }
      case "einstein": {
        // Big yellow lightning bolt streaking across arena to opponent
        el.className += " special-fx-bolt";
        el.style.cssText = `
          position:absolute; top:15%; left:0; right:0;
          height:60%; z-index:6; pointer-events:none;
          animation: fx-bolt-strike 1200ms ease-out forwards;
        `;
        el.innerHTML = `<svg viewBox="0 0 400 200" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
          <polyline points="${isLeft ? "80,20 200,90 160,100 300,180" : "320,20 200,90 240,100 100,180"}"
            fill="none" stroke="#ffdd00" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" opacity="0.95"/>
          <polyline points="${isLeft ? "80,20 200,90 160,100 300,180" : "320,20 200,90 240,100 100,180"}"
            fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>
        </svg>`;
        break;
      }
      default:
        break;
    }

    arena.appendChild(el);
    window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
  }

  // Small charge pulse FX for Einstein during charge turns
  function playChargeFx(activeIdx) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;

    const isLeft = activeIdx === 0;
    const el = document.createElement("div");
    el.className = "special-fx special-fx-charge-pulse";
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `
      position:absolute; top:5%; ${isLeft ? "left:0%" : "right:0%"};
      width:30%; height:55%; z-index:6; pointer-events:none;
      animation: fx-charge-pulse 1200ms ease-out forwards;
    `;
    const svgNS = "http://www.w3.org/2000/svg";
    el.innerHTML = `<svg viewBox="0 0 100 150" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
      <polyline points="52,10 38,70 52,70 48,140" fill="none" stroke="#ffdd00" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>
      <polyline points="52,10 38,70 52,70 48,140" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity="0.6"/>
    </svg>`;

    arena.appendChild(el);
    window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1300);
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

  return {
    renderTitle, renderModeSelect, renderOpponentSelect, renderCharSelect, renderBattle,
    renderResult, renderTutorial, renderHelp, renderHelpButton,
    animateAction, showCallout, playSpecialFx, playChargeFx
  };
})();

if (typeof module !== "undefined") module.exports = Screens;
