var Combat = (function () {
  const Heroes = (typeof require !== "undefined") ? require("./heroes.js") : window.Heroes;

  function createMatch(heroAId, heroBId, options) {
    options = options || {};
    const a = Heroes.byId(heroAId);
    const b = Heroes.byId(heroBId);
    if (!a) throw new Error(`unknown hero: ${heroAId}`);
    if (!b) throw new Error(`unknown hero: ${heroBId}`);
    const players = [makePlayer(a), makePlayer(b)];
    // Hard mode: boost the AI opponent's damage by 1.25x
    if (options.hardMode && options.hardOpponentSlot != null) {
      players[options.hardOpponentSlot].damageMultiplier = 1.25;
    }
    return {
      players,
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
      statuses: {}, // populated by specials and defend
      damageMultiplier: 1  // hard mode may set to 1.25
    };
  }

  function tickStartOfTurn(state) {
    const p = state.players[state.activePlayer];
    if (p.specialCooldown > 0) p.specialCooldown -= 1;

    if (typeof p.statuses.burn === "number" && p.statuses.burn > 0) {
      p.hp = Math.max(0, p.hp - 8);
      const hero = Heroes.byId(p.heroId);
      state.log.push(`${hero.name} takes 8 burn damage!`);
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
    const mult = (active.damageMultiplier && active.damageMultiplier !== 1) ? active.damageMultiplier : 1;

    if (heroId === "moses") {
      dealDamage(state, activeIdx, enemyIdx, Math.round(25 * mult));
      return;
    }
    if (heroId === "david") {
      const bonus = enemy.hp > 50 ? 10 : 0;
      dealDamage(state, activeIdx, enemyIdx, Math.round((22 + bonus) * mult));
      return;
    }
    if (heroId === "esther") {
      active.statuses.reversal = true;
      return;
    }
    if (heroId === "judah") {
      const wasReversed = dealDamage(state, activeIdx, enemyIdx, Math.round(8 * mult));
      if (!wasReversed) enemy.statuses.burn = 3;
      return;
    }
    if (heroId === "rambam") {
      // healing is not damage, no multiplier
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
    if (state.winner !== null) return;

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
        const chargeDmg = (active.damageMultiplier && active.damageMultiplier !== 1)
          ? Math.round(40 * active.damageMultiplier) : 40;
        dealDamage(state, activeIdx, enemyIdx, chargeDmg);
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
      }
      if (active.damageMultiplier && active.damageMultiplier !== 1) {
        dmg = Math.round(dmg * active.damageMultiplier);
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
      return true;
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
    return false;
  }

  function endTurn(state) {
    state.activePlayer = 1 - state.activePlayer;
    state.turnNumber += 1;
  }

  function isMatchOver(state) { return state.winner !== null; }

  function isCharging(state, playerIdx) {
    return typeof state.players[playerIdx].statuses.charging === "number";
  }

  function chooseAIMove(state, playerIdx, rng, difficulty) {
    rng = rng || Math.random;
    difficulty = difficulty || "normal";
    const p = state.players[playerIdx];
    if (typeof p.statuses.charging === "number") return "charge";
    const r = rng();
    if (difficulty === "hard") {
      // Harder AI: more aggressive when special available, no fallback to defend
      if (p.specialCooldown > 0) {
        // attack 65%, defend 35%
        return r < 0.65 ? "attack" : "defend";
      }
      // special available: attack 45%, defend 25%, special 30%
      if (r < 0.45) return "attack";
      if (r < 0.70) return "defend";
      return "special";
    }
    // Normal difficulty
    if (p.specialCooldown > 0) {
      return r < 0.70 ? "attack" : "defend";
    }
    if (r < 0.55) return "attack";
    if (r < 0.85) return "defend";
    return "special";
  }

  const LADDER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  function arcadeOrder(playerHeroId) {
    return LADDER.filter(id => id !== playerHeroId);
  }

  return { createMatch, applyMove, isMatchOver, isCharging, chooseAIMove, arcadeOrder };
})();

if (typeof module !== "undefined") module.exports = Combat;
