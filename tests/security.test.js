"use strict";

const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), child = require("node:child_process");

test("the shipped bundle contains only approved network origins and no telemetry, iCloud storage or remote execution", () => {
  const source = fs.readFileSync(path.join(__dirname, "../dist/TURIBA NEXT.js"), "utf8");
  const origins = Array.from(source.matchAll(/https?:\/\/[^\s"'`<>]+/g), match => match[0]);
  assert.deepEqual(Array.from(new Set(origins)), ["https://nodarbibas.turiba.lv/"]);
  for (const pattern of [/\beval\s*\(/, /new Function\s*\(/, /FileManager\.iCloud\s*\(/, /removeAllPending\s*\(/, /google-analytics/i, /\b(?:ghp|github_pat)_[A-Za-z0-9_]+/, /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/]) {
    assert.ok(!pattern.test(source), String(pattern));
  }
  assert.ok(!source.includes("NONEXISTENTPHASE0"));
});

test("build output is deterministic and its checksum matches the exact installed bytes", () => {
  const root = path.join(__dirname, "..");
  const before = fs.readFileSync(path.join(root, "dist/TURIBA NEXT.js"));
  child.execFileSync(process.execPath, [path.join(root, "tools/build.js")], { cwd: root });
  const after = fs.readFileSync(path.join(root, "dist/TURIBA NEXT.js"));
  assert.deepEqual(after, before);
  const expected = fs.readFileSync(path.join(root, "dist/SHA256SUMS"), "utf8").split(" ")[0];
  assert.equal(crypto.createHash("sha256").update(after).digest("hex"), expected);
});
