"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const { errorReport, presentDialog } = require("../src/diagnostics");

test("local diagnostic report retains the stage, code and native cause without exposing local paths", () => {
  const error = { code: "STORAGE_WRITE_ERROR", message: "Local data could not be saved.", details: { cause: "Write failed: /private/var/mobile/settings.json" } };
  const report = errorReport(error, "settings.save", "1.0.0-rc.2");
  assert.ok(report.includes("Stage: settings.save"));
  assert.ok(report.includes("Code: STORAGE_WRITE_ERROR"));
  assert.ok(report.includes("Cause: Write failed: [local path]"));
  assert.ok(!report.includes("/private/var"));
});

test("dialog presentation waits for the native dismissal grace period before continuing", async () => {
  const events = [], api = { Timer: { schedule: (milliseconds, repeats, callback) => {
    assert.equal(milliseconds, 350); assert.equal(repeats, false); events.push("dismissal settled"); callback();
  } } };
  const result = await presentDialog(api, { presentAlert: async () => { events.push("selected"); return 2; } }, "setup.language");
  assert.equal(result, 2); assert.equal(api.stage, "setup.language");
  assert.deepEqual(events, ["selected", "dismissal settled"]);
});
