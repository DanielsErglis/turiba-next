"use strict";

const { ensure } = require("./errors");

// Diagnostics stay on the device. They are never uploaded or sent to another service.
function errorReport(error, stage, version) {
  const clean = value => String(value || "Unknown error").replace(/\/(?:private|var|Users)\/[^\s]+/g, "[local path]").slice(0, 240);
  const code = error && error.code || error && error.name || "UNEXPECTED_ERROR";
  const lines = ["Build: " + (version || "development"), "Stage: " + (stage || "unknown"),
    "Code: " + clean(code), "Message: " + clean(error && error.message)];
  if (error && error.details && error.details.cause) lines.push("Cause: " + clean(error.details.cause));
  return lines.join("\n");
}

async function presentDialog(api, dialog, stage, capture) {
  api.stage = stage;
  const result = await dialog.presentAlert();
  // Snapshot native input before yielding to a dismissal timer or another controller.
  let captured;
  try { captured = capture ? await capture(result) : result; }
  finally {
    // Also settle dismissal when input capture fails before showing the error controller.
    if (api.Timer && typeof api.Timer.schedule === "function") {
      await new Promise(resolve => { api.Timer.schedule(350, false, resolve); });
    }
  }
  return captured;
}

async function captureTextInput(dialog, field, index) {
  let value, failure;
  try { value = await dialog.textFieldValue(index); }
  catch (error) { failure = error; }
  if (typeof value === "string") return value;
  const reference = await field;
  const direct = reference ? await reference.text : undefined;
  ensure(typeof direct === "string", "GROUP_INPUT_UNAVAILABLE", "The native dialog did not return text.",
    { cause: failure ? failure.message : "textFieldValue type: " + typeof value + "; TextField.text type: " + typeof direct });
  return direct;
}

module.exports = { errorReport, presentDialog, captureTextInput };
