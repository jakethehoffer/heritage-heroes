// src/calendar.js
//
// Heritage Calendar — "On This Day in Jewish History".
//
// A hand-curated list of well-documented Jewish historical events keyed by
// fixed Gregorian month/day. The title screen surfaces today's matches in a
// dedicated panel — a *bonus* layer that fires only on noteworthy dates
// (the every-visit educational role belongs to the Did You Know? card).
//
// IMPORTANT — dates are GREGORIAN-fixed only. Religious holidays
// (Passover, Hanukkah, Yom Kippur, etc.) move on the Gregorian calendar
// each year and are intentionally excluded. Hebrew-calendar dates would
// require a conversion library we don't ship.
//
// Editorial rules:
//   - Every entry verified against mainstream sources before inclusion
//   - When the event ties to one of the 7 heroes, link via heroId
//   - When no clear single-hero connection exists, set heroId to null
//   - Quality > quantity: skip anything with ambiguous date or disputed source
var Calendar = (function () {
  const EVENTS = [
    // ── 7 Heroes — birth/death/career milestones ────────────────────────────
    { month: 3,  day: 14, year: 1879, event: "Albert Einstein was born in Ulm, Germany.", heroId: "einstein" },
    { month: 4,  day: 18, year: 1955, event: "Albert Einstein died in Princeton, New Jersey.", heroId: "einstein" },
    { month: 5,  day: 3,  year: 1898, event: "Golda Meir was born Goldie Mabovitch in Kiev.", heroId: "golda" },
    { month: 12, day: 8,  year: 1978, event: "Golda Meir died in Jerusalem.", heroId: "golda" },
    { month: 3,  day: 17, year: 1969, event: "Golda Meir became the fourth Prime Minister of Israel.", heroId: "golda" },
    { month: 3,  day: 30, year: 1138, event: "Maimonides (the Rambam) was born in Cordoba, in Muslim Spain.", heroId: "rambam" },
    { month: 12, day: 13, year: 1204, event: "Maimonides died in Fustat, Egypt; he was later buried in Tiberias.", heroId: "rambam" },

    // ── Founding & defense of the modern State of Israel ────────────────────
    { month: 11, day: 29, year: 1947, event: "The United Nations voted to partition Mandatory Palestine into Jewish and Arab states.", heroId: "golda" },
    { month: 5,  day: 14, year: 1948, event: "David Ben-Gurion proclaimed the establishment of the State of Israel in Tel Aviv.", heroId: "golda" },
    { month: 2,  day: 24, year: 1949, event: "Israel and Egypt signed the Armistice Agreement on the island of Rhodes, ending the 1948 war between them.", heroId: null },
    { month: 5,  day: 11, year: 1949, event: "Israel was admitted to the United Nations as its 59th member state.", heroId: "golda" },
    { month: 6,  day: 5,  year: 1967, event: "The Six-Day War began with Israeli airstrikes against Egyptian airfields.", heroId: null },
    { month: 10, day: 6,  year: 1973, event: "The Yom Kippur War began when Egypt and Syria launched a surprise attack on the holiest day of the Jewish year.", heroId: "golda" },
    { month: 7,  day: 4,  year: 1976, event: "Operation Entebbe: Israeli commandos rescued 102 hostages from a hijacked airliner in Uganda.", heroId: null },
    { month: 9,  day: 17, year: 1978, event: "The Camp David Accords were signed by Menachem Begin and Anwar Sadat, mediated by Jimmy Carter.", heroId: null },
    { month: 3,  day: 26, year: 1979, event: "Israel and Egypt signed a formal peace treaty on the White House lawn.", heroId: null },
    { month: 9,  day: 13, year: 1993, event: "The Oslo Accords were signed at the White House, marking the famous Rabin-Arafat handshake.", heroId: null },
    { month: 11, day: 4,  year: 1995, event: "Israeli Prime Minister Yitzhak Rabin was assassinated in Tel Aviv after a peace rally.", heroId: null },

    // ── Pre-state diplomacy ─────────────────────────────────────────────────
    { month: 11, day: 2,  year: 1917, event: "Britain issued the Balfour Declaration, supporting a national home for the Jewish people in Palestine.", heroId: null },

    // ── Holocaust history ───────────────────────────────────────────────────
    { month: 11, day: 9,  year: 1938, event: "Kristallnacht — the Night of Broken Glass — began across Nazi Germany and Austria.", heroId: null },
    { month: 4,  day: 19, year: 1943, event: "The Warsaw Ghetto Uprising began, the largest Jewish revolt against the Nazis.", heroId: null },
    { month: 1,  day: 27, year: 1945, event: "Soviet forces liberated the Auschwitz-Birkenau concentration camp; the date is now International Holocaust Remembrance Day.", heroId: null },
    { month: 4,  day: 12, year: 1961, event: "The trial of Adolf Eichmann began in Jerusalem, broadcast to a worldwide audience.", heroId: null }
  ];

  // Returns events whose month + day match the inputs, regardless of year.
  // Always returns a NEW array sorted by year ascending (oldest first).
  // Returns [] for any date with no matches.
  function eventsOn(month, day) {
    return EVENTS
      .filter(function (e) { return e.month === month && e.day === day; })
      .sort(function (a, b) { return a.year - b.year; });
  }

  // Convenience: today's matches in the local timezone.
  // Pure delegation to eventsOn(); kept for callers (e.g. screens.js).
  function todaysEvents() {
    const now = new Date();
    return eventsOn(now.getMonth() + 1, now.getDate());
  }

  return { EVENTS: EVENTS, eventsOn: eventsOn, todaysEvents: todaysEvents };
})();

if (typeof module !== "undefined") module.exports = Calendar;
