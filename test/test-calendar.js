// test/test-calendar.js
//
// Unit tests for src/calendar.js — the "On This Day in Jewish History"
// data module. Verifies data shape integrity (every entry well-formed,
// every hero link resolves) and the eventsOn/todaysEvents lookup helpers.
const test = require("node:test");
const assert = require("node:assert");
const Calendar = require("../src/calendar.js");
const Heroes = require("../src/heroes.js");

const VALID_HERO_IDS = new Set(Heroes.list.map(function (h) { return h.id; }));

test("EVENTS is a non-empty array with at least 12 curated entries", () => {
  assert.ok(Array.isArray(Calendar.EVENTS), "EVENTS should be an array");
  assert.ok(
    Calendar.EVENTS.length >= 12,
    `EVENTS should have >= 12 entries, got ${Calendar.EVENTS.length}`
  );
});

test("every event has month 1-12, day 1-31, integer year, and non-empty event text", () => {
  for (const e of Calendar.EVENTS) {
    const tag = `${e.year}/${e.month}/${e.day}`;
    assert.ok(Number.isInteger(e.month) && e.month >= 1 && e.month <= 12,
      `${tag}: month must be integer 1-12, got ${e.month}`);
    assert.ok(Number.isInteger(e.day) && e.day >= 1 && e.day <= 31,
      `${tag}: day must be integer 1-31, got ${e.day}`);
    assert.ok(Number.isInteger(e.year),
      `${tag}: year must be integer, got ${e.year}`);
    assert.ok(typeof e.event === "string" && e.event.length > 0,
      `${tag}: event text must be a non-empty string`);
  }
});

test("every event's heroId is null or one of the 7 valid hero ids", () => {
  for (const e of Calendar.EVENTS) {
    const tag = `${e.year}/${e.month}/${e.day}`;
    if (e.heroId === null) continue;
    assert.ok(VALID_HERO_IDS.has(e.heroId),
      `${tag}: heroId "${e.heroId}" is not one of the 7 valid hero ids`);
  }
});

test("eventsOn returns events matching the given month and day", () => {
  // Pick a known seeded event: May 14, 1948 (Israel's founding).
  const may14 = Calendar.eventsOn(5, 14);
  assert.ok(Array.isArray(may14));
  assert.ok(may14.length >= 1, "expected at least one event on May 14");
  assert.ok(may14.every(function (e) { return e.month === 5 && e.day === 14; }),
    "every returned event should match the requested month/day");
});

test("eventsOn returns empty array for dates with no events", () => {
  // Pick an extreme date guaranteed to have no events: Feb 30 (invalid),
  // and a plausibly empty Gregorian date. Use month=13 to guarantee no match.
  const none = Calendar.eventsOn(13, 99);
  assert.ok(Array.isArray(none));
  assert.strictEqual(none.length, 0, "month 13 day 99 should yield empty array");
});

test("eventsOn results are sorted by year ascending (oldest first)", () => {
  // For any date with multiple events, verify ordering. Iterate every
  // date represented in EVENTS and check the sort property.
  const dateBuckets = new Map();
  for (const e of Calendar.EVENTS) {
    const key = `${e.month}-${e.day}`;
    if (!dateBuckets.has(key)) dateBuckets.set(key, 0);
    dateBuckets.set(key, dateBuckets.get(key) + 1);
  }
  for (const [key, count] of dateBuckets) {
    if (count < 2) continue;  // only multi-event dates exercise sorting
    const [m, d] = key.split("-").map(Number);
    const got = Calendar.eventsOn(m, d);
    for (let i = 1; i < got.length; i++) {
      assert.ok(got[i - 1].year <= got[i].year,
        `eventsOn(${m},${d}) not sorted ascending: ${got[i - 1].year} > ${got[i].year}`);
    }
  }
});

test("eventsOn does not mutate the underlying EVENTS array", () => {
  const before = Calendar.EVENTS.slice();
  Calendar.eventsOn(5, 14);
  assert.deepStrictEqual(Calendar.EVENTS, before,
    "eventsOn must not mutate Calendar.EVENTS");
});

test("todaysEvents returns an array (smoke test — content depends on today's date)", () => {
  const today = Calendar.todaysEvents();
  assert.ok(Array.isArray(today), "todaysEvents must always return an array");
  // Whatever it returns must be valid events.
  for (const e of today) {
    assert.ok(Number.isInteger(e.month) && Number.isInteger(e.day) && Number.isInteger(e.year),
      "todaysEvents entries must be well-formed");
  }
});
