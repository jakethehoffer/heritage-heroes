const Screens = (function () {
  const Heroes = (typeof require !== "undefined") ? require("./heroes.js") : window.Heroes;
  const Render = (typeof require !== "undefined") ? require("./render.js") : window.Render;
  const Stages = (typeof require !== "undefined") ? require("./stages.js") : window.Stages;
  const Combat = (typeof require !== "undefined") ? require("./combat.js") : window.Combat;

  function renderTitle(state) {
    const stats = state.save && state.save.arcade ? state.save.arcade : {};
    const totalWins = Object.values(stats).reduce((s, n) => s + (n || 0), 0);
    return `
<section class="screen screen-title">
  <h1>Jewish Heroes</h1>
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

    const turnLabel = `${activeHero.name}${state.controllers[match.activePlayer] === "ai" ? " (AI)" : (state.mode === "quick" ? ` — Player ${match.activePlayer + 1}` : "")} 's turn`;

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
  <p class="tagline">Your run ends here. ${Render.escapeHtml(playerHeroId)} fought ${state.arcade.defeated.length} of 6.</p>
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

  return { renderTitle, renderModeSelect, renderOpponentSelect, renderCharSelect, renderBattle, animateAction, showCallout, renderResult };
})();

if (typeof module !== "undefined") module.exports = Screens;
