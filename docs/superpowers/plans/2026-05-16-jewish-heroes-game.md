# Jewish Heroes Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a complete browser-based turn-based dueling game with 7 heroes from Jewish history, playable by a brand-new gamer (grandfather) and in local 2-player, distributed as a single static folder.

**Architecture:** Vanilla HTML / CSS / JavaScript. No frameworks, no build step, no npm. Each `src/*.js` file is a self-contained IIFE that exposes one global (e.g. `Combat`, `Heroes`) and also assigns to `module.exports` when run under Node, so the same files load in the browser via `<script>` tags AND can be unit-tested with Node's built-in test runner.

**Tech Stack:**
- HTML5 + CSS3 + ES2020 vanilla JavaScript
- Inline SVG for all art (no image files)
- `<audio>` element + WAV/OGG SFX files
- `localStorage` for save data
- Node 18+ built-in `node:test` runner for dev-time tests (not shipped)

**Spec reference:** `docs/superpowers/specs/2026-05-16-jewish-heroes-game-design.md`

---

## Module map (locked at plan time)

```
jewish-game/
├─ index.html              # Layout shell; screen container <div id="root">; script tags
├─ src/
│  ├─ heroes.js            # const HEROES = [...]; roster data, bios, move metadata
│  ├─ stages.js            # const STAGES = {moses: {...}, ...}; stage SVG composers
│  ├─ render.js            # Render: HP bar, callout, hero SVGs (all 7), color tokens
│  ├─ combat.js            # Combat: createMatch, applyMove, AI, status resolution
│  ├─ storage.js           # Storage: load/save with injected store + in-memory fallback
│  ├─ audio.js             # Audio: preload, play, toggle mute
│  ├─ screens.js           # Screens: renderTitle, renderModeSelect, renderCharSelect, renderBattle, renderResult, renderTutorial
│  └─ main.js              # App boot, state machine, event delegation, screen routing
├─ styles/
│  └─ main.css             # Paper-cutout theme tokens, layout, screen styles
├─ assets/sfx/             # Short WAV/OGG sound files
└─ test/
   ├─ test-heroes.js       # node:test for heroes.js
   ├─ test-storage.js      # node:test for storage.js
   └─ test-combat.js       # node:test for combat.js (largest test file)
```

## Universal module pattern

**Every file in `src/` follows this shape so it works in both browser (`<script>` tag) and Node (`require`)**:

```js
// src/<modulename>.js
const ModuleName = (function () {
  // private helpers
  function privateThing() { /* ... */ }

  // public API
  return {
    publicFn(x) { return privateThing() + x; }
  };
})();

if (typeof module !== "undefined") module.exports = ModuleName;
```

Browser: include via `<script src="src/modulename.js"></script>`; other scripts reference `ModuleName.publicFn(...)`.
Node: `const ModuleName = require("../src/modulename.js");` in tests.

## Test approach

- **Heavy unit tests** for pure logic: `heroes.js`, `storage.js`, `combat.js`. Run with `node --test test/`.
- **Smoke tests** for `render.js` and `stages.js`: functions return non-empty strings containing expected substrings.
- **Manual browser verification** for `screens.js`, `main.js`, `audio.js`, and final polish. Each UI task lists exact manual steps to run.

No npm. No package.json. Node 18+ has `node:test` and `node:assert` built in.

---

## Task 1: Project scaffold — "Hello, Heroes"

**Goal:** Create the empty shell and confirm it opens in a browser.

**Files:**
- Create: `index.html`
- Create: `styles/main.css`
- Create: `src/main.js`
- Create: `assets/sfx/.gitkeep`

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Jewish Heroes</title>
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <div id="root">
    <h1>Jewish Heroes</h1>
    <p>Loading&hellip;</p>
  </div>
  <script src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles/main.css` with paper-cutout color tokens**

```css
:root {
  --bg: #faf3e0;
  --ink: #1a1a1a;
  --terracotta: #c1462d;
  --olive: #6b8e23;
  --cream: #fff8e7;
  --navy: #1a2a4f;
  --gold: #d4a574;
  --shadow: rgba(0, 0, 0, 0.15);

  --font-heading: Georgia, "Times New Roman", serif;
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

#root {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
}

h1, h2, h3 { font-family: var(--font-heading); font-weight: 700; }
h1 { font-size: 48px; margin-bottom: 16px; }
h2 { font-size: 32px; margin-bottom: 12px; }
h3 { font-size: 22px; margin-bottom: 8px; }

button {
  font-family: var(--font-body);
  font-size: 20px;
  padding: 16px 32px;
  background: var(--terracotta);
  color: var(--cream);
  border: 3px solid var(--ink);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 4px 4px 0 var(--shadow);
  transition: transform 80ms;
}
button:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--shadow); }
button:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--shadow); }
button:disabled { background: #999; cursor: not-allowed; box-shadow: 4px 4px 0 var(--shadow); }
```

- [ ] **Step 3: Create `src/main.js`**

```js
const Main = (function () {
  function boot() {
    const root = document.getElementById("root");
    root.innerHTML = '<h1>Jewish Heroes</h1><p>Scaffold OK. Implementation in progress.</p>';
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", boot);
  }

  return { boot };
})();

if (typeof module !== "undefined") module.exports = Main;
```

- [ ] **Step 4: Create empty `assets/sfx/.gitkeep`**

Empty file. Ensures the directory exists in git.

- [ ] **Step 5: Manual verification**

Open `index.html` in a browser via file:// (double-click). Expected: page shows "Jewish Heroes" heading and "Scaffold OK. Implementation in progress." on a cream background.

- [ ] **Step 6: Commit**

```bash
git add index.html styles/main.css src/main.js assets/sfx/.gitkeep
git commit -m "scaffold: index.html, base CSS, main.js boot stub"
```

---

## Task 2: Test runner setup

**Goal:** Confirm `node --test` works from this repo. Establishes the test pattern used by every subsequent module task.

**Files:**
- Create: `test/test-smoke.js`

- [ ] **Step 1: Write a smoke test**

```js
// test/test-smoke.js
const test = require("node:test");
const assert = require("node:assert");

test("smoke: node:test is working", () => {
  assert.strictEqual(1 + 1, 2);
});
```

- [ ] **Step 2: Run the test**

```bash
node --test test/
```

Expected: output ends with `tests 1` and `pass 1`, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add test/test-smoke.js
git commit -m "test: add node:test smoke test"
```

---

## Task 3: `heroes.js` — roster data

**Goal:** Single source of truth for the 7 heroes: id, display name, era, HP, bio, three moves.

**Files:**
- Create: `src/heroes.js`
- Create: `test/test-heroes.js`

- [ ] **Step 1: Write failing tests**

```js
// test/test-heroes.js
const test = require("node:test");
const assert = require("node:assert");
const Heroes = require("../src/heroes.js");

const EXPECTED_IDS = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

test("roster has exactly the 7 expected heroes", () => {
  assert.strictEqual(Heroes.list.length, 7);
  const ids = Heroes.list.map(h => h.id);
  for (const id of EXPECTED_IDS) assert.ok(ids.includes(id), `missing ${id}`);
});

test("every hero has required fields", () => {
  for (const h of Heroes.list) {
    assert.ok(typeof h.id === "string" && h.id.length > 0, `${h.id}: bad id`);
    assert.ok(typeof h.name === "string" && h.name.length > 0, `${h.id}: bad name`);
    assert.ok(typeof h.era === "string", `${h.id}: bad era`);
    assert.ok(Number.isInteger(h.hp) && h.hp >= 80 && h.hp <= 100, `${h.id}: hp out of range`);
    assert.ok(typeof h.bio === "string" && h.bio.length > 0, `${h.id}: bad bio`);
    assert.ok(h.moves && h.moves.attack && h.moves.defend && h.moves.special, `${h.id}: missing moves`);
    assert.ok(typeof h.moves.attack.name === "string", `${h.id}: bad attack name`);
    assert.ok(Number.isInteger(h.moves.attack.damage) && h.moves.attack.damage > 0, `${h.id}: bad attack dmg`);
    assert.ok(typeof h.moves.special.name === "string", `${h.id}: bad special name`);
    assert.ok(typeof h.moves.special.description === "string", `${h.id}: bad special desc`);
    assert.ok(typeof h.stageId === "string" && h.stageId.length > 0, `${h.id}: bad stageId`);
  }
});

test("byId returns the right hero or undefined", () => {
  assert.strictEqual(Heroes.byId("moses").name, "Moses");
  assert.strictEqual(Heroes.byId("nonexistent"), undefined);
});

test("HP totals are within design tolerance", () => {
  const total = Heroes.list.reduce((s, h) => s + h.hp, 0);
  assert.strictEqual(total, 100 + 95 + 90 + 100 + 85 + 100 + 80);
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
node --test test/test-heroes.js
```

Expected: "Cannot find module '../src/heroes.js'" → all tests fail.

- [ ] **Step 3: Implement `src/heroes.js`**

```js
const Heroes = (function () {
  const list = [
    {
      id: "moses",
      name: "Moses",
      era: "Biblical",
      hp: 100,
      bio: "Led the Israelites out of Egypt; received the Ten Commandments at Mount Sinai.",
      stageId: "redsea",
      moves: {
        attack:  { name: "Staff Strike",   damage: 10, description: "A solid strike with the staff." },
        defend:  { name: "Pillar of Cloud", description: "Halves the next incoming attack." },
        special: { name: "Part the Sea",   damage: 25, description: "A sweeping wave deals heavy damage." }
      }
    },
    {
      id: "david",
      name: "King David",
      era: "Biblical",
      hp: 95,
      bio: "Shepherd boy who slew Goliath and became Israel's greatest king.",
      stageId: "elah",
      moves: {
        attack:  { name: "Shepherd's Sling", damage: 12, description: "A whirling stone strike." },
        defend:  { name: "Lion's Cloak",     description: "Halves the next incoming attack." },
        special: { name: "Sling Stone",      damage: 22, description: "Devastating ranged shot; +10 damage if opponent HP > 50." }
      }
    },
    {
      id: "esther",
      name: "Queen Esther",
      era: "Biblical",
      hp: 90,
      bio: "Saved her people from Haman's plot; her story is read every Purim.",
      stageId: "throne",
      moves: {
        attack:  { name: "Royal Decree",   damage: 10, description: "Authoritative strike." },
        defend:  { name: "Court Veil",     description: "Halves the next incoming attack." },
        special: { name: "Reversal",       description: "Next attack against her bounces back at 1.5x damage." }
      }
    },
    {
      id: "judah",
      name: "Judah Maccabee",
      era: "Maccabees",
      hp: 100,
      bio: "Led the revolt that reclaimed and rededicated the Temple; the hero of Hanukkah.",
      stageId: "temple",
      moves: {
        attack:  { name: "Spear Thrust",   damage: 11, description: "A swift spear jab." },
        defend:  { name: "Phalanx Shield", description: "Halves the next incoming attack." },
        special: { name: "Menorah Flame",  damage: 8, description: "8 damage now plus 8 per turn for 3 turns." }
      }
    },
    {
      id: "rambam",
      name: "Maimonides",
      era: "Medieval",
      hp: 85,
      bio: "Medieval philosopher and physician; wrote the Mishneh Torah.",
      stageId: "cordoba",
      moves: {
        attack:  { name: "Wisdom Bolt",         damage: 9, description: "A focused intellectual strike." },
        defend:  { name: "Philosophical Calm",  description: "Halves the next incoming attack." },
        special: { name: "Healing Touch",       heal: 20, description: "Restores 20 HP to self." }
      }
    },
    {
      id: "golda",
      name: "Golda Meir",
      era: "Modern",
      hp: 100,
      bio: "Israel's fourth Prime Minister; the 'Iron Lady of Israel.'",
      stageId: "knesset",
      moves: {
        attack:  { name: "Iron Word",          damage: 10, description: "A blunt verbal strike." },
        defend:  { name: "Diplomatic Shield",  counter: 5, description: "Halves the next incoming attack and counters for 5." },
        special: { name: "Resolve",            description: "Her next Basic Attack hits for double damage." }
      }
    },
    {
      id: "einstein",
      name: "Albert Einstein",
      era: "Modern",
      hp: 80,
      bio: "Physicist whose theory of relativity changed how we understand the universe.",
      stageId: "princeton",
      moves: {
        attack:  { name: "Equation Spark",  damage: 8, description: "A small bolt of energy." },
        defend:  { name: "Theory Shield",   description: "Halves the next incoming attack." },
        special: { name: "E=mc²",      damage: 40, description: "Charges 2 turns (cannot act), then unleashes massive damage." }
      }
    }
  ];

  const byId = (id) => list.find(h => h.id === id);

  return { list, byId };
})();

if (typeof module !== "undefined") module.exports = Heroes;
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
node --test test/test-heroes.js
```

Expected: `pass 4`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/heroes.js test/test-heroes.js
git commit -m "heroes: roster data for all 7 heroes with moves and bios"
```

---

## Task 4: `storage.js` — localStorage wrapper

**Goal:** Save/load a single JSON blob. Inject the store so tests can use a fake; gracefully fall back if `localStorage` throws.

**Files:**
- Create: `src/storage.js`
- Create: `test/test-storage.js`

- [ ] **Step 1: Write failing tests**

```js
// test/test-storage.js
const test = require("node:test");
const assert = require("node:assert");
const Storage = require("../src/storage.js");

function fakeStore() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); }
  };
}

function throwingStore() {
  return {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); }
  };
}

test("load returns defaults when store is empty", () => {
  const data = Storage.load(fakeStore());
  assert.deepStrictEqual(data.arcade, { moses: 0, david: 0, esther: 0, judah: 0, rambam: 0, golda: 0, einstein: 0 });
  assert.strictEqual(data.sound, false);
  assert.strictEqual(data.tutorialSeen, false);
});

test("save then load round-trips a value", () => {
  const s = fakeStore();
  const data = Storage.load(s);
  data.arcade.moses = 3;
  data.sound = true;
  Storage.save(s, data);
  const reloaded = Storage.load(s);
  assert.strictEqual(reloaded.arcade.moses, 3);
  assert.strictEqual(reloaded.sound, true);
});

test("load returns defaults when stored JSON is corrupt", () => {
  const s = fakeStore();
  s.setItem("jewishHeroes.save", "{not json");
  const data = Storage.load(s);
  assert.strictEqual(data.arcade.moses, 0);
});

test("load returns defaults when store throws", () => {
  const data = Storage.load(throwingStore());
  assert.strictEqual(data.arcade.moses, 0);
  assert.strictEqual(data.sound, false);
});

test("save is a no-op when store throws", () => {
  Storage.save(throwingStore(), { arcade: {}, sound: true, tutorialSeen: true });
});

test("incrementArcadeWin increments the right counter", () => {
  const s = fakeStore();
  Storage.incrementArcadeWin(s, "moses");
  Storage.incrementArcadeWin(s, "moses");
  Storage.incrementArcadeWin(s, "david");
  const data = Storage.load(s);
  assert.strictEqual(data.arcade.moses, 2);
  assert.strictEqual(data.arcade.david, 1);
  assert.strictEqual(data.arcade.esther, 0);
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
node --test test/test-storage.js
```

Expected: "Cannot find module" failure.

- [ ] **Step 3: Implement `src/storage.js`**

```js
const Storage = (function () {
  const KEY = "jewishHeroes.save";

  function defaults() {
    return {
      arcade: { moses: 0, david: 0, esther: 0, judah: 0, rambam: 0, golda: 0, einstein: 0 },
      sound: false,
      tutorialSeen: false
    };
  }

  function load(store) {
    try {
      const raw = store.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      const out = defaults();
      if (parsed && typeof parsed === "object") {
        if (parsed.arcade && typeof parsed.arcade === "object") {
          for (const k of Object.keys(out.arcade)) {
            if (Number.isInteger(parsed.arcade[k])) out.arcade[k] = parsed.arcade[k];
          }
        }
        if (typeof parsed.sound === "boolean") out.sound = parsed.sound;
        if (typeof parsed.tutorialSeen === "boolean") out.tutorialSeen = parsed.tutorialSeen;
      }
      return out;
    } catch (_) {
      return defaults();
    }
  }

  function save(store, data) {
    try { store.setItem(KEY, JSON.stringify(data)); } catch (_) { /* silent */ }
  }

  function incrementArcadeWin(store, heroId) {
    const data = load(store);
    if (Object.prototype.hasOwnProperty.call(data.arcade, heroId)) {
      data.arcade[heroId] += 1;
    }
    save(store, data);
  }

  return { load, save, incrementArcadeWin };
})();

if (typeof module !== "undefined") module.exports = Storage;
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
node --test test/test-storage.js
```

Expected: `pass 6`.

- [ ] **Step 5: Commit**

```bash
git add src/storage.js test/test-storage.js
git commit -m "storage: localStorage wrapper with injected store and fallback"
```

---

## Task 5: `combat.js` — match initialization

**Goal:** `createMatch(heroAId, heroBId)` returns an initial match state object. Foundation for every later combat task.

**Files:**
- Create: `src/combat.js`
- Create: `test/test-combat.js`

- [ ] **Step 1: Write failing tests**

```js
// test/test-combat.js
const test = require("node:test");
const assert = require("node:assert");
const Combat = require("../src/combat.js");
const Heroes = require("../src/heroes.js");

test("createMatch returns initial state with full HP and player 0 active", () => {
  const s = Combat.createMatch("moses", "david");
  assert.strictEqual(s.players.length, 2);
  assert.strictEqual(s.players[0].heroId, "moses");
  assert.strictEqual(s.players[1].heroId, "david");
  assert.strictEqual(s.players[0].hp, Heroes.byId("moses").hp);
  assert.strictEqual(s.players[1].hp, Heroes.byId("david").hp);
  assert.strictEqual(s.players[0].maxHp, Heroes.byId("moses").hp);
  assert.strictEqual(s.activePlayer, 0);
  assert.strictEqual(s.winner, null);
  assert.strictEqual(s.turnNumber, 1);
});

test("createMatch initializes each player's special as ready and statuses empty", () => {
  const s = Combat.createMatch("moses", "david");
  for (const p of s.players) {
    assert.strictEqual(p.specialCooldown, 0);
    assert.deepStrictEqual(p.statuses, {});
  }
});

test("createMatch throws on unknown hero id", () => {
  assert.throws(() => Combat.createMatch("nobody", "david"));
  assert.throws(() => Combat.createMatch("moses", "nobody"));
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
node --test test/test-combat.js
```

Expected: "Cannot find module '../src/combat.js'".

- [ ] **Step 3: Implement `src/combat.js` (initial version)**

```js
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

  return { createMatch };
})();

if (typeof module !== "undefined") module.exports = Combat;
```

Note: in the browser, `Heroes` is loaded via a prior `<script>` tag, so `window.Heroes` is present. In Node tests, `require("./heroes.js")` returns the module.

- [ ] **Step 4: Run tests, confirm they pass**

```bash
node --test test/test-combat.js
```

Expected: `pass 3`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: match initialization with player state"
```

---

## Task 6: `combat.js` — basic attack resolution

**Goal:** `applyMove(state, "attack")` deals the active hero's basic-attack damage to the opponent and ends the active player's turn (passes control to the other player).

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append to test/test-combat.js
test("attack: reduces opponent HP by attack damage", () => {
  const s = Combat.createMatch("moses", "david");
  const startDavidHp = s.players[1].hp;
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, startDavidHp - Heroes.byId("moses").moves.attack.damage);
});

test("attack: advances turn to other player and increments turn number", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.activePlayer, 1);
  assert.strictEqual(s.turnNumber, 2);
});

test("attack: writes an entry to the log", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.log.length, 1);
  assert.match(s.log[0], /Moses/);
  assert.match(s.log[0], /Staff Strike/);
});

test("attack: HP cannot go negative", () => {
  const s = Combat.createMatch("moses", "einstein");
  s.players[1].hp = 5;
  Combat.applyMove(s, "attack"); // Moses 10 dmg
  assert.strictEqual(s.players[1].hp, 0);
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

```bash
node --test test/test-combat.js
```

Expected: 3 old pass, 4 new fail with "applyMove is not a function".

- [ ] **Step 3: Add `applyMove` and `endTurn` to `src/combat.js`**

Insert after `makePlayer`:

```js
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
```

Update the `return { createMatch };` line to:

```js
  return { createMatch, applyMove };
```

- [ ] **Step 4: Run tests**

```bash
node --test test/test-combat.js
```

Expected: `pass 7`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: basic attack resolution and turn cycle"
```

---

## Task 7: `combat.js` — defend resolution

**Goal:** `applyMove(state, "defend")` sets a `defend` status on the active player. The next attack against them is halved (rounded down). Defend persists across opponent turns where no attack lands.

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append to test/test-combat.js
test("defend: applies status without dealing damage", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "defend");
  assert.strictEqual(s.players[0].statuses.defend, true);
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp);
  assert.strictEqual(s.activePlayer, 1);
});

test("defend: halves the next incoming attack (rounded down)", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "defend"); // Moses defends
  // P2 (David) attacks for 12 -> halved to 6
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].hp, s.players[0].maxHp - 6);
  assert.strictEqual(s.players[0].statuses.defend, undefined, "defend should expire");
});

test("defend: persists if opponent does not attack", () => {
  const s = Combat.createMatch("moses", "rambam");
  Combat.applyMove(s, "defend"); // Moses defends
  Combat.applyMove(s, "defend"); // Rambam also defends (no attack)
  assert.strictEqual(s.players[0].statuses.defend, true, "Moses defend still up");
});

test("defend: odd damage rounds down", () => {
  const s = Combat.createMatch("david", "rambam"); // Rambam attack = 9
  Combat.applyMove(s, "attack"); // David hits Rambam first (irrelevant here)
  Combat.applyMove(s, "defend"); // Rambam defends
  Combat.applyMove(s, "attack"); // David's sling 12 -> 6
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp - 6);
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

Expected: defend branch not implemented → 4 new failures.

- [ ] **Step 3: Update `applyMove` and `dealDamage` in `src/combat.js`**

Replace the `applyMove` function body with:

```js
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
```

Replace `dealDamage` with:

```js
  function dealDamage(state, fromIdx, toIdx, rawDmg) {
    const target = state.players[toIdx];
    let dmg = Math.max(0, Math.floor(rawDmg));
    if (target.statuses.defend) {
      dmg = Math.floor(dmg / 2);
      delete target.statuses.defend;
    }
    target.hp = Math.max(0, target.hp - dmg);
  }
```

- [ ] **Step 4: Run tests**

Expected: `pass 11`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: defend status halves the next incoming attack"
```

---

## Task 8: `combat.js` — win detection

**Goal:** When any player's HP reaches 0, `state.winner` is set to the winning index and further moves are no-ops.

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append
test("winner: set when opponent HP reaches 0", () => {
  const s = Combat.createMatch("moses", "einstein");
  s.players[1].hp = 8; // Moses attack = 10
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, 0);
  assert.strictEqual(s.winner, 0);
});

test("winner: applyMove is no-op once match is over", () => {
  const s = Combat.createMatch("moses", "einstein");
  s.players[1].hp = 8;
  Combat.applyMove(s, "attack");
  const turnBefore = s.turnNumber;
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.turnNumber, turnBefore);
});

test("isMatchOver returns true after a KO", () => {
  const s = Combat.createMatch("moses", "einstein");
  assert.strictEqual(Combat.isMatchOver(s), false);
  s.players[1].hp = 8;
  Combat.applyMove(s, "attack");
  assert.strictEqual(Combat.isMatchOver(s), true);
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

- [ ] **Step 3: Update `dealDamage` and add `isMatchOver`**

Modify `dealDamage` to set the winner:

```js
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
```

Add a public helper before the return:

```js
  function isMatchOver(state) { return state.winner !== null; }
```

Update the public surface:

```js
  return { createMatch, applyMove, isMatchOver };
```

- [ ] **Step 4: Run tests**

Expected: `pass 14`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: win detection at HP 0; freeze state after KO"
```

---

## Task 9: `combat.js` — special cooldown system

**Goal:** `applyMove(state, "special")` triggers the active hero's signature. After use, `specialCooldown` is set to 3 and decrements at the start of each of that player's turns. While on cooldown, attempts to use Special throw.

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append
test("special: not allowed at full HP only? no — allowed any time when ready", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special"); // Moses Part the Sea
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp - 25);
});

test("special: enters 3-turn cooldown after use", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special"); // Moses
  assert.strictEqual(s.players[0].specialCooldown, 3);
  // David's turn — Moses cooldown should still be 3
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].specialCooldown, 3);
  // Moses's next turn — cooldown ticks down to 2 at turn start
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].specialCooldown, 2);
});

test("special: throws if used while on cooldown", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special");
  Combat.applyMove(s, "attack"); // David
  assert.throws(() => Combat.applyMove(s, "special"));
});

test("special: becomes usable after cooldown reaches 0", () => {
  const s = Combat.createMatch("moses", "david");
  Combat.applyMove(s, "special"); // Moses, cd=3
  Combat.applyMove(s, "attack");  // David
  Combat.applyMove(s, "attack");  // Moses tick cd 3->2
  Combat.applyMove(s, "attack");  // David
  Combat.applyMove(s, "attack");  // Moses tick cd 2->1
  Combat.applyMove(s, "attack");  // David
  Combat.applyMove(s, "attack");  // Moses tick cd 1->0
  Combat.applyMove(s, "attack");  // David
  // Moses's next turn: should be usable again
  Combat.applyMove(s, "special"); // does not throw
  assert.strictEqual(s.players[0].specialCooldown, 3);
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

- [ ] **Step 3: Implement cooldown ticks and special dispatch**

Add `tickStartOfTurn` and update `applyMove`:

```js
  function tickStartOfTurn(state) {
    const p = state.players[state.activePlayer];
    if (p.specialCooldown > 0) p.specialCooldown -= 1;
  }
```

Modify `applyMove` to tick at start of turn (BEFORE move logic) ONLY for the active player when entering a new turn. Easier: tick at the top of every applyMove call — represents "active player's turn begins now."

```js
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
```

Add a stub `applySpecial` for now:

```js
  function applySpecial(state, activeIdx, enemyIdx) {
    const active = state.players[activeIdx];
    const hero = Heroes.byId(active.heroId);
    // Per-hero logic added in next tasks; default: damage = hero.moves.special.damage
    if (typeof hero.moves.special.damage === "number") {
      dealDamage(state, activeIdx, enemyIdx, hero.moves.special.damage);
    }
  }
```

- [ ] **Step 4: Run tests**

Expected: `pass 18`. If the first special test fails because the existing default damage is 25 but rounding by defend etc, double-check.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: special move cooldown and basic damage dispatch"
```

---

## Task 10: `combat.js` — Moses, David, Esther specials

**Goal:** Hero-specific special logic for the three biblical heroes.

- Moses: Part the Sea — 25 damage (already handled by default).
- David: Sling Stone — 22 damage; +10 if opponent HP > 50.
- Esther: Reversal — sets a `reversal` status on Esther. Next attack against her is redirected to attacker at 1.5x.

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append
test("David's special: +10 bonus damage when opponent HP > 50", () => {
  const s = Combat.createMatch("david", "moses");
  // Moses starts at 100, >50, so 22+10 = 32
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[1].hp, 100 - 32);
});

test("David's special: no bonus when opponent HP <= 50", () => {
  const s = Combat.createMatch("david", "moses");
  s.players[1].hp = 50;
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[1].hp, 50 - 22);
});

test("Esther's Reversal: next attack against her bounces back at 1.5x", () => {
  const s = Combat.createMatch("esther", "moses"); // Moses attack = 10
  Combat.applyMove(s, "special"); // Esther sets reversal
  // Moses attacks Esther for 10; reversed to Moses at 15
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[0].hp, s.players[0].maxHp, "Esther unharmed");
  assert.strictEqual(s.players[1].hp, 100 - 15, "Moses takes 15 reflected");
  assert.strictEqual(s.players[0].statuses.reversal, undefined, "reversal expired");
});

test("Esther's Reversal: rounds down on fractional damage", () => {
  const s = Combat.createMatch("esther", "rambam"); // Rambam attack = 9
  Combat.applyMove(s, "special");
  // 9 * 1.5 = 13.5 -> 13
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, s.players[1].maxHp - 13);
});

test("Esther's Reversal: does NOT trigger on opponent's non-attack moves", () => {
  const s = Combat.createMatch("esther", "rambam");
  Combat.applyMove(s, "special"); // Esther reversal up
  Combat.applyMove(s, "defend"); // Rambam defends -- reversal should stay
  assert.strictEqual(s.players[0].statuses.reversal, true);
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

- [ ] **Step 3: Update `applySpecial` to dispatch by hero id**

Replace the stub with:

```js
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
    // other heroes implemented in later tasks
  }
```

Update `dealDamage` to honor Reversal (it runs BEFORE defend per spec §5):

```js
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
```

- [ ] **Step 4: Run tests**

Expected: `pass 23`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: Moses/David/Esther special-move logic and reversal"
```

---

## Task 11: `combat.js` — Judah burn and Rambam heal

**Goal:**
- Judah's Menorah Flame: deals 8 immediately + sets a burn status (3 turns of 8 damage at the start of opponent's turn).
- Maimonides's Healing Touch: restores 20 HP to self (capped at maxHp).

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append
test("Judah's Menorah Flame: 8 immediate damage + 3 turns of 8 burn", () => {
  const s = Combat.createMatch("judah", "moses"); // Moses 100 HP
  Combat.applyMove(s, "special"); // Judah -> Moses: 8 dmg, burn=3
  assert.strictEqual(s.players[1].hp, 92);
  assert.strictEqual(s.players[1].statuses.burn, 3);

  Combat.applyMove(s, "defend"); // Moses turn starts -> burn tick to 8 dmg, burn=2
  assert.strictEqual(s.players[1].hp, 84);
  assert.strictEqual(s.players[1].statuses.burn, 2);

  Combat.applyMove(s, "defend"); // Judah turn (no burn on him)
  Combat.applyMove(s, "defend"); // Moses turn -> 76, burn=1
  assert.strictEqual(s.players[1].hp, 76);

  Combat.applyMove(s, "defend"); // Judah
  Combat.applyMove(s, "defend"); // Moses -> 68, burn expires
  assert.strictEqual(s.players[1].hp, 68);
  assert.strictEqual(s.players[1].statuses.burn, undefined);

  Combat.applyMove(s, "defend"); // Judah
  Combat.applyMove(s, "defend"); // Moses: no more burn
  assert.strictEqual(s.players[1].hp, 68);
});

test("Rambam's Healing Touch: restores 20 HP, capped at maxHp", () => {
  const s = Combat.createMatch("rambam", "moses");
  s.players[0].hp = 50;
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].hp, 70);
});

test("Rambam's Healing Touch: caps at maxHp", () => {
  const s = Combat.createMatch("rambam", "moses");
  s.players[0].hp = 80; // max is 85
  Combat.applyMove(s, "special");
  assert.strictEqual(s.players[0].hp, 85);
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

- [ ] **Step 3: Extend `applySpecial` and `tickStartOfTurn`**

Add to `applySpecial` before the closing comment:

```js
    if (heroId === "judah") {
      dealDamage(state, activeIdx, enemyIdx, 8);
      enemy.statuses.burn = 3;
      return;
    }
    if (heroId === "rambam") {
      const h = Heroes.byId(active.heroId);
      active.hp = Math.min(active.maxHp, active.hp + 20);
      return;
    }
```

Update `tickStartOfTurn` to apply burn damage:

```js
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
```

- [ ] **Step 4: Run tests**

Expected: `pass 26`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: Judah burn-over-time and Rambam heal"
```

---

## Task 12: `combat.js` — Golda buff + counter; Einstein charge

**Goal:**
- Golda's Resolve: sets a `doubleNextAttack` status. Next Basic Attack does 2x damage. Buff persists until consumed.
- Golda's Diplomatic Shield (Defend variant): when she's hit while defending, the attacker takes 5 damage AFTER her halved damage is applied.
- Einstein's E=mc²: sets `charging=2`. While charging, Einstein cannot Attack or Defend. At the start of his next turn, charging decrements. When it reaches 0, the next call to `applyMove` for him auto-resolves as the blast (40 damage) and the cooldown begins.

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append

// Golda
test("Golda's Resolve: doubles damage on her next Basic Attack only", () => {
  const s = Combat.createMatch("golda", "moses");
  Combat.applyMove(s, "special"); // Golda Resolve
  Combat.applyMove(s, "defend");  // Moses defends — irrelevant
  // Golda attacks: 10 doubled = 20. Moses no defend. Hits for 20.
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, 100 - 20);
  assert.strictEqual(s.players[0].statuses.doubleNextAttack, undefined);
});

test("Golda's Resolve: buff persists across defends until attack consumes it", () => {
  const s = Combat.createMatch("golda", "moses");
  Combat.applyMove(s, "special"); // Golda Resolve set
  Combat.applyMove(s, "attack");  // Moses
  Combat.applyMove(s, "defend");  // Golda defends — should NOT consume buff
  assert.strictEqual(s.players[0].statuses.doubleNextAttack, true);
});

test("Golda's Diplomatic Shield: counters for 5 when struck", () => {
  const s = Combat.createMatch("moses", "golda"); // Moses goes first
  Combat.applyMove(s, "defend"); // Moses defends — irrelevant for now
  Combat.applyMove(s, "defend"); // Golda defends (Diplomatic Shield)
  // Moses attacks Golda for 10 -> halved to 5 -> Moses takes 5 counter
  Combat.applyMove(s, "attack");
  assert.strictEqual(s.players[1].hp, 100 - 5);
  assert.strictEqual(s.players[0].hp, 100 - 5);
});

// Einstein
test("Einstein's E=mc^2: charge phase blocks normal moves and ticks down", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special"); // Einstein starts charging (charging=2)
  assert.strictEqual(s.players[0].statuses.charging, 2);
  // Moses turn
  Combat.applyMove(s, "attack");
  // Einstein's turn — must call applyMove(state, "charge") to advance charge
  // applyMove with any other action throws while charging.
  assert.throws(() => Combat.applyMove(s, "attack"));
  assert.throws(() => Combat.applyMove(s, "defend"));
  assert.throws(() => Combat.applyMove(s, "special"));
});

test("Einstein's E=mc^2: 'charge' move ticks charging and ends turn", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special");        // charging=2
  Combat.applyMove(s, "attack");         // Moses
  Combat.applyMove(s, "charge");         // Einstein: tick to 1
  assert.strictEqual(s.players[0].statuses.charging, 1);
  Combat.applyMove(s, "attack");         // Moses
  Combat.applyMove(s, "charge");         // Einstein: tick to 0, blast for 40
  assert.strictEqual(s.players[0].statuses.charging, undefined);
  assert.strictEqual(s.players[1].hp, 100 - 40);
  assert.strictEqual(s.players[0].specialCooldown, 3);
});

test("Einstein: while charging, isCharging exposes true", () => {
  const s = Combat.createMatch("einstein", "moses");
  assert.strictEqual(Combat.isCharging(s, 0), false);
  Combat.applyMove(s, "special");
  assert.strictEqual(Combat.isCharging(s, 0), true);
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

- [ ] **Step 3: Update `combat.js`**

Extend `applySpecial`:

```js
    if (heroId === "golda") {
      active.statuses.doubleNextAttack = true;
      return;
    }
    if (heroId === "einstein") {
      active.statuses.charging = 2;
      return;
    }
```

Extend `applyMove`'s attack branch to consume Golda's buff:

```js
    if (moveType === "attack") {
      let dmg = hero.moves.attack.damage;
      if (active.statuses.doubleNextAttack) {
        dmg = dmg * 2;
        delete active.statuses.doubleNextAttack;
      }
      dealDamage(state, activeIdx, enemyIdx, dmg);
      state.log.push(`${hero.name} uses ${hero.moves.attack.name}.`);
      endTurn(state);
      return;
    }
```

Update `dealDamage` to add Golda's counter:

```js
  function dealDamage(state, fromIdx, toIdx, rawDmg) {
    const target = state.players[toIdx];
    let dmg = Math.max(0, Math.floor(rawDmg));

    if (target.statuses.reversal) {
      delete target.statuses.reversal;
      const bounced = Math.floor(dmg * 1.5);
      const attacker = state.players[fromIdx];
      attacker.hp = Math.max(0, attacker.hp - bounced);
      if (attacker.hp === 0 && state.winner === null) state.winner = toIdx;
      return;
    }

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
```

Add Einstein's charge handling. Add a public helper and a new move type:

```js
  function isCharging(state, playerIdx) {
    return typeof state.players[playerIdx].statuses.charging === "number";
  }
```

In `applyMove`, BEFORE the `attack`/`defend`/`special` branches, add:

```js
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
```

Update the public surface:

```js
  return { createMatch, applyMove, isMatchOver, isCharging };
```

- [ ] **Step 4: Run tests**

Expected: `pass 32`. Iterate if any specific assertion fails — re-read the test and trace through `dealDamage`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: Golda buff+counter and Einstein charge sequence"
```

---

## Task 13: `combat.js` — AI move chooser

**Goal:** `chooseAIMove(state, playerIdx, rng)` returns a move string ("attack" / "defend" / "special" / "charge"). `rng` is a function that returns a number in [0, 1) — injected for deterministic tests.

**Weights:**
- If charging: always "charge".
- Else if special is on cooldown: attack 70%, defend 30%.
- Else: attack 55%, defend 30%, special 15%.

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append
test("AI: while charging, always returns 'charge'", () => {
  const s = Combat.createMatch("einstein", "moses");
  Combat.applyMove(s, "special"); // charging=2
  // Bypass Moses's turn for test purposes — pretend state.activePlayer = 0
  s.activePlayer = 0;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0), "charge");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.99), "charge");
});

test("AI: special on cooldown -> attack at low rng, defend at high rng", () => {
  const s = Combat.createMatch("moses", "david");
  s.players[0].specialCooldown = 2;
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.69), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.71), "defend");
});

test("AI: special available -> 0.0=attack, 0.6=defend, 0.9=special", () => {
  const s = Combat.createMatch("moses", "david");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.0),  "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.54), "attack");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.56), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.84), "defend");
  assert.strictEqual(Combat.chooseAIMove(s, 0, () => 0.86), "special");
});
```

- [ ] **Step 2: Run tests, confirm they fail**

- [ ] **Step 3: Implement `chooseAIMove`**

Add to `src/combat.js` (before the return):

```js
  function chooseAIMove(state, playerIdx, rng) {
    rng = rng || Math.random;
    const p = state.players[playerIdx];
    if (typeof p.statuses.charging === "number") return "charge";
    const r = rng();
    if (p.specialCooldown > 0) {
      return r < 0.70 ? "attack" : "defend";
    }
    if (r < 0.55) return "attack";
    if (r < 0.85) return "defend";
    return "special";
  }
```

Update the public surface:

```js
  return { createMatch, applyMove, isMatchOver, isCharging, chooseAIMove };
```

- [ ] **Step 4: Run tests**

Expected: `pass 35`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: AI move chooser with injectable RNG"
```

---

## Task 14: `combat.js` — arcade ladder helper

**Goal:** `arcadeOrder(playerHeroId)` returns the 6 opponent hero ids in fixed order (so the player always sees the same ladder).

**Files:**
- Modify: `src/combat.js`
- Modify: `test/test-combat.js`

- [ ] **Step 1: Append failing tests**

```js
// append
test("arcadeOrder: returns the other 6 heroes in a fixed order", () => {
  const order = Combat.arcadeOrder("moses");
  assert.strictEqual(order.length, 6);
  assert.ok(!order.includes("moses"));
  // Order must be stable
  assert.deepStrictEqual(order, Combat.arcadeOrder("moses"));
});

test("arcadeOrder: for david omits david but includes moses", () => {
  const order = Combat.arcadeOrder("david");
  assert.ok(!order.includes("david"));
  assert.ok(order.includes("moses"));
  assert.strictEqual(order.length, 6);
});
```

- [ ] **Step 2: Run tests, confirm they fail**

- [ ] **Step 3: Implement `arcadeOrder`**

```js
  const LADDER = ["moses", "david", "esther", "judah", "rambam", "golda", "einstein"];

  function arcadeOrder(playerHeroId) {
    return LADDER.filter(id => id !== playerHeroId);
  }
```

Update public surface:

```js
  return { createMatch, applyMove, isMatchOver, isCharging, chooseAIMove, arcadeOrder };
```

- [ ] **Step 4: Run tests**

Expected: `pass 37`.

- [ ] **Step 5: Commit**

```bash
git add src/combat.js test/test-combat.js
git commit -m "combat: arcade ladder ordering helper"
```

---

## Task 15: `render.js` — color tokens, HP bar, callout helper

**Goal:** Pure SVG/HTML-string composers shared across screens.

**Files:**
- Create: `src/render.js`
- Create: `test/test-render.js`

- [ ] **Step 1: Write smoke tests**

```js
// test/test-render.js
const test = require("node:test");
const assert = require("node:assert");
const Render = require("../src/render.js");

test("colors object has the named palette tokens", () => {
  for (const k of ["bg", "ink", "terracotta", "olive", "cream", "navy", "gold"]) {
    assert.ok(typeof Render.colors[k] === "string");
  }
});

test("hpBar returns SVG containing fill width proportional to hp/max", () => {
  const out = Render.hpBar({ hp: 50, max: 100, label: "Moses", side: "left" });
  assert.match(out, /<svg/);
  assert.match(out, /Moses/);
  // 50/100 means fill width is half of inner area; sanity-check digit appears
  assert.match(out, /width="\d+/);
});

test("hpBar handles 0 hp without crashing", () => {
  const out = Render.hpBar({ hp: 0, max: 100, label: "Moses", side: "left" });
  assert.match(out, /<svg/);
});

test("callout returns markup containing the given text", () => {
  const out = Render.callout("Moses uses Part the Sea!");
  assert.match(out, /Part the Sea/);
});
```

- [ ] **Step 2: Run tests, confirm they fail**

- [ ] **Step 3: Implement `src/render.js`**

```js
const Render = (function () {
  const colors = {
    bg: "#faf3e0",
    ink: "#1a1a1a",
    terracotta: "#c1462d",
    olive: "#6b8e23",
    cream: "#fff8e7",
    navy: "#1a2a4f",
    gold: "#d4a574"
  };

  function hpBar({ hp, max, label, side }) {
    const W = 320, H = 32;
    const padding = 4;
    const innerW = W - padding * 2;
    const fillW = Math.max(0, Math.floor(innerW * (hp / max)));
    const fillColor = hp > max * 0.5 ? colors.olive : hp > max * 0.25 ? "#d4a017" : colors.terracotta;
    const labelX = side === "right" ? W - 12 : 12;
    const labelAnchor = side === "right" ? "end" : "start";
    return `
<svg viewBox="0 0 ${W} ${H + 24}" width="${W}" height="${H + 24}" xmlns="http://www.w3.org/2000/svg">
  <text x="${labelX}" y="18" font-family="Georgia,serif" font-size="18" font-weight="700"
        fill="${colors.ink}" text-anchor="${labelAnchor}">${escapeXml(label)}</text>
  <rect x="0" y="24" width="${W}" height="${H}" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="3" rx="6" />
  <rect x="${padding}" y="${24 + padding}" width="${fillW}" height="${H - padding * 2}" fill="${fillColor}" rx="3" />
  <text x="${W / 2}" y="${24 + H / 2 + 5}" font-family="Georgia,serif" font-size="14" font-weight="700"
        fill="${colors.ink}" text-anchor="middle">${hp} / ${max}</text>
</svg>`;
  }

  function callout(text) {
    return `<div class="callout">${escapeHtml(text)}</div>`;
  }

  function escapeXml(s) {
    return String(s).replace(/[<>&'"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" }[c]));
  }
  function escapeHtml(s) {
    return String(s).replace(/[<>&"']/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;" }[c]));
  }

  return { colors, hpBar, callout, escapeXml, escapeHtml };
})();

if (typeof module !== "undefined") module.exports = Render;
```

- [ ] **Step 4: Add `.callout` styles to `styles/main.css`**

Append:

```css
.callout {
  position: absolute;
  top: 40%; left: 50%;
  transform: translate(-50%, -50%);
  background: var(--cream);
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 12px;
  padding: 16px 28px;
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: 700;
  box-shadow: 6px 6px 0 var(--shadow);
  z-index: 10;
  animation: callout-pop 1200ms ease-out forwards;
}
@keyframes callout-pop {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
  20%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
  40%  { transform: translate(-50%, -50%) scale(1); }
  85%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -55%) scale(0.95); }
}
```

- [ ] **Step 5: Run tests**

Expected: `pass 4`.

- [ ] **Step 6: Commit**

```bash
git add src/render.js test/test-render.js styles/main.css
git commit -m "render: color tokens, HP bar SVG, callout helper"
```

---

## Task 16: `render.js` — hero SVGs (all 7)

**Goal:** Add `renderHero({ heroId, pose, facing })` that returns an SVG string for a paper-cutout silhouette of the requested hero. `pose` is `"idle" | "attack"`; `facing` is `"left" | "right"`.

Each hero is drawn from ~5–10 simple shapes plus a unique prop. Aim for recognizable, not realistic.

**Files:**
- Modify: `src/render.js`
- Modify: `test/test-render.js`

- [ ] **Step 1: Append smoke tests**

```js
// append to test/test-render.js
const HERO_IDS = ["moses","david","esther","judah","rambam","golda","einstein"];

test("renderHero returns non-empty SVG for each hero in both poses and facings", () => {
  for (const id of HERO_IDS) {
    for (const pose of ["idle", "attack"]) {
      for (const facing of ["left", "right"]) {
        const svg = Render.renderHero({ heroId: id, pose, facing });
        assert.match(svg, /<svg/, `${id} ${pose} ${facing} missing <svg`);
        assert.ok(svg.length > 100, `${id} svg too short`);
      }
    }
  }
});

test("renderHero throws on unknown hero id", () => {
  assert.throws(() => Render.renderHero({ heroId: "nobody", pose: "idle", facing: "left" }));
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

- [ ] **Step 3: Add `renderHero` to `src/render.js`**

Insert before `return { ... }`:

```js
  // Each hero builder returns the INNER SVG shapes; renderHero wraps them.
  const HERO_BUILDERS = {
    moses(pose) {
      const lunge = pose === "attack" ? 18 : 0;
      return `
        <ellipse cx="100" cy="180" rx="60" ry="6" fill="#000" opacity="0.2" />
        <!-- robe -->
        <path d="M60,180 L70,80 Q100,70 130,80 L140,180 Z" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- head -->
        <circle cx="100" cy="55" r="22" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- beard -->
        <path d="M82,60 Q100,95 118,60 Q118,75 100,80 Q82,75 82,60Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- staff -->
        <line x1="${145 + lunge}" y1="40" x2="${130 + lunge}" y2="170" stroke="${colors.ink}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="${145 + lunge}" cy="40" r="6" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    david(pose) {
      const lunge = pose === "attack" ? 22 : 0;
      return `
        <ellipse cx="100" cy="180" rx="50" ry="6" fill="#000" opacity="0.2"/>
        <path d="M65,180 L75,80 Q100,70 125,80 L135,180 Z" fill="${colors.olive}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="55" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- crown -->
        <path d="M82,40 L88,28 L94,40 L100,26 L106,40 L112,28 L118,40 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- sling pouch swinging -->
        <circle cx="${135 + lunge}" cy="${110 - lunge / 2}" r="8" fill="${colors.ink}" />
        <line x1="125" y1="100" x2="${135 + lunge}" y2="${110 - lunge / 2}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    esther(pose) {
      const lunge = pose === "attack" ? 12 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M60,180 L75,90 Q100,75 125,90 L140,180 Z" fill="${colors.navy}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- veil -->
        <path d="M70,70 Q100,40 130,70 Q130,90 100,95 Q70,90 70,70Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>
        <circle cx="100" cy="65" r="18" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- scepter -->
        <line x1="${135 + lunge}" y1="60" x2="${125 + lunge}" y2="160" stroke="${colors.ink}" stroke-width="4"/>
        <circle cx="${135 + lunge}" cy="55" r="6" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    judah(pose) {
      const lunge = pose === "attack" ? 24 : 0;
      return `
        <ellipse cx="100" cy="180" rx="60" ry="6" fill="#000" opacity="0.2"/>
        <!-- breastplate -->
        <rect x="70" y="90" width="60" height="80" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="3" rx="6"/>
        <rect x="80" y="100" width="40" height="10" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="1"/>
        <!-- helmet -->
        <path d="M80,55 Q100,30 120,55 L120,75 L80,75 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="65" r="16" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- spear -->
        <line x1="${145 + lunge}" y1="30" x2="${135 + lunge}" y2="170" stroke="${colors.ink}" stroke-width="5"/>
        <path d="M${140 + lunge},20 L${145 + lunge},5 L${150 + lunge},20 Z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    rambam(pose) {
      const lunge = pose === "attack" ? 10 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M60,180 L70,80 Q100,70 130,80 L140,180 Z" fill="${colors.navy}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="55" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- white beard -->
        <path d="M80,60 Q100,110 120,60 Q120,90 100,100 Q80,90 80,60Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- book -->
        <rect x="${135 + lunge}" y="110" width="22" height="28" fill="${colors.terracotta}" stroke="${colors.ink}" stroke-width="3"/>
        <line x1="${146 + lunge}" y1="110" x2="${146 + lunge}" y2="138" stroke="${colors.ink}" stroke-width="2"/>`;
    },
    golda(pose) {
      const lunge = pose === "attack" ? 14 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M60,180 L75,90 Q100,80 125,90 L140,180 Z" fill="${colors.olive}" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="60" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- bun hair -->
        <ellipse cx="100" cy="42" rx="22" ry="14" fill="${colors.ink}"/>
        <!-- handbag -->
        <rect x="${130 + lunge}" y="120" width="22" height="22" fill="${colors.ink}" />
        <path d="M${130 + lunge},120 Q${141 + lunge},108 ${152 + lunge},120" fill="none" stroke="${colors.ink}" stroke-width="3"/>`;
    },
    einstein(pose) {
      const lunge = pose === "attack" ? 8 : 0;
      return `
        <ellipse cx="100" cy="180" rx="55" ry="6" fill="#000" opacity="0.2"/>
        <path d="M65,180 L75,90 Q100,80 125,90 L135,180 Z" fill="#777" stroke="${colors.ink}" stroke-width="3"/>
        <circle cx="100" cy="55" r="20" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3"/>
        <!-- wild hair -->
        <path d="M78,40 Q70,15 95,32 Q90,5 105,30 Q120,8 115,35 Q140,20 125,45 Q140,55 122,50 Q130,70 110,55 Q90,72 78,55 Q60,60 78,40Z" fill="${colors.cream}" stroke="${colors.ink}" stroke-width="2"/>
        <!-- mustache -->
        <path d="M88,62 Q100,72 112,62" fill="none" stroke="${colors.ink}" stroke-width="3"/>
        <!-- chalkboard -->
        <rect x="${130 + lunge}" y="100" width="32" height="22" fill="${colors.ink}" stroke="${colors.ink}" stroke-width="2"/>
        <text x="${146 + lunge}" y="116" font-family="Georgia,serif" font-size="11" fill="${colors.cream}" text-anchor="middle">E=mc²</text>`;
    }
  };

  function renderHero({ heroId, pose, facing }) {
    const builder = HERO_BUILDERS[heroId];
    if (!builder) throw new Error(`unknown hero: ${heroId}`);
    const flip = facing === "right" ? "" : ` transform="scale(-1,1) translate(-200,0)"`;
    return `<svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <g${flip}>${builder(pose)}</g>
</svg>`;
  }
```

Update the public surface:

```js
  return { colors, hpBar, callout, escapeXml, escapeHtml, renderHero };
```

- [ ] **Step 4: Run tests**

Expected: `pass 6`.

- [ ] **Step 5: Manual sanity check**

Open a scratch HTML file (or temporarily edit `index.html` body) to render all 7 heroes side by side. Confirm each is visually distinct and recognizable. Revert any temporary edit before commit.

- [ ] **Step 6: Commit**

```bash
git add src/render.js test/test-render.js
git commit -m "render: paper-cutout SVG silhouettes for all 7 heroes"
```

---

## Task 17: `stages.js` — themed stage backgrounds

**Goal:** Per-hero stage SVG. Each stage is a flat layered background ~800x300px.

**Files:**
- Create: `src/stages.js`
- Create: `test/test-stages.js`

- [ ] **Step 1: Write smoke tests**

```js
// test/test-stages.js
const test = require("node:test");
const assert = require("node:assert");
const Stages = require("../src/stages.js");

const EXPECTED = ["redsea", "elah", "throne", "temple", "cordoba", "knesset", "princeton"];

test("Stages.byId returns SVG for every known stage", () => {
  for (const id of EXPECTED) {
    const svg = Stages.byId(id);
    assert.match(svg, /<svg/, `${id} missing svg`);
    assert.ok(svg.length > 200, `${id} svg too short`);
  }
});

test("Stages.byId returns a fallback (not throws) for unknown id", () => {
  const svg = Stages.byId("nonsense");
  assert.match(svg, /<svg/);
});
```

- [ ] **Step 2: Run tests, confirm they fail**

- [ ] **Step 3: Implement `src/stages.js`**

```js
const Stages = (function () {
  const Render = (typeof require !== "undefined") ? require("./render.js") : window.Render;
  const C = Render.colors;
  const W = 800, H = 300;

  function frame(content) {
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
  }

  const STAGES = {
    redsea() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#a8d5e5"/>
        <rect y="200" width="${W}" height="100" fill="#e8d59a"/>
        <path d="M0,200 Q100,180 200,200 T400,200 T600,200 T${W},200 L${W},220 L0,220Z" fill="${C.navy}" opacity="0.6"/>
        <path d="M0,160 Q200,140 400,160 T${W},160 L${W},200 L0,200Z" fill="${C.navy}" opacity="0.4"/>
      `);
    },
    elah() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#cfe6c5"/>
        <path d="M0,200 L150,120 L300,180 L450,100 L600,170 L800,150 L${W},${H} L0,${H} Z" fill="${C.olive}" />
        <rect y="240" width="${W}" height="60" fill="#a8b97a"/>
        <circle cx="700" cy="60" r="30" fill="${C.gold}"/>
      `);
    },
    throne() {
      return frame(`
        <rect width="${W}" height="${H}" fill="${C.terracotta}" opacity="0.6"/>
        <rect y="240" width="${W}" height="60" fill="${C.navy}"/>
        <rect x="60" width="60" height="240" fill="${C.gold}" opacity="0.5"/>
        <rect x="680" width="60" height="240" fill="${C.gold}" opacity="0.5"/>
        <rect x="60" y="40" width="680" height="20" fill="${C.gold}"/>
        <rect x="350" y="180" width="100" height="60" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>
      `);
    },
    temple() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#f1e3b3"/>
        <rect y="240" width="${W}" height="60" fill="#d9c187"/>
        <!-- columns -->
        <rect x="100" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="300" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="500" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="660" y="80" width="40" height="160" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="80" y="60" width="640" height="30" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>
        <!-- menorah -->
        <path d="M400,180 L380,200 L390,220 L410,220 L420,200 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>
      `);
    },
    cordoba() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#fff2d6"/>
        <rect y="240" width="${W}" height="60" fill="#c79c5b"/>
        <path d="M120,240 L120,140 Q180,80 240,140 L240,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M340,240 L340,140 Q400,80 460,140 L460,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
        <path d="M560,240 L560,140 Q620,80 680,140 L680,240 Z" fill="${C.terracotta}" stroke="${C.ink}" stroke-width="3"/>
      `);
    },
    knesset() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#d9d1c2"/>
        <rect y="240" width="${W}" height="60" fill="${C.navy}"/>
        <rect x="200" y="100" width="400" height="140" fill="${C.cream}" stroke="${C.ink}" stroke-width="3"/>
        <rect x="240" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="320" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="400" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="480" y="140" width="40" height="100" fill="${C.navy}"/>
        <rect x="560" y="140" width="40" height="100" fill="${C.navy}"/>
      `);
    },
    princeton() {
      return frame(`
        <rect width="${W}" height="${H}" fill="#2b3a55"/>
        <rect x="40" y="40" width="${W - 80}" height="200" fill="${C.ink}" stroke="${C.cream}" stroke-width="4"/>
        <text x="${W / 2}" y="130" font-family="Georgia,serif" font-size="48" fill="${C.cream}" text-anchor="middle">E = m c²</text>
        <text x="${W / 2}" y="190" font-family="Georgia,serif" font-size="22" fill="${C.cream}" opacity="0.7" text-anchor="middle">∇·E = ρ/ε₀</text>
      `);
    }
  };

  function byId(id) {
    const fn = STAGES[id] || STAGES.redsea;
    return fn();
  }

  return { byId };
})();

if (typeof module !== "undefined") module.exports = Stages;
```

- [ ] **Step 4: Run tests**

Expected: `pass 2`.

- [ ] **Step 5: Commit**

```bash
git add src/stages.js test/test-stages.js
git commit -m "stages: themed flat backgrounds for all 7 hero stages"
```

---

## Task 18: `audio.js` — SFX manager (no real SFX yet)

**Goal:** A small object that loads sounds by id and plays them. Mute toggle. Gracefully no-ops if audio fails. Real WAV files are placed in `assets/sfx/` in a later task; for now, define the interface and a SILENCE fallback.

**Files:**
- Create: `src/audio.js`

- [ ] **Step 1: Implement `src/audio.js`**

```js
const Audio = (function () {
  const SOURCES = {
    attack:  "assets/sfx/attack.wav",
    defend:  "assets/sfx/defend.wav",
    victory: "assets/sfx/victory.wav",
    moses:    "assets/sfx/moses.wav",
    david:    "assets/sfx/david.wav",
    esther:   "assets/sfx/esther.wav",
    judah:    "assets/sfx/judah.wav",
    rambam:   "assets/sfx/rambam.wav",
    golda:    "assets/sfx/golda.wav",
    einstein: "assets/sfx/einstein.wav"
  };

  const elements = {};
  let muted = true;

  function preload() {
    if (typeof window === "undefined" || typeof window.Audio !== "function") return;
    for (const [id, src] of Object.entries(SOURCES)) {
      try {
        const el = new window.Audio(src);
        el.preload = "auto";
        elements[id] = el;
      } catch (_) { /* ignore */ }
    }
  }

  function play(id) {
    if (muted) return;
    const el = elements[id];
    if (!el) return;
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) { /* ignore */ }
  }

  function setMuted(value) { muted = !!value; }
  function isMuted() { return muted; }

  return { preload, play, setMuted, isMuted };
})();

if (typeof module !== "undefined") module.exports = Audio;
```

No tests (audio is browser-only and side-effect-heavy). It's tested manually in Task 28.

- [ ] **Step 2: Commit**

```bash
git add src/audio.js
git commit -m "audio: SFX manager skeleton with mute toggle and safe fallbacks"
```

---

## Task 19: `screens.js` — title, mode select, opponent select

**Goal:** First three screen renderers. Each takes the global app state and returns an HTML string. Click handlers are wired via `data-action` attributes that `main.js` will dispatch. The "opponent select" screen appears only in Quick Match flow, between Mode and Character Select, to let the player choose human-vs-AI or human-vs-human.

**Files:**
- Create: `src/screens.js`

- [ ] **Step 1: Implement `src/screens.js` (initial)**

```js
const Screens = (function () {
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

  return { renderTitle, renderModeSelect, renderOpponentSelect };
})();

if (typeof module !== "undefined") module.exports = Screens;
```

- [ ] **Step 2: Append screen CSS to `styles/main.css`**

```css
.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  gap: 24px;
}
.screen-title h1 { font-size: 64px; color: var(--navy); }
.tagline { font-size: 20px; color: var(--ink); opacity: 0.75; }
.title-buttons { display: flex; flex-direction: column; gap: 16px; align-items: stretch; min-width: 280px; }
.title-buttons button { font-size: 22px; }
button.secondary { background: var(--cream); color: var(--ink); }
button.back { background: var(--cream); color: var(--ink); margin-top: 24px; font-size: 18px; padding: 10px 20px; }
.stats { font-size: 14px; color: var(--ink); opacity: 0.6; }

.mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 800px; width: 100%; }
.mode-card { display: flex; flex-direction: column; align-items: flex-start; text-align: left; padding: 28px; gap: 8px; background: var(--cream); color: var(--ink); }
.mode-card h3 { font-size: 26px; color: var(--terracotta); }
.mode-card p { font-size: 16px; }

@media (max-width: 700px) { .mode-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Manual verification (skip until main.js wires this)**

Mark a note: full verification deferred to Task 24 when `main.js` mounts these screens.

- [ ] **Step 4: Commit**

```bash
git add src/screens.js styles/main.css
git commit -m "screens: title, mode-select, and opponent-select renderers"
```

---

## Task 20: `screens.js` — character select

**Goal:** Render the 7-hero grid. Each hero shows portrait, name, era badge, bio, and the 3 moves. Click on a card dispatches `pick-hero` with the hero id and the current "slot" (player 1 or player 2 or arcade).

**Files:**
- Modify: `src/screens.js`
- Modify: `styles/main.css`

- [ ] **Step 1: Add `renderCharSelect` to `src/screens.js`**

Inside the IIFE (uses `Heroes` and `Render`, loaded already as globals in the browser; for Node, `require` is fine since this module is browser-only and won't be tested):

Replace the top of the IIFE with imports that work in both:

```js
const Screens = (function () {
  const Heroes = (typeof require !== "undefined") ? require("./heroes.js") : window.Heroes;
  const Render = (typeof require !== "undefined") ? require("./render.js") : window.Render;

  function renderTitle(state) { /* unchanged */ }
  function renderModeSelect(state) { /* unchanged */ }

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
```

Update the export:

```js
  return { renderTitle, renderModeSelect, renderCharSelect };
```

- [ ] **Step 2: Append CSS**

```css
.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  max-width: 1000px;
  width: 100%;
}
.hero-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  background: var(--cream);
  color: var(--ink);
  padding: 16px;
  gap: 10px;
}
.hero-portrait { display: flex; justify-content: center; align-items: center; height: 160px; background: #fff; border: 2px solid var(--ink); border-radius: 6px; }
.hero-portrait svg { max-height: 100%; max-width: 100%; }
.hero-meta h3 { font-size: 20px; color: var(--navy); margin-bottom: 0; }
.hero-meta .era { display: inline-block; font-size: 12px; background: var(--gold); color: var(--ink); padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; }
.hero-meta .bio { font-size: 14px; line-height: 1.4; margin-bottom: 6px; }
.hero-meta .moves { font-size: 12px; line-height: 1.5; list-style: none; }
.hero-meta .moves li { margin-bottom: 2px; }
```

- [ ] **Step 3: Commit**

```bash
git add src/screens.js styles/main.css
git commit -m "screens: character select grid with bios and move previews"
```

---

## Task 21: `screens.js` — battle screen (static)

**Goal:** Render the arena: stage background, both heroes facing each other, HP bars, the 3 move buttons for the active player, and a move log strip. No animations or callouts yet — those land in Task 22.

**Files:**
- Modify: `src/screens.js`
- Modify: `styles/main.css`

- [ ] **Step 1: Add `renderBattle` to `src/screens.js`**

Add inside the IIFE:

```js
  const Stages = (typeof require !== "undefined") ? require("./stages.js") : window.Stages;
  const Combat = (typeof require !== "undefined") ? require("./combat.js") : window.Combat;

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
```

Update the export:

```js
  return { renderTitle, renderModeSelect, renderCharSelect, renderBattle };
```

- [ ] **Step 2: Append battle CSS**

```css
.screen-battle { gap: 14px; }
.hp-bars { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; width: 100%; max-width: 900px; }
.hp-cell { display: flex; }
.hp-cell:nth-child(3) { justify-content: flex-end; }
.vs-label { font-family: var(--font-heading); font-size: 28px; font-weight: 700; color: var(--terracotta); }

.arena {
  position: relative;
  width: 100%;
  max-width: 900px;
  aspect-ratio: 8 / 3;
  border: 3px solid var(--ink);
  border-radius: 10px;
  overflow: hidden;
  background: var(--cream);
}
.stage svg { display: block; width: 100%; height: 100%; }
.fighter { position: absolute; bottom: 8%; width: 22%; }
.fighter svg { width: 100%; height: auto; }
.fighter-left { left: 4%; }
.fighter-right { right: 4%; }

.turn-banner { font-family: var(--font-heading); font-size: 22px; font-weight: 700; color: var(--navy); }

.moves-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; width: 100%; max-width: 900px; }
.moves-row button { display: flex; flex-direction: column; gap: 4px; padding: 14px 18px; text-align: left; }
.moves-row button strong { font-size: 18px; }
.moves-row button .sub { font-size: 13px; opacity: 0.85; font-weight: normal; }

.move-log { width: 100%; max-width: 900px; min-height: 80px; padding: 10px 14px; background: var(--cream); border: 2px solid var(--ink); border-radius: 6px; font-size: 14px; line-height: 1.6; }
.move-log div + div { border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 4px; margin-top: 4px; }
```

- [ ] **Step 3: Commit**

```bash
git add src/screens.js styles/main.css
git commit -m "screens: static battle layout with HP, arena, moves, log"
```

---

## Task 22: `screens.js` — battle animations and callouts

**Goal:** When a move resolves, show the callout ("Moses uses Part the Sea!") and a brief lunge animation on the attacking hero. Hand-rolled via CSS keyframes triggered by an "action class" added then removed.

**Files:**
- Modify: `src/screens.js`
- Modify: `styles/main.css`

- [ ] **Step 1: Add `animateAction` and `showCallout` exports**

These are imperative side-effect functions that operate on the live DOM. They are called by `main.js` after each move resolves.

Add to `src/screens.js` (inside the IIFE):

```js
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
```

Update the export:

```js
  return { renderTitle, renderModeSelect, renderCharSelect, renderBattle, animateAction, showCallout };
```

- [ ] **Step 2: Append CSS animations**

```css
.fighter { transition: transform 300ms ease-out; }
.fighter-left.act-attack  { transform: translateX(40px); }
.fighter-right.act-attack { transform: translateX(-40px); }
.fighter-left.act-special  { transform: translateX(60px) translateY(-12px) scale(1.05); }
.fighter-right.act-special { transform: translateX(-60px) translateY(-12px) scale(1.05); }
.fighter-left.act-defend, .fighter-right.act-defend { transform: scale(0.95); }
```

- [ ] **Step 3: Commit**

```bash
git add src/screens.js styles/main.css
git commit -m "screens: battle animations and move callouts"
```

---

## Task 23: `screens.js` — result + arcade ending cards

**Goal:**
- `renderResult(state)`: shows winner with flourish; Play Again / Main Menu buttons. In Arcade mode mid-ladder, advance to next opponent instead.
- `renderArcadeEnding(state, heroId)`: shown after the player wins all 6 fights in Arcade — a one-paragraph "ending" celebrating their hero's victory tour.

**Files:**
- Modify: `src/screens.js`

- [ ] **Step 1: Add to `src/screens.js`**

```js
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
      const playerWon = match.players[match.players.findIndex(p => p.heroId === playerHeroId)] === match.players[winnerIdx];
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
```

Append to `styles/main.css`:

```css
.screen-result h2 { font-size: 40px; color: var(--terracotta); }
.result-buttons { display: flex; gap: 16px; }
.screen-ending .ending { font-size: 22px; font-style: italic; max-width: 600px; text-align: center; color: var(--navy); }
```

Update the export:

```js
  return { renderTitle, renderModeSelect, renderCharSelect, renderBattle, animateAction, showCallout, renderResult };
```

- [ ] **Step 2: Commit**

```bash
git add src/screens.js styles/main.css
git commit -m "screens: result and arcade ending card renderers"
```

---

## Task 24: `screens.js` — tutorial + help overlay

**Goal:** A 4-step tutorial that pops up the first time the app opens, and is re-runnable from the title screen. Plus a "?" help button reachable from every screen.

**Files:**
- Modify: `src/screens.js`
- Modify: `styles/main.css`

- [ ] **Step 1: Add to `src/screens.js`**

```js
  const TUTORIAL_STEPS = [
    {
      title: "Welcome to Jewish Heroes",
      body: "You'll duel as a hero from Jewish history. The first to lose all their HP loses the match."
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
```

Update the export:

```js
  return {
    renderTitle, renderModeSelect, renderCharSelect, renderBattle,
    renderResult, renderTutorial, renderHelp, renderHelpButton,
    animateAction, showCallout
  };
```

Append CSS:

```css
.overlay {
  position: fixed; inset: 0;
  background: rgba(26, 26, 26, 0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.overlay-card {
  background: var(--cream);
  padding: 32px;
  max-width: 480px;
  width: 90%;
  border: 3px solid var(--ink);
  border-radius: 12px;
  box-shadow: 8px 8px 0 var(--shadow);
}
.overlay-card h3 { color: var(--navy); margin-bottom: 12px; }
.overlay-card p { font-size: 16px; margin-bottom: 20px; }
.overlay-buttons { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.overlay-progress { margin-top: 16px; font-size: 13px; color: var(--ink); opacity: 0.6; text-align: center; }
.help-list { list-style: disc inside; line-height: 1.7; margin-bottom: 20px; }

.help-button {
  position: fixed;
  top: 16px; right: 16px;
  width: 44px; height: 44px;
  padding: 0;
  font-size: 24px;
  border-radius: 22px;
  background: var(--cream);
  color: var(--ink);
  z-index: 50;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens.js styles/main.css
git commit -m "screens: tutorial overlay and help button"
```

---

## Task 25: `main.js` — state machine + event wiring

**Goal:** Replace the boot stub with the full app. State machine has these top-level "screens": `title`, `mode`, `charselect`, `battle`, `result`, plus optional `tutorial` and `help` overlays.

**Files:**
- Modify: `index.html`
- Rewrite: `src/main.js`

- [ ] **Step 1: Update `index.html` to load all scripts**

Replace `<script src="src/main.js"></script>` with:

```html
  <script src="src/heroes.js"></script>
  <script src="src/render.js"></script>
  <script src="src/stages.js"></script>
  <script src="src/storage.js"></script>
  <script src="src/audio.js"></script>
  <script src="src/combat.js"></script>
  <script src="src/screens.js"></script>
  <script src="src/main.js"></script>
```

- [ ] **Step 2: Rewrite `src/main.js`**

```js
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
        // If first turn is AI (it's not — P1 is human and starts), nothing to schedule
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
```

- [ ] **Step 3: Manual smoke test — full flow**

Open `index.html` in a browser. Walk through:

1. Tutorial overlay appears on first launch. Click through all 4 steps. Verify it closes and doesn't reappear on refresh.
2. Click BEGIN → Mode select. Click Quick Match → "Who is your opponent?" screen. Click "A Friend on This Keyboard" → Character select with "Player 1, pick your hero".
3. Pick Moses. Header changes to "Player 2, pick your hero". Pick David.
   - Also test the AI path: from title, BEGIN → Quick Match → "The Computer" → pick Moses → match begins immediately with a randomly chosen opponent.
4. Battle screen appears with both heroes, HP bars, stage. Three move buttons.
5. Click Attack — Moses lunges, callout appears, David's HP drops. Now P2's buttons appear.
6. Repeat until someone hits 0 HP. Result screen shows winner.
7. Click Play Again → battle restarts with the same heroes.
8. Click Main Menu → Title.
9. Click BEGIN → Arcade Ladder. Pick Moses. Battle vs David (or whichever is first).
10. Win the match → "Next Opponent" → next battle. Continue until you've beaten all 6 or lost.
11. After all 6 wins, see the ending card. Verify arcade-wins counter on title bumped by 1.

Document any rendering bugs. Fix inline; re-test.

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.js
git commit -m "main: state machine wiring all screens, modes, and AI loop"
```

---

## Task 26: Final pass — keyboard, sound files, polish

**Goal:** Drop in real SFX files, verify keyboard shortcuts, accessibility pass, cross-browser smoke.

**Files:**
- Add: `assets/sfx/attack.wav`, `defend.wav`, `victory.wav`, plus one per hero (`moses.wav`, etc.)
- Possibly: small CSS tweaks

- [ ] **Step 1: Source or generate SFX**

For each filename above, source short royalty-free clips (e.g. Freesound CC0, OpenGameArt) OR generate via:

```bash
# Example using sox (if installed) to make a 200ms thwack:
sox -n assets/sfx/attack.wav synth 0.15 noise band 400 100 fade t 0.01 0.15 0.05 vol 0.4
sox -n assets/sfx/defend.wav synth 0.20 sine 700 fade t 0.01 0.20 0.05 vol 0.3
sox -n assets/sfx/victory.wav synth 1.0 sine 523:1047 fade t 0.05 1.0 0.20 vol 0.4
# Hero specials — vary frequencies for distinction:
sox -n assets/sfx/moses.wav synth 0.8 sine 220 fade t 0.05 0.8 0.30 vol 0.4
sox -n assets/sfx/david.wav synth 0.5 noise fade t 0.05 0.5 0.20 vol 0.3
sox -n assets/sfx/esther.wav synth 0.6 sine 880:1320 fade t 0.05 0.6 0.20 vol 0.3
sox -n assets/sfx/judah.wav synth 0.7 noise band 200 50 fade t 0.05 0.7 0.30 vol 0.4
sox -n assets/sfx/rambam.wav synth 0.8 sine 1320 fade t 0.05 0.8 0.30 vol 0.2
sox -n assets/sfx/golda.wav synth 0.4 sine 330 fade t 0.05 0.4 0.10 vol 0.4
sox -n assets/sfx/einstein.wav synth 1.0 sine 110:1760 fade t 0.05 1.0 0.30 vol 0.4
```

If neither tool nor sources are available, ship silent 100ms WAVs as placeholders so calls don't 404. Hand-author one minimal silent WAV and copy it 10 times.

- [ ] **Step 2: Manual sound check**

Open the game, toggle sound on (button on title screen), play a match. Verify each move type produces a sound and signature specials are distinct.

- [ ] **Step 3: Keyboard shortcuts**

In a battle, press `1`, `2`, `3`. Each should trigger Attack / Defend / Special respectively when it's a human's turn.

- [ ] **Step 4: Accessibility check**

- Tab through title-screen buttons; focus ring visible.
- All move buttons have descriptive labels (not just icons).
- Text contrast: spot-check with the browser devtools color picker against tokens in `:root` — every body text on cream/bg should hit 4.5:1.

- [ ] **Step 5: Cross-browser smoke**

Open `index.html` in Chrome, Edge, and (if available) Firefox and Safari. In each:

- Complete one Quick Match against AI.
- Verify no console errors.
- Verify SVG renders (heroes visible).
- Verify localStorage persists arcade wins across refresh.

- [ ] **Step 6: Run full test suite one last time**

```bash
node --test test/
```

Expected: all tests pass.

- [ ] **Step 7: Final commit**

```bash
git add assets/sfx/
git commit -m "audio: ship SFX assets; final accessibility and cross-browser pass"
```

---

## Success criteria (recap from spec §13)

- [ ] A first-time player can complete a Quick Match vs AI without being told anything beyond "click the buttons."
- [ ] Two players on one keyboard can complete a match without confusion about whose turn it is.
- [ ] All 7 heroes are playable in both modes, each on their themed stage.
- [ ] Game loads and runs offline from a single folder with no console errors in Chrome, Edge, Firefox, Safari.
- [ ] Arcade Ladder completes end-to-end: pick hero → beat 6 opponents → ending card.

When all five boxes above are checked, the v1 is shipped.
