# Cloud routines

This repo has **one active cloud routine** that pushes directly to `main`:

## Heritage Heroes daily hero pitch

- **Trigger ID:** `trig_01BHd2QspSwPzhThmfCWuuNp` (managed in the user's arbitrage project's `RemoteTrigger` setup)
- **Schedule:** daily at 11am America/Toronto (cron `0 15 * * *` UTC)
- **Output:** writes `drafts/YYYY-MM-DD-routine.md` (or `-routine-alt.md` if a hand-written `YYYY-MM-DD.md` already exists)
- **Deliverable:** ONE concrete, ready-to-prototype hero pitch — name, era, suggested stats, special ability, flavor, why-it-works
- **NOT delivered to Telegram** — Telegram is reserved for the user's arbitrage project alerts

## The name-recognition rule

Pitches must use **household-name-tier** figures only — picked from a curated list in the routine prompt itself. The user explicitly rejected the 2026-05-17 Bar Kokhba pitch with "I dont know who that is. I want the biggest names in Jew history, regardless of era gaps in the roster." The curated list lives inside the routine prompt; if you change the canonical hero list, update the routine prompt to match (or it will keep proposing names you've already rejected).

## Anti-patterns the routine has been told to avoid

- Don't pitch 5 heroes (ONE per day)
- Don't pitch a hero already in `src/heroes/`
- Don't repeat era/civilization from the last 3 drafts
- Don't implement code (the pitch is the deliverable)
- Don't pitch Holocaust victims (the game's tone is celebratory, not memorial)
- Don't deliver to Telegram

## To modify the routine

Open the trigger in the [arbitrage project's Claude Code on the Web environment](https://claude.ai/code) or update via the `RemoteTrigger` API. The full prompt is stored in the trigger config (`job_config.ccr.events[0].data.message.content`).
