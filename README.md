# Heritage Heroes

A turn-based dueling game starring seven figures from Jewish history. It celebrates their stories through gameplay — themed stages, signature moves named after famous deeds, short bios, and optional trivia — rather than through reading.

Two design constraints drive every decision:

1. **A grandparent brand-new to games can pick it up in 30 seconds.** No reflex demands, no hidden mechanics, no jargon, no thin icons.
2. **The same game works for two people on one keyboard.** Quick local 2-player with no setup.

Built in plain HTML, CSS, and JavaScript — **no framework, no build step, no dependencies.** All art is drawn in code with inline SVG; all sound is synthesized with the Web Audio API. It runs offline as an installable PWA, and saves everything locally (no accounts, no cloud, no telemetry).

## Play

- **Hosted:** as a static PWA on GitHub Pages — https://jakethehoffer.github.io/heritage-heroes/
- **Locally, the simplest way:** open `index.html` in any modern browser (Chrome, Edge, Safari, Firefox). Works straight from the filesystem.
- **Locally, with offline/PWA support:** the service worker needs `http(s)` (not `file://`), so serve the folder:
  ```bash
  python -m http.server 8000
  # then open http://127.0.0.1:8000/
  ```

## The roster

| Hero | Era | Themed stage |
|------|-----|--------------|
| Moses | Biblical | The Red Sea |
| King David | Biblical | The Valley of Elah |
| Queen Esther | Biblical | The Royal Throne |
| Judah Maccabee | Maccabees | The Temple |
| Maimonides | Medieval | Córdoba |
| Golda Meir | Modern | The Knesset |
| Albert Einstein | Modern | Princeton |

Each hero has a unique signature special (a heal, a reflect, a burn, a charged blast, a buff, and so on).

## How combat works

Strictly sequential, Pokémon-style turns. On your turn you pick one of three moves:

- **Attack** — always available, low-to-mid damage, no cooldown.
- **Defend** — halves the next incoming attack; persists until an attack lands.
- **Signature Special** — hero-unique, higher impact, with a 3-turn cooldown measured from when its effect completes. Some specials open a heritage **trivia** question — answer correctly to land it.

First HP bar to zero loses. The AI is intentionally beatable so a new player wins most matches and feels they earned it; an unlockable Hard mode raises the stakes.

## Modes

- **Quick Match** — pick two heroes; each side can be human or AI, with stage select.
- **Quick Play** — one-click random matchup.
- **Arcade Ladder** — fight all six other heroes in sequence, ending in a boss.
- **Endless Survival** — back-to-back fights on carried-over HP; chase a high score.
- **Daily Challenge** — a deterministic matchup that changes each day, with a streak calendar.
- **Tournament** — a 4-slot bracket for 1–4 human players, AI filling the rest.
- **Spectator** — watch two AI heroes fight.
- **Practice** — consequence-free sandbox; pick both heroes and a stage, nothing is tracked.
- **Study Mode** & **Heritage Quiz** — trivia practice and a survival trivia run.

Plus a Hall of Heroes, hero comparison, stats, an achievement trophy room, daily quests, per-hero mastery tiers, and a match history with move-by-move replay. Accessibility options include large-text and high-contrast themes, full keyboard support, and master/music/SFX volume sliders.

## Development

No install step — the only "dependency" is Node.js (≥ 20) to run the test suite.

```bash
npm test        # runs the node:test suite (also: node --test)
```

Tests live in [`test/`](test/) and use Node's built-in test runner. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the suite on every push and pull request.

### Project layout

```
index.html            # entry point; loads the scripts below in order
styles/main.css        # all styling
src/
  heroes.js            # hero data: stats, moves, trivia
  stages.js            # SVG stage backdrops
  render.js            # SVG/markup helpers (incl. HTML escaping)
  combat.js            # battle engine: turns, specials, damage, AI, simulation
  storage.js           # localStorage load/save, migration, achievements, quests
  audio.js             # Web Audio synthesis (stage music + SFX)
  screens.js           # every screen and overlay (returns HTML strings)
  main.js              # state, routing, event handling, game flow
sw.js                  # service worker (stale-while-revalidate offline cache)
manifest.json          # PWA manifest
test/                  # node:test suites
```

Modules are plain IIFEs assigned to globals for the browser, with `module.exports` so the same files load under Node for testing. The UI is a single `render()` that rebuilds `#root`'s HTML and dispatches events by `data-action` attribute.

## License

No license is currently specified; all rights reserved by the author.
