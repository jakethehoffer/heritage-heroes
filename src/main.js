var Main = (function () {
  const state = {
    screen: "title",        // title | mode | opponent | charselect | battle | result
    overlay: null,          // null | 'tutorial' | 'help'
    tutorialStep: 0,
    mode: null,             // 'quick' | 'arcade'
    selecting: 1,           // 1 or 2 (which player is picking)
    controllers: ["human", "ai"], // index 0 = P1 controller; index 1 = P2 or AI
    picks: { 1: null, 2: null },  // hero ids
    match: null,            // Combat state
    arcade: null,           // { playerHeroId, defeated: [], remaining: [] }
    save: null
  };

  // Stable ordering for AI's random hero pick in Quick vs AI mode
  const HERO_ORDER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  function boot() {
    const store = (typeof localStorage !== "undefined") ? localStorage : { getItem: () => null, setItem: () => {} };
    state.save = Storage.load(store);
    Sfx.setMuted(!state.save.sound);
    Sfx.preload();
    if (!state.save.tutorialSeen) state.overlay = "tutorial";
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    render();
  }

  function getStore() {
    return (typeof localStorage !== "undefined") ? localStorage : null;
  }

  function render() {
    const root = document.getElementById("root");
    let body;
    if (state.screen === "title")       body = Screens.renderTitle(state);
    else if (state.screen === "mode")   body = Screens.renderModeSelect(state);
    else if (state.screen === "opponent") body = Screens.renderOpponentSelect(state);
    else if (state.screen === "charselect") body = Screens.renderCharSelect(state);
    else if (state.screen === "battle") body = Screens.renderBattle(state);
    else if (state.screen === "result") body = Screens.renderResult(state);

    let overlay = "";
    if (state.overlay === "tutorial") overlay = Screens.renderTutorial(state.tutorialStep);
    if (state.overlay === "help")     overlay = Screens.renderHelp();
    if (state.overlay === "quit")     overlay = Screens.renderQuitConfirm(state);

    const help = state.screen !== "title" ? Screens.renderHelpButton() : "";

    root.innerHTML = body + overlay + help;
  }

  function onClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    handleAction(action, target);
  }

  function onKey(e) {
    if (state.screen !== "battle" || state.overlay) return;
    if (e.key === "1") dispatchMove("attack");
    else if (e.key === "2") dispatchMove("defend");
    else if (e.key === "3") dispatchMove("special");
  }

  function dispatchMove(move) {
    const ctl = state.controllers[state.match.activePlayer];
    if (ctl !== "human") return;
    playerMove(move);
  }

  function handleAction(action, target) {
    switch (action) {
      case "goto-title":   state.screen = "title"; state.overlay = null; render(); return;
      case "goto-mode":    state.screen = "mode"; render(); return;
      case "start-quick":  startQuick(); return;
      case "start-arcade": startArcade(); return;
      case "set-opponent": setOpponent(target.dataset.opp); return;
      case "pick-hero":    pickHero(target.dataset.hero); return;
      case "player-move":  playerMove(target.dataset.move); return;
      case "ai-step":      aiStep(); return;
      case "rematch":      rematch(); return;
      case "arcade-next":  arcadeNext(); return;
      case "arcade-retry": startArcade(); return;
      case "confirm-quit":       state.overlay = "quit"; render(); return;
      case "cancel-quit":        state.overlay = null; render(); return;
      case "quit-to-title":      quitToTitle(); return;
      case "quit-to-charselect": quitToCharSelect(); return;
      case "show-help":    state.overlay = "help"; render(); return;
      case "close-overlay": state.overlay = null; render(); return;
      case "tutorial-next": state.tutorialStep += 1; render(); return;
      case "tutorial-prev": state.tutorialStep = Math.max(0, state.tutorialStep - 1); render(); return;
      case "tutorial-skip":
      case "tutorial-done":
        state.overlay = null;
        state.tutorialStep = 0;
        state.save.tutorialSeen = true;
        Storage.save(getStore(), state.save);
        render();
        return;
      case "toggle-sound":
        state.save.sound = !state.save.sound;
        Sfx.setMuted(!state.save.sound);
        Storage.save(getStore(), state.save);
        render();
        return;
    }
  }

  function startQuick() {
    state.mode = "quick";
    state.controllers = ["human", "ai"]; // overridden by setOpponent
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.screen = "opponent";
    render();
  }

  function setOpponent(opp) {
    state.controllers = ["human", opp === "human" ? "human" : "ai"];
    state.screen = "charselect";
    render();
  }

  function startArcade() {
    state.mode = "arcade";
    state.controllers = ["human", "ai"];
    state.selecting = 1;
    state.picks = { 1: null, 2: null };
    state.arcade = null;
    state.screen = "charselect";
    render();
  }

  function pickHero(heroId) {
    state.picks[state.selecting] = heroId;

    if (state.mode === "arcade") {
      state.arcade = {
        playerHeroId: heroId,
        defeated: [],
        remaining: Combat.arcadeOrder(heroId).slice()
      };
      startNextArcadeMatch();
      return;
    }

    if (state.selecting === 1) {
      // If P2 is AI, auto-pick a random hero (not P1's choice) and start
      if (state.controllers[1] === "ai") {
        const choices = HERO_ORDER.filter(id => id !== heroId);
        state.picks[2] = choices[Math.floor(Math.random() * choices.length)];
        state.match = Combat.createMatch(state.picks[1], state.picks[2]);
        state.screen = "battle";
        render();
        return;
      }
      state.selecting = 2;
      render();
      return;
    }
    // Both human and both picked → begin
    state.match = Combat.createMatch(state.picks[1], state.picks[2]);
    state.screen = "battle";
    render();
  }

  function startNextArcadeMatch() {
    const opponent = state.arcade.remaining[0];
    state.match = Combat.createMatch(state.arcade.playerHeroId, opponent);
    state.screen = "battle";
    render();
  }

  function playerMove(move) {
    if (!state.match || state.match.winner !== null) return;
    if (state.controllers[state.match.activePlayer] !== "human") return;
    resolveMove(move);
  }

  function aiStep() {
    if (!state.match || state.match.winner !== null) return;
    const idx = state.match.activePlayer;
    if (state.controllers[idx] !== "ai" && !Combat.isCharging(state.match, idx)) return;
    const move = Combat.chooseAIMove(state.match, idx);
    resolveMove(move);
  }

  function resolveMove(move) {
    const idx = state.match.activePlayer;
    const activeHeroId = state.match.players[idx].heroId;
    const wasSpecialOrCharge = (move === "special" || move === "charge");

    // Snapshot HP before applying move so we can compute damage deltas
    const hpBefore = state.match.players.map(p => p.hp);

    try {
      Combat.applyMove(state.match, move);
    } catch (err) {
      console.warn(err);
      return;
    }

    const lastLog = state.match.log[state.match.log.length - 1] || "";
    const kind = wasSpecialOrCharge ? "special" : move;
    const isUnleash = wasSpecialOrCharge && lastLog.toLowerCase().includes("unleash");
    const isChargeTick = wasSpecialOrCharge && !isUnleash && move === "charge";

    // Compute HP deltas BEFORE re-rendering (so we use the pre/post snapshot)
    const deltas = state.match.players.map((p, i) => hpBefore[i] - p.hp);

    // CRITICAL: render BEFORE applying animations. render() does
    // root.innerHTML = ... which destroys every existing DOM node, so any
    // animation class or FX overlay applied before render() gets wiped out
    // before it can paint. Render first → fresh DOM → then animate.
    render();

    // Now apply visual feedback to the freshly-rendered DOM.
    // Note: the move name appears in the bottom move-log via renderBattle;
    // no center-of-arena callout is rendered.
    Screens.animateAction(idx, kind);
    Sfx.play(move === "attack" ? "attack" : move === "defend" ? "defend" : activeHeroId);

    if (move === "special" || isUnleash) {
      Screens.playSpecialFx(idx, activeHeroId);
    } else if (isChargeTick && activeHeroId === "einstein") {
      Screens.playChargeFx(idx);
    }

    deltas.forEach((delta, pIdx) => {
      if (delta > 0) {
        // This player took damage
        Screens.flashHit(pIdx);
        Screens.showDamageNumber(pIdx, delta, "damage");
        // Play attack slash FX on the hit target for basic attacks
        if (move === "attack") {
          Screens.playAttackFx(pIdx, activeHeroId);
        }
      } else if (delta < 0) {
        // This player was healed (negative delta = HP gained)
        Screens.showDamageNumber(pIdx, Math.abs(delta), "heal");
      }
    });

    if (move === "defend") {
      Screens.playDefendFx(idx, activeHeroId);
    }

    if (state.match.winner !== null) {
      window.setTimeout(onMatchEnd, 1500);
      return;
    }

    // Auto-trigger AI on next tick if it's their turn
    // Delays account for the full animation budget
    if (state.controllers[state.match.activePlayer] === "ai") {
      let delay;
      if (move === "special" || isUnleash) delay = 2200;
      else if (move === "defend") delay = 1500;
      else delay = 1800;
      window.setTimeout(aiStep, delay);
    }
  }

  function onMatchEnd() {
    Sfx.play("victory");
    if (state.mode === "arcade") {
      const playerSlot = state.match.players.findIndex(p => p.heroId === state.arcade.playerHeroId);
      const playerWon = state.match.winner === playerSlot;
      if (playerWon) {
        const beaten = state.arcade.remaining.shift();
        state.arcade.defeated.push(beaten);
        if (state.arcade.remaining.length === 0) {
          // Whole ladder complete
          Storage.incrementArcadeWin(getStore(), state.arcade.playerHeroId);
          state.save = Storage.load(getStore());
        }
      }
    }
    state.screen = "result";
    render();
  }

  function quitToTitle() {
    state.overlay = null;
    state.match = null;
    state.arcade = null;
    state.picks = { 1: null, 2: null };
    state.selecting = 1;
    state.screen = "title";
    render();
  }

  function quitToCharSelect() {
    // Returns to character select, preserving the current mode and controllers.
    // In arcade, this restarts the ladder (player must repick their hero).
    state.overlay = null;
    state.match = null;
    state.arcade = null;
    state.picks = { 1: null, 2: null };
    state.selecting = 1;
    state.screen = "charselect";
    render();
  }

  function rematch() {
    state.match = Combat.createMatch(state.picks[1], state.picks[2]);
    state.screen = "battle";
    render();
  }

  function arcadeNext() {
    startNextArcadeMatch();
  }

  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", boot);

  return { state, render, _testHook: { handleAction, resolveMove } };
})();

if (typeof module !== "undefined") module.exports = Main;
