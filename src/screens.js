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

  // Slash flash overlay at the target fighter position — curved sword arc
  function playAttackFx(targetIdx) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;
    const svgNS = "http://www.w3.org/2000/svg";
    const xPct = targetIdx === 0 ? 6 : 72;
    const el = document.createElement("div");
    el.className = "attack-fx";
    el.style.left = `${xPct}%`;
    el.style.top = "10%";
    el.style.width = "22%";
    el.style.height = "70%";
    // Curved sword-arc slash: wide sweeping arc, fades to red at tail
    el.innerHTML = `<svg viewBox="0 0 80 160" preserveAspectRatio="none" width="100%" height="100%" xmlns="${svgNS}">
      <defs>
        <linearGradient id="slashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95"/>
          <stop offset="60%" style="stop-color:#ffffff;stop-opacity:0.8"/>
          <stop offset="100%" style="stop-color:#cc2200;stop-opacity:0.6"/>
        </linearGradient>
      </defs>
      <!-- main sword arc -->
      <path d="M10,15 Q55,60 65,145" fill="none" stroke="url(#slashGrad)" stroke-width="9" stroke-linecap="round"/>
      <!-- secondary arc shimmer -->
      <path d="M20,10 Q60,55 70,140" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
      <!-- leading edge highlight -->
      <path d="M5,25 Q45,65 55,155" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
    </svg>`;
    arena.appendChild(el);
    window.setTimeout(() => { if (el.isConnected) el.remove(); }, 360);
  }

  // Shield bubble overlay on the defending fighter — larger, more visible force-field
  function playDefendFx(playerIdx) {
    if (typeof document === "undefined") return;
    const arena = document.querySelector(".arena");
    if (!arena) return;
    const xPct = playerIdx === 0 ? 15 : 85;
    const el = document.createElement("div");
    el.className = "defend-shield";
    // top ~55% = center-mass of the fighter
    el.style.left = `${xPct}%`;
    el.style.top = "55%";
    arena.appendChild(el);
    window.setTimeout(() => { if (el.isConnected) el.remove(); }, 1350);
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
    animateAction, flashHit, showDamageNumber, playAttackFx, playDefendFx,
    showCallout, playSpecialFx, playChargeFx
  };
})();

if (typeof module !== "undefined") module.exports = Screens;
