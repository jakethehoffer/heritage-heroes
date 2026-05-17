// test/test-smoke.js
const test = require("node:test");
const assert = require("node:assert");

test("smoke: node:test is working", () => {
  assert.strictEqual(1 + 1, 2);
});
