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
    // Boss slot: +25% HP, +20% damage, hero-specific twist flag
    if (options.bossSlot != null) {
      const bp = players[options.bossSlot];
      const bHero = options.bossSlot === 0 ? a : b;
      bp.maxHp = Math.round(bHero.hp * 1.25);
      bp.hp    = bp.maxHp;
      bp.damageMultiplier = (bp.damageMultiplier || 1) * 1.20;
      bp.bossTwist = true;
      // Moses twist: starts with Pillar of Cloud (defend) already active
      if (bp.heroId === "moses") {
        bp.statuses.defend = true;
      }
    }
    const stageId = (options && options.stageId) || b.stageId;
    return {
      players,
      activePlayer: 0,
      turnNumber: 1,
      winner: null,
      log: [],
      stageId
    };
  }

  function makePlayer(hero) {
    return {
      heroId: hero.id,
      hp: hero.hp,
      maxHp: hero.hp,
      specialCooldown: 0,
      statuses: {}, // populated by specials and defend
      damageMultiplier: 1,  // hard mode may set to 1.25
      // Combo tracking — written by main.js to drive "COMBO xN!" callouts.
      // Initialised here so consumers can read without optional chaining.
      lastMoveType: null,
      comboCount: 0
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
      // Boss twist: bonus threshold lowered to >30 (from >50) and bonus +15 (from +10)
      const threshold = active.bossTwist ? 30 : 50;
      const bonusAmt  = active.bossTwist ? 15 : 10;
      const bonus = enemy.hp > threshold ? bonusAmt : 0;
      dealDamage(state, activeIdx, enemyIdx, Math.round((22 + bonus) * mult));
      return;
    }
    if (heroId === "esther") {
      active.statuses.reversal = true;
      // Boss twist: reversal multiplier stored on player for dealDamage to read
      if (active.bossTwist) active.statuses.reversalMult = 2.0;
      return;
    }
    if (heroId === "judah") {
      const wasReversed = dealDamage(state, activeIdx, enemyIdx, Math.round(8 * mult));
      // Boss twist: burn lasts 4 turns instead of 3
      if (!wasReversed) enemy.statuses.burn = active.bossTwist ? 4 : 3;
      return;
    }
    if (heroId === "rambam") {
      // healing is not damage, no multiplier
      // Boss twist: restores 30 HP instead of 20
      const healAmt = active.bossTwist ? 30 : 20;
      active.hp = Math.min(active.maxHp, active.hp + healAmt);
      return;
    }
    if (heroId === "golda") {
      active.statuses.doubleNextAttack = true;
      return;
    }
    if (heroId === "einstein") {
      // Boss twist: charge takes 1 turn instead of 2
      active.statuses.charging = active.bossTwist ? 1 : 2;
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
      const reversalMult = target.statuses.reversalMult || 1.5;
      delete target.statuses.reversal;
      delete target.statuses.reversalMult;
      const bounced = Math.floor(dmg * reversalMult);
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
      if (target.heroId === "golda") counterDmg = target.bossTwist ? 10 : 5;
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

  // ─── Per-hero AI personality functions ─────────────────────────────────────
  // Each function: (state, playerIdx, rng) => "attack" | "defend" | "special" | "charge"
  // They assume the charge guard has already been applied by the caller.

  function _mosesAI(state, playerIdx, rng) {
    const p = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    if (p.specialCooldown > 0) {
      // 60% attack, 40% defend
      return rng() < 0.60 ? "attack" : "defend";
    }
    const r = rng();
    // Moses likes a big opening strike against a healthy foe
    if (opp.hp > opp.maxHp * 0.75 && r < 0.30) return "special";
    // 40% attack, 35% defend, 25% special
    const r2 = rng();
    if (r2 < 0.40) return "attack";
    if (r2 < 0.75) return "defend";
    return "special";
  }

  function _davidAI(state, playerIdx, rng) {
    const p = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    if (p.specialCooldown > 0) {
      // 75% attack, 25% defend
      return rng() < 0.75 ? "attack" : "defend";
    }
    // David prioritizes Sling Stone when opponent HP > 50 (bonus damage condition)
    if (opp.hp > 50 && rng() < 0.40) return "special";
    // 60% attack, 15% defend, 25% special
    const r = rng();
    if (r < 0.60) return "attack";
    if (r < 0.75) return "defend";
    return "special";
  }

  function _estherAI(state, playerIdx, rng) {
    const p = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    if (p.specialCooldown > 0) {
      // 55% attack, 45% defend (without her trick she plays cautiously)
      return rng() < 0.55 ? "attack" : "defend";
    }
    // Esther anticipates a big hit to reflect when opponent's special is ready
    if (opp.specialCooldown === 0 && rng() < 0.50) return "special";
    // 40% attack, 30% defend, 30% special
    const r = rng();
    if (r < 0.40) return "attack";
    if (r < 0.70) return "defend";
    return "special";
  }

  function _judahAI(state, playerIdx, rng) {
    const p = state.players[playerIdx];
    const opp = state.players[1 - playerIdx];
    if (p.specialCooldown > 0) {
      // 70% attack, 30% defend
      return rng() < 0.70 ? "attack" : "defend";
    }
    // Re-ignite the flame as soon as burn drops
    if (!opp.statuses.burn && rng() < 0.45) return "special";
    // 55% attack, 15% defend, 30% special
    const r = rng();
    if (r < 0.55) return "attack";
    if (r < 0.70) return "defend";
    return "special";
  }

  function _rambamAI(state, playerIdx, rng) {
    const p = state.players[playerIdx];
    if (p.specialCooldown > 0) {
      // 45% attack, 55% defend (heavy defense without his heal)
      return rng() < 0.45 ? "attack" : "defend";
    }
    // Heal immediately when wounded below 50% HP
    if (p.hp < p.maxHp * 0.50) return "special";
    // 40% attack, 40% defend, 20% special
    const r = rng();
    if (r < 0.40) return "attack";
    if (r < 0.80) return "defend";
    return "special";
  }

  function _goldaAI(state, playerIdx, rng) {
    const p = state.players[playerIdx];
    // If the Resolve buff is ready, always attack to cash it in
    if (p.statuses.doubleNextAttack) return "attack";
    if (p.specialCooldown > 0) {
      // 60% attack, 40% defend
      return rng() < 0.60 ? "attack" : "defend";
    }
    // 50% attack, 25% defend, 25% special (uses Resolve regularly)
    const r = rng();
    if (r < 0.50) return "attack";
    if (r < 0.75) return "defend";
    return "special";
  }

  function _einsteinAI(state, playerIdx, rng) {
    const p = state.players[playerIdx];
    if (p.specialCooldown > 0) {
      // 60% attack, 40% defend
      return rng() < 0.60 ? "attack" : "defend";
    }
    // Last-resort big hit when wounded
    if (p.hp < p.maxHp * 0.50 && rng() < 0.55) return "special";
    // 50% attack, 30% defend, 20% special
    const r = rng();
    if (r < 0.50) return "attack";
    if (r < 0.80) return "defend";
    return "special";
  }

  const PERSONALITIES = {
    moses:   _mosesAI,
    david:   _davidAI,
    esther:  _estherAI,
    judah:   _judahAI,
    rambam:  _rambamAI,
    golda:   _goldaAI,
    einstein: _einsteinAI
  };

  // Hard-mode overlay: nudges each personality toward more special use.
  function _hardOverlay(move, state, playerIdx, rng) {
    const p = state.players[playerIdx];
    if (p.specialCooldown > 0) return move; // special not available — no override
    if (typeof p.statuses.charging === "number") return move; // charging — no override
    if (move === "defend" && rng() < 0.30) return "special";
    if (move === "attack" && rng() < 0.20) return "special";
    return move;
  }

  function chooseAIMove(state, playerIdx, rng, difficulty) {
    rng = rng || Math.random;
    difficulty = difficulty || "normal";
    const p = state.players[playerIdx];

    // Charging always takes priority
    if (typeof p.statuses.charging === "number") return "charge";

    const personality = PERSONALITIES[p.heroId];
    let move;
    if (personality) {
      move = personality(state, playerIdx, rng);
    } else {
      // Generic fallback (unknown hero)
      const r = rng();
      if (p.specialCooldown > 0) {
        move = r < 0.70 ? "attack" : "defend";
      } else if (r < 0.55) {
        move = "attack";
      } else if (r < 0.85) {
        move = "defend";
      } else {
        move = "special";
      }
    }

    if (difficulty === "hard") {
      move = _hardOverlay(move, state, playerIdx, rng);
    }
    return move;
  }

  const LADDER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  function arcadeOrder(playerHeroId) {
    return LADDER.filter(id => id !== playerHeroId);
  }

  return { createMatch, applyMove, isMatchOver, isCharging, chooseAIMove, arcadeOrder };
})();

if (typeof module !== "undefined") module.exports = Combat;
