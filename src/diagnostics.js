"use strict";

// Diagnostics stay on the device. They are never uploaded or sent to another service.
function errorReport(error, stage, version) {
  const clean = value => String(value || "Unknown error").replace(/\/(?:private|var|Users)\/[^\s]+/g, "[local path]").slice(0, 240);
  const code = error && error.code || error && error.name || "UNEXPECTED_ERROR";
  const lines = ["Build: " + (version || "development"), "Stage: " + (stage || "unknown"),
    "Code: " + clean(code), "Message: " + clean(error && error.message)];
  if (error && error.details && error.details.cause) lines.push("Cause: " + clean(error.details.cause));
  return lines.join("\n");
}

async function presentDialog(api, dialog, stage) {
  api.stage = stage;
  const result = await dialog.presentAlert();
  // Allow the native dismissal transition to settle before presenting another controller.
  if (api.Timer && typeof api.Timer.schedule === "function") {
    await new Promise(resolve => { api.Timer.schedule(350, false, resolve); });
  }
  return result;
}

module.exports = { errorReport, presentDialog };
