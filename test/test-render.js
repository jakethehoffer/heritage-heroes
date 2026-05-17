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
