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
