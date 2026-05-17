# Jewish Heroes — Design Spec

**Date:** 2026-05-16
**Project:** `jewish-game`
**Status:** Approved design, ready for implementation plan

## 1. Vision

A turn-based dueling game starring seven iconic figures from Jewish history. The game celebrates Jewish heritage through gameplay — themed stages, signature moves named after famous deeds, one-line hero bios — rather than through reading. Two design constraints drive every decision:

1. **A grandfather brand-new to games can pick it up in 30 seconds.** No reflex demands, no hidden mechanics, no jargon, no thin icons.
2. **The same game also works for two people on one keyboard.** Quick local 2-player with no setup overhead.

## 2. Audience and play modes

- **Primary player:** A grandfather with no prior gaming experience. Basic computer comfort (email, browsing).
- **Secondary player:** A family member playing alongside him on the same device.
- **Modes (both first-class):**
  - **Quick Match (1v1):** Pick two heroes, play one match. Each side can be Human or AI.
  - **Arcade Ladder (solo):** Pick a hero, fight the other six in sequence. Winning shows an ending card for your hero.

## 3. Technical approach

- **Platform:** Web browser (Chrome / Edge / Safari / Firefox, current versions).
- **Stack:** Vanilla HTML / CSS / JavaScript. No frameworks, no build step, no npm.
- **Art:** All visuals drawn in code via inline SVG and CSS. Zero external image files.
- **Audio:** A small folder of short SFX files (WAV or OGG). No music in v1.
- **Distribution:** Open `index.html` in any modern browser. The project folder is self-contained and works offline.
- **Persistence:** `localStorage` for arcade-ladder progress per hero, sound preference, and tutorial-seen flag. No accounts, no cloud sync, no telemetry.

## 4. Game structure — five screens

1. **Title** — Game title, "BEGIN" button, "How to Play" button, settings (sound on/off).
2. **Mode select** — Two large buttons: *Quick Match* / *Arcade Ladder*.
3. **Character select** — Grid of 7 hero portraits. Each card shows name, era badge, one-line bio, and the three moves with brief descriptions. In Quick Match, P1 picks then P2 (or AI auto-picks). In Arcade, just one pick.
4. **Battle** — Side-view arena, stage themed to the defender's hero. HP bars top of screen. Current player's three moves shown as big buttons at the bottom. Move log scrolls in a side strip.
5. **Result** — Winner shown with a flourish. *Play Again* / *Main Menu*. In Arcade, advance to the next opponent or show the hero's ending card after the sixth win.

A persistent **"?"** button in the corner re-opens a one-page quick reference at any time.

## 5. Combat mechanics

### Turn structure

Strictly sequential, Pokemon-style:

1. Player 1's turn — three move buttons appear. Click one. The move animates with a brief on-screen callout ("Moses uses Part the Sea!").
2. HP and cooldowns update.
3. Player 2's turn — same flow.
4. Repeat until one player's HP reaches 0.

No timers. No simultaneous reveal. No hidden information.

### Moves (every hero has these three slots)

- **Basic Attack** — Always available. Low-to-mid damage. No cooldown.
- **Defend** — Always available. No damage dealt. The next incoming **attack** against you is halved (rounded down). Defend persists across turns where the opponent does not attack (e.g., the opponent uses Defend, heals, or charges). Defend expires the moment an attack lands.
- **Signature Special** — Hero-unique. Higher impact (damage, heal, buff, status, or charge). Has a **3-turn cooldown** measured from the turn the Special completes its effect; the button greys out and shows "Ready in N" until ready.

### Status interactions (resolution order)

When a hero is struck by an attack, statuses resolve in this order:

1. **Esther's Reversal** (if active) — the attack is redirected back to the attacker at 1.5× damage, and Reversal expires. Esther's own Defend, if up, stays up.
2. **Defend** (if active) — incoming damage halved, Defend expires.
3. **Golda's Diplomatic Shield counter** (if Golda's Defend was the active Defend) — Golda's Defend also deals 5 damage back to the attacker after halving.
4. Damage applied to HP.

Status effects that tick over time (e.g., Judah's Menorah Flame) apply at the **start of the affected hero's turn**, before they choose a move. The HP bar visibly tickers down with the burn animation.

### AI behavior

One difficulty: **Friendly**. Each turn the AI rolls a weighted random:

- If Special is **off cooldown**: Basic Attack 55%, Defend 30%, Special 15%.
- If Special is **on cooldown**: Basic Attack 70%, Defend 30%.

The AI does **not** make context-aware decisions (it ignores HP totals, opponent buffs, etc.). This is intentional — it keeps the AI weak enough that a brand-new player wins roughly 60–70% of matches and feels they earned it.

### Math and balance

- Each hero has a base HP between 80 and 100 (see roster below).
- A typical match lasts 8–12 turns.
- Specials are tuned to roughly 2× a Basic Attack of the same hero, or equivalent value in heal / buff / status.

## 6. Roster

Seven heroes, spanning eras from biblical times to the modern era.

| Hero | Era | HP | Basic Attack | Defend | Signature Special | Stage |
|------|-----|----|--------------|--------|-------------------|-------|
| **Moses** | Biblical | 100 | Staff Strike — 10 dmg | Pillar of Cloud | **Part the Sea** — 25 dmg, animated wave sweep | Red Sea shore |
| **King David** | Biblical | 95 | Shepherd's Sling — 12 dmg | Lion's Cloak | **Sling Stone** — 22 dmg, +10 bonus if opponent HP > 50 | Valley of Elah |
| **Queen Esther** | Biblical | 90 | Royal Decree — 10 dmg | Court Veil | **Reversal** — next attack against her bounces back at 1.5× damage | Persian throne room |
| **Judah Maccabee** | Maccabees | 100 | Spear Thrust — 11 dmg | Phalanx Shield | **Menorah Flame** — 8 dmg now + 8 dmg/turn for 3 turns | Temple courtyard |
| **Maimonides (Rambam)** | Medieval | 85 | Wisdom Bolt — 9 dmg | Philosophical Calm | **Healing Touch** — restores 20 HP to self | Cordoba study |
| **Golda Meir** | Modern | 100 | Iron Word — 10 dmg | Diplomatic Shield (counters for 5 dmg when struck) | **Resolve** — next Basic Attack hits for double damage | Knesset chamber |
| **Albert Einstein** | Modern | 80 | Equation Spark — 8 dmg | Theory Shield | **E=mc²** — see note below | Princeton chalkboard |

**Einstein's E=mc² (special case):** When Einstein clicks Special, his next two turns auto-resolve as "Charging…" (no input required; opponent still takes their normal turns and can attack a defenseless Einstein). On his third turn, E=mc² unleashes for **40 damage**, then enters the standard 3-turn cooldown. Einstein cannot Defend or Basic Attack while charging.

**Judah's Menorah Flame (clarification):** The 8-damage burn ticks at the **start of the opponent's turn** for the next 3 turns (24 burn damage total, plus the initial 8 on cast = 32 total over 4 turns). The burn cannot be removed.

**Golda's Resolve (clarification):** Marks her next *Basic Attack* (not Special) for double damage. The buff persists until she lands a Basic Attack, even across multiple turns.

### Per-hero bio strings (character-select)

- **Moses** — Led the Israelites out of Egypt; received the Ten Commandments at Mount Sinai.
- **King David** — Shepherd boy who slew Goliath and became Israel's greatest king.
- **Queen Esther** — Saved her people from Haman's plot; her story is read every Purim.
- **Judah Maccabee** — Led the revolt that reclaimed and rededicated the Temple; the hero of Hanukkah.
- **Maimonides (Rambam)** — Medieval philosopher and physician; wrote the Mishneh Torah.
- **Golda Meir** — Israel's fourth Prime Minister; the "Iron Lady of Israel."
- **Albert Einstein** — Physicist whose theory of relativity changed how we understand the universe.

## 7. Visual style

- **Direction:** Paper-cutout flat illustration. Bold simple shapes, thick dark outlines, warm earth-tone palette (terracotta, olive green, cream, deep navy with gold accents).
- **Heroes:** SVG silhouettes built from a few solid shapes plus one iconic prop — Moses's staff, David's sling, Judah's menorah, Einstein's chalkboard, etc. Each hero has a single neutral pose plus an "attack lunge" pose. Animations are short tweens (200–400ms): translate, rotate, scale.
- **Stages:** Layered flat backgrounds — sky / horizon / ground / foreground prop. No parallax. Each stage is a small set of SVG shapes that render in under 50ms.
- **Typography:** Georgia (or platform serif fallback) for headings; system sans-serif for body and buttons. Minimum 20px button text, 16px body.
- **Color and contrast:** High contrast everywhere. No text below 4.5:1 contrast ratio. No color used as the only signal — moves also have icons and text labels.

## 8. Onboarding and accessibility

- **First-launch tutorial:** Pops up automatically the first time the app opens. A 4-screen guided walkthrough using Moses vs a dummy: (1) "Click Attack to strike", (2) "Click Defend to reduce the next hit", (3) "Click Special when it's ready", (4) "First to 0 HP loses". Skippable. Re-runnable from the title screen.
- **Always-visible "?" button** in the top-right corner re-opens a one-page quick reference (HP, the three move types, how to win).
- **No timing pressure.** Players take as long as they want on each turn.
- **Controls:** Mouse / touch only by default — every action is a click on a labeled button. Optional keyboard shortcuts: `1` / `2` / `3` for the three moves.
- **Move buttons** display name + short plain-English description ("Part the Sea — sweep David for 25 damage").
- **Settings:** Sound on/off, "show tutorial again" toggle, reset arcade progress.

## 9. Audio

- A handful of short SFX (most under 1 second, signature flourishes up to 2 seconds):
  - Generic "thwack" on Basic Attack
  - "Shing" on Defend
  - A unique flourish per hero's Special (shofar blast for Moses, sling-whirl for David, fire-crackle for Judah, soft chime for Rambam's heal, etc.)
  - A "victory" sting on match win
- No background music in v1.
- Sound is **off by default** to avoid surprising autoplay. Toggle is in settings.

## 10. Persistence

`localStorage` stores a single JSON blob under one key:

```json
{
  "arcade": { "moses": 0, "david": 0, "esther": 0, "judah": 0, "rambam": 0, "golda": 0, "einstein": 0 },
  "sound": false,
  "tutorialSeen": false
}
```

- `arcade.<hero>` is the number of times that hero has completed the Arcade Ladder.
- All writes are debounced to once per match end.
- If `localStorage` is unavailable, the game runs fine but state doesn't persist between sessions.

## 11. File layout

```
jewish-game/
├─ index.html              # entry point, screen container, HUD shell
├─ src/
│  ├─ main.js              # screen routing, top-level game state machine
│  ├─ combat.js            # turn resolution, damage math, cooldowns, AI
│  ├─ heroes.js            # roster data (stats, moves, bio strings)
│  ├─ stages.js            # stage definitions and SVG composers
│  ├─ render.js            # SVG hero & stage drawing, animation tweens
│  ├─ audio.js             # SFX loading and playback
│  └─ storage.js           # localStorage wrapper with fallback
├─ assets/
│  └─ sfx/                 # short WAV/OGG sound files (under 50KB each)
└─ styles/
   └─ main.css             # paper-cutout theme, typography, layout
```

Each `src/` module has one clear responsibility and exports a small surface area. `main.js` is the only file that touches the DOM container directly; everything else returns data or SVG strings for `main.js` / `render.js` to mount.

## 12. Out of scope (for v1)

To keep scope tight and the build shippable, these are explicitly excluded:

- Online or networked multiplayer
- Character unlocking, progression rewards, achievements, leaderboards
- Multiple difficulty levels (one "Friendly" AI is enough)
- Voice acting or character speech beyond text callouts
- Background music
- More than 7 heroes
- More than 3 moves per hero
- Customizable controls or remapping
- Internationalization (English only)
- Animations more complex than simple transform tweens

## 13. Success criteria

The game ships when:

1. A first-time player who has never used the app can complete a Quick Match against the AI without being told anything beyond "click the buttons".
2. Two players on one keyboard can complete a match without confusion about whose turn it is.
3. All 7 heroes are playable in both modes with their themed stages.
4. The full game loads and runs offline from a single folder, with no console errors in current Chrome / Edge / Firefox / Safari.
5. The Arcade Ladder completes end-to-end (pick hero → beat 6 opponents → see ending card).
