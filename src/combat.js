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

  function tickStartOfTurn(state) {
    const p = state.players[state.activePlayer];
    if (p.specialCooldown > 0) p.specialCooldown -= 1;

    if (typeof p.statuses.burn === "number" && p.statuses.burn > 0) {
      p.hp = Math.max(0, p.hp - 8);
      p.statuses.burn -= 1;
      if (p.statuses.burn === 0) delete p.statuses.burn;
      if (p.hp === 0 && state.winner === null) {
        // Burn KO: credit other player
        state.winner = 1 - state.activePlayer;
      }
    }
  }

  function applySpecial(state, activeIdx, enemyIdx) {
    const active = state.players[activeIdx];
    const enemy = state.players[enemyIdx];
    const heroId = active.heroId;

    if (heroId === "moses") {
      dealDamage(state, activeIdx, enemyIdx, 25);
      return;
    }
    if (heroId === "david") {
      const bonus = enemy.hp > 50 ? 10 : 0;
      dealDamage(state, activeIdx, enemyIdx, 22 + bonus);
      return;
    }
    if (heroId === "esther") {
      active.statuses.reversal = true;
      return;
    }
    if (heroId === "judah") {
      dealDamage(state, activeIdx, enemyIdx, 8);
      enemy.statuses.burn = 3;
      return;
    }
    if (heroId === "rambam") {
      active.hp = Math.min(active.maxHp, active.hp + 20);
      return;
    }
    // other heroes implemented in later tasks
  }

  function applyMove(state, moveType) {
    if (state.winner !== null) return;
    tickStartOfTurn(state);

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
    if (moveType === "special") {
      if (active.specialCooldown > 0) {
        throw new Error(`${hero.name}'s special is on cooldown (${active.specialCooldown})`);
      }
      applySpecial(state, activeIdx, enemyIdx);
      active.specialCooldown = 3;
      state.log.push(`${hero.name} uses ${hero.moves.special.name}!`);
      endTurn(state);
      return;
    }
    throw new Error(`unknown move: ${moveType}`);
  }

  function dealDamage(state, fromIdx, toIdx, rawDmg) {
    const target = state.players[toIdx];
    let dmg = Math.max(0, Math.floor(rawDmg));

    // 1. Esther's Reversal (if active on target) — redirect to attacker
    if (target.statuses.reversal) {
      delete target.statuses.reversal;
      const bounced = Math.floor(dmg * 1.5);
      const attacker = state.players[fromIdx];
      attacker.hp = Math.max(0, attacker.hp - bounced);
      if (attacker.hp === 0 && state.winner === null) {
        state.winner = toIdx;
      }
      return;
    }

    // 2. Defend halves
    if (target.statuses.defend) {
      dmg = Math.floor(dmg / 2);
      delete target.statuses.defend;
      // Golda counter handled in later task
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
