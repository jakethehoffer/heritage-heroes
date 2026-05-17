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
    if (heroId === "golda") {
      active.statuses.doubleNextAttack = true;
      return;
    }
    if (heroId === "einstein") {
      active.statuses.charging = 2;
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

    if (active.statuses.charging) {
      if (moveType !== "charge") {
        throw new Error(`${hero.name} is charging and cannot use ${moveType}`);
      }
      active.statuses.charging -= 1;
      if (active.statuses.charging === 0) {
        delete active.statuses.charging;
        dealDamage(state, activeIdx, enemyIdx, 40);
        state.log.push(`${hero.name} unleashes ${hero.moves.special.name}!`);
        active.specialCooldown = 3;
      } else {
        state.log.push(`${hero.name} is charging...`);
      }
      endTurn(state);
      return;
    }

    if (moveType === "attack") {
      let dmg = hero.moves.attack.damage;
      if (active.statuses.doubleNextAttack) {
        dmg = dmg * 2;
        delete active.statuses.doubleNextAttack;
        // Resolve bypasses the opponent's defend
        delete state.players[enemyIdx].statuses.defend;
      }
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
    let counterDmg = 0;
    if (target.statuses.defend) {
      dmg = Math.floor(dmg / 2);
      delete target.statuses.defend;
      if (target.heroId === "golda") counterDmg = 5;
    }
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp === 0 && state.winner === null) {
      state.winner = fromIdx;
      return;
    }
    if (counterDmg > 0) {
      const attacker = state.players[fromIdx];
      attacker.hp = Math.max(0, attacker.hp - counterDmg);
      if (attacker.hp === 0 && state.winner === null) state.winner = toIdx;
    }
  }

  function endTurn(state) {
    state.activePlayer = 1 - state.activePlayer;
    state.turnNumber += 1;
  }

  function isMatchOver(state) { return state.winner !== null; }

  function isCharging(state, playerIdx) {
    return typeof state.players[playerIdx].statuses.charging === "number";
  }

  return { createMatch, applyMove, isMatchOver, isCharging };
})();

if (typeof module !== "undefined") module.exports = Combat;
