const Combat = (function () {
  const Heroes = (typeof require !== "undefined") ? require("./heroes.js") : window.Heroes;

  function createMatch(heroAId, heroBId) {
    const a = Heroes.byId(heroAId);
    const b = Heroes.byId(heroBId);
    if (!a) throw new Error(`unknown hero: ${heroAId}`);
    if (!b) throw new Error(`unknown hero: ${heroBId}`);
    return {
      players: [makePlayer(a), makePlayer(b)],
      activePlayer: 0,
      turnNumber: 1,
      winner: null,
      log: []
    };
  }

  function makePlayer(hero) {
    return {
      heroId: hero.id,
      hp: hero.hp,
      maxHp: hero.hp,
      specialCooldown: 0,
      statuses: {} // populated by specials and defend
    };
  }

  function applyMove(state, moveType) {
    if (state.winner !== null) return;
    const activeIdx = state.activePlayer;
    const enemyIdx = 1 - activeIdx;
    const active = state.players[activeIdx];
    const enemy = state.players[enemyIdx];
    const hero = Heroes.byId(active.heroId);

    if (moveType === "attack") {
      const dmg = hero.moves.attack.damage;
      dealDamage(state, activeIdx, enemyIdx, dmg);
      state.log.push(`${hero.name} uses ${hero.moves.attack.name}.`);
      endTurn(state);
      return;
    }
    throw new Error(`unknown move: ${moveType}`);
  }

  function dealDamage(state, fromIdx, toIdx, rawDmg) {
    const target = state.players[toIdx];
    const dmg = Math.max(0, Math.floor(rawDmg));
    target.hp = Math.max(0, target.hp - dmg);
  }

  function endTurn(state) {
    state.activePlayer = 1 - state.activePlayer;
    state.turnNumber += 1;
  }

  return { createMatch, applyMove };
})();

if (typeof module !== "undefined") module.exports = Combat;
