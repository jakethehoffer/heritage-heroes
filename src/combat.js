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
    const hero = Heroes.byId(active.heroId);

    if (moveType === "attack") {
      const dmg = hero.moves.attack.damage;
      dealDamage(state, activeIdx, enemyIdx, dmg);
      state.log.push(`${hero.name} uses ${hero.moves.attack.name}.`);
      endTurn(state);
      return;
    }
    if (moveType === "defend") {
      active.statuses.defend = true;
      state.log.push(`${hero.name} uses ${hero.moves.defend.name}.`);
      endTurn(state);
      return;
    }
    throw new Error(`unknown move: ${moveType}`);
  }

  function dealDamage(state, fromIdx, toIdx, rawDmg) {
    const target = state.players[toIdx];
    let dmg = Math.max(0, Math.floor(rawDmg));
    if (target.statuses.defend) {
      dmg = Math.floor(dmg / 2);
      delete target.statuses.defend;
    }
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp === 0 && state.winner === null) {
      state.winner = fromIdx;
    }
  }

  function endTurn(state) {
    state.activePlayer = 1 - state.activePlayer;
    state.turnNumber += 1;
  }

  function isMatchOver(state) { return state.winner !== null; }

  return { createMatch, applyMove, isMatchOver };
})();

if (typeof module !== "undefined") module.exports = Combat;
