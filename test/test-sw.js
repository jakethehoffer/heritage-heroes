// test/test-sw.js
// Guards against the "service worker forgot to cache a file" class of bug:
// every script/stylesheet index.html loads MUST be in the SW precache list,
// or the app breaks on a cold offline load (missing module => ReferenceError).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const swSource = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

// Local assets index.html depends on at runtime: <script src> + stylesheet <link href>.
function indexHtmlAssets() {
  const assets = [];
  const scriptRe = /<script\s+src="([^"]+)"/g;
  const linkRe = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g;
  let m;
  while ((m = scriptRe.exec(indexHtml))) assets.push(m[1]);
  while ((m = linkRe.exec(indexHtml))) assets.push(m[1]);
  // Only same-origin/relative assets (skip absolute http(s) URLs).
  return assets.filter((a) => !/^https?:\/\//.test(a));
}

// The string entries inside the `const ASSETS = [ ... ];` array in sw.js,
// normalized by stripping a leading "./" so they compare to index.html paths.
function swPrecacheList() {
  const block = swSource.match(/const\s+ASSETS\s*=\s*\[([\s\S]*?)\]/);
  assert.ok(block, "sw.js must declare a const ASSETS = [ ... ] array");
  const entries = [];
  const strRe = /["']([^"']+)["']/g;
  let m;
  while ((m = strRe.exec(block[1]))) entries.push(m[1].replace(/^\.\//, ""));
  return entries;
}

test("service worker precaches every script & stylesheet index.html loads", () => {
  const required = indexHtmlAssets();
  const cached = new Set(swPrecacheList());

  assert.ok(required.length >= 9, `expected to find index.html assets, got ${required.length}`);

  const missing = required.filter((asset) => !cached.has(asset));
  assert.deepStrictEqual(
    missing,
    [],
    `sw.js ASSETS is missing assets that index.html loads: ${missing.join(", ")}`
  );
});
