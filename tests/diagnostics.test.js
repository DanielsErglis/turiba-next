"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const { errorReport, presentDialog, captureTextInput } = require("../src/diagnostics");

test("local diagnostic report retains the stage, code and native cause without exposing local paths", () => {
  const error = { code: "STORAGE_WRITE_ERROR", message: "Local data could not be saved.", details: { cause: "Write failed: /private/var/mobile/settings.json" } };
  const report = errorReport(error, "settings.save", "1.0.0-rc.2");
  assert.ok(report.includes("Stage: settings.save"));
  assert.ok(report.includes("Code: STORAGE_WRITE_ERROR"));
  assert.ok(report.includes("Cause: Write failed: [local path]"));
  assert.ok(!report.includes("/private/var"));
});

test("text input is captured before the dismissal timer releases native field state", async () => {
  let value = "TVL2D1";
  const api = { Timer: { schedule: (ms, repeats, callback) => { value = undefined; callback(); } } };
  const dialog = { presentAlert: async () => 0, textFieldValue: () => value };
  const result = await presentDialog(api, dialog, "setup.group.present", async action => ({ action, text: await captureTextInput(dialog, null, 0) }));
  assert.equal(result.text, "TVL2D1"); assert.equal(value, undefined);
});

test("native text extraction resolves promise results and supports the documented TextField.text fallback", async () => {
  assert.equal(await captureTextInput({ textFieldValue: () => Promise.resolve("TVL2D1") }, null, 0), "TVL2D1");
  assert.equal(await captureTextInput({ textFieldValue: () => undefined }, { text: "CSA1D1" }, 0), "CSA1D1");
  assert.equal(await captureTextInput({ textFieldValue: () => "" }, { text: "old group" }, 0), "");
});

test("unavailable native text is a read failure rather than an invalid user group", async () => {
  await assert.rejects(() => captureTextInput({ textFieldValue: () => undefined }, null, 0), error => error.code === "GROUP_INPUT_UNAVAILABLE");
});

test("dialog presentation waits for the native dismissal grace period before continuing", async () => {
  const events = [], api = { Timer: { schedule: (milliseconds, repeats, callback) => {
    assert.equal(milliseconds, 350); assert.equal(repeats, false); events.push("dismissal settled"); callback();
  } } };
  const result = await presentDialog(api, { presentAlert: async () => { events.push("selected"); return 2; } }, "setup.language");
  assert.equal(result, 2); assert.equal(api.stage, "setup.language");
  assert.deepEqual(events, ["selected", "dismissal settled"]);
});
