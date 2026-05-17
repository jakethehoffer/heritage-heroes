const Main = (function () {
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
    Audio.setMuted(!state.save.sound);
    Audio.preload();
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
      case "confirm-quit": if (confirm("Quit this match?")) { state.screen = "title"; render(); } return;
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
        Audio.setMuted(!state.save.sound);
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
    try {
      Combat.applyMove(state.match, move);
    } catch (err) {
      console.warn(err);
      return;
    }
    const kind = move === "special" || move === "charge" ? "special" : move;
    Screens.animateAction(idx, kind);
    const lastLog = state.match.log[state.match.log.length - 1];
    if (lastLog) Screens.showCallout(lastLog);
    const activeHeroId = state.match.players[idx].heroId;
    Audio.play(move === "attack" ? "attack" : move === "defend" ? "defend" : activeHeroId);

    if (state.match.winner !== null) {
      window.setTimeout(onMatchEnd, 900);
      return;
    }
    render();
    // Auto-trigger AI on next tick if it's their turn
    if (state.controllers[state.match.activePlayer] === "ai" ||
        Combat.isCharging(state.match, state.match.activePlayer)) {
      window.setTimeout(aiStep, 700);
    }
  }

  function onMatchEnd() {
    Audio.play("victory");
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
