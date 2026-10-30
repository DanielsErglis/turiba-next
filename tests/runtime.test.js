"use strict";

const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const { run } = require("../src/app");
const { defaults } = require("../src/settings");
const { localAdapter, transport } = require("../src/scriptable-adapters");
const { api: widgetApi, texts } = require("../tools/widget-mock");
const { PREFIX } = require("../src/notifications");
const NOW = Date.parse("2026-10-30T08:00:00Z"), ROOT = "/documents/TURIBA-NEXT/";
const fixture = name => fs.readFileSync(__dirname + "/fixtures/raw/" + name + ".html", "utf8");
function environment(settings, overrides) {
  const files = new Map(), pending = [], calls = [], dialogs = [], queue = [], result = {};
  if (settings) files.set(ROOT + "settings.json", JSON.stringify(settings));
  const fm = {
    documentsDirectory: () => "/documents", joinPath: (base, name) => base + "/" + name,
    fileExists: path => path === "/documents/TURIBA-NEXT" || files.has(path), createDirectory: () => {},
    readString: path => files.get(path), writeString: (path, value) => files.set(path, value),
    move: (from, to) => { files.set(to, files.get(from)); files.delete(from); },
    remove: path => files.delete(path), listContents: root => Array.from(files.keys()).filter(path => path.startsWith(root + "/")).map(path => path.slice(root.length + 1))
  };
  class Request {
    constructor(url) { this.url = url; calls.push(["request", url]); }
    async loadString() {
      assert.equal(this.allowInsecureRequest, false); assert.equal(this.onRedirect({ url: "https://example.com" }), null);
      assert.ok(this.timeoutInterval > 0 && this.timeoutInterval <= 20);
      const url = new URL(this.url);
      const names = { "1": "college", "3": "masters", "4": "doctoral", "5": "branches" };
      let name = names[url.searchParams.get("lim")] || "home";
      if (url.pathname === "/pub_nod.asp") {
        const group = url.searchParams.get("Grupa");
        name = group === "CSA1D1" ? "csa1d1-current" : url.searchParams.get("ned") === "1" ? "tvl2d1-next" : "tvl2d1-current";
      }
      this.response = { statusCode: 200, url: this.url, headers: { "Content-Type": "text/html; charset=utf-8" } };
      return fixture(name);
    }
  }
  class Notification {
    static async allPending() { calls.push(["pending"]); return pending; }
    static async removePending(ids) {
      calls.push(["remove", ids]);
      for (const id of ids) { const index = pending.findIndex(item => item.identifier === id); if (index >= 0) pending.splice(index, 1); }
    }
    setTriggerDate(date) { this.triggerDate = date; }
    async schedule() { calls.push(["schedule", this.identifier]); pending.push(this); }
  }
  class Alert {
    constructor() { this.actions = []; dialogs.push(this); }
    addAction(value) { this.actions.push(value); }
    addDestructiveAction(value) { this.actions.push(value); }
    addCancelAction() {}
    addTextField(placeholder, value) { this.field = value; }
    textFieldValue() { return this.field; }
    async presentAlert() {
      assert.ok(queue.length, "Unexpected dialog: " + this.title);
      const choice = queue.shift();
      if (typeof choice === "number") return choice;
      this.field = choice.text; return choice.index;
    }
  }
  const api = Object.assign(widgetApi(), { FileManager: { local: () => fm }, UUID: { string: () => "test-uuid" },
    Request, Notification, Alert, Device: { preferredLanguages: () => ["en-GB"] }, args: {}, config: { runsInWidget: true, widgetFamily: "small" },
    Script: { name: () => "TURIBA NEXT", setWidget: widget => { result.widget = widget; }, complete: () => { result.complete = true; }, setShortcutOutput: value => { result.shortcut = value; } } }, overrides);
  return { api, files, pending, calls, dialogs, queue, result };
}
async function fixedRun(env) {
  const original = Date.now; Date.now = () => NOW;
  try { await run(env.api); } finally { Date.now = original; }
}

test("default widget needs no group, no network and no notification or dialog API", async () => {
  const env = environment(); await fixedRun(env);
  assert.ok(env.result.complete); assert.ok(texts(env.result.widget).includes("Choose your group"));
  assert.equal(env.calls.length, 0); assert.equal(env.dialogs.length, 0);
});

test("prepared OFF widget executes the real application against captured HTTPS responses without notifications", async () => {
  const settings = defaults(); settings.group = "TVL2D1";
  const env = environment(settings); await fixedRun(env);
  assert.ok(env.result.widget); assert.equal(env.calls.filter(call => call[0] === "request").length, 7);
  assert.ok(env.calls.every(call => call[0] === "request"));
  assert.ok(env.files.has(ROOT + "week-TVL2D1-2026-10-26.json"));
});

test("initial setup uses the chosen language, saves a group and leaves reminders OFF", async () => {
  const env = environment(null, { config: { runsInWidget: false } });
  env.queue.push(2, { index: 0, text: "TVL2D1" }, -1);
  await fixedRun(env);
  const saved = JSON.parse(env.files.get(ROOT + "settings.json"));
  assert.equal(saved.language, "ru"); assert.equal(saved.group, "TVL2D1"); assert.equal(saved.notifications.enabled, false);
  assert.ok(env.calls.every(call => call[0] === "request")); assert.equal(env.queue.length, 0);
});

test("group changes cancel only owned reminders before saving the new primary group", async () => {
  const settings = defaults(); settings.group = "TVL2D1"; settings.notifications.enabled = true;
  const env = environment(settings, { config: { runsInWidget: false } });
  env.pending.push({ identifier: PREFIX + "old", userInfo: { owner: "turiba-next" } }, { identifier: "other-script", userInfo: {} });
  env.queue.push(0, { index: 0, text: "CSA1D1" }, -1);
  await fixedRun(env);
  assert.equal(JSON.parse(env.files.get(ROOT + "settings.json")).group, "CSA1D1");
  assert.ok(env.pending.some(item => item.identifier === "other-script"));
  assert.ok(!env.pending.some(item => item.identifier === PREFIX + "old"));
  assert.ok(env.calls.some(call => call[0] === "schedule"));
});

test("data deletion preserves another script's files and pending notifications", async () => {
  const settings = defaults(); settings.group = "TVL2D1";
  const env = environment(settings, { config: { runsInWidget: false } });
  env.files.set("/documents/another-script.json", "keep");
  env.pending.push({ identifier: PREFIX + "old", userInfo: { owner: "turiba-next" } }, { identifier: "other-script", userInfo: {} });
  env.queue.push(9, 0, -1, -1);
  await fixedRun(env);
  assert.deepEqual(Array.from(env.files.entries()), [["/documents/another-script.json", "keep"]]);
  assert.deepEqual(env.pending.map(item => item.identifier), ["other-script"]);
});

test("turning reminders OFF persists OFF and removes the project's waiting notifications", async () => {
  const settings = defaults(); settings.group = "TVL2D1"; settings.notifications.enabled = true;
  const env = environment(settings, { config: { runsInWidget: false } });
  env.pending.push({ identifier: PREFIX + "old", userInfo: { owner: "turiba-next" } });
  env.queue.push(5, 0, -1); await fixedRun(env);
  assert.equal(JSON.parse(env.files.get(ROOT + "settings.json")).notifications.enabled, false);
  assert.equal(env.pending.length, 0); assert.ok(!env.calls.some(call => call[0] === "schedule"));
});

test("secondary-group widgets never schedule the primary group's reminders", async () => {
  const settings = defaults(); settings.group = "TVL2D1"; settings.notifications.enabled = true;
  const env = environment(settings, { args: { widgetParameter: "CSA1D1" } }); await fixedRun(env);
  assert.ok(env.calls.every(call => call[0] === "request"));
  assert.equal(JSON.parse(env.files.get(ROOT + "settings.json")).group, "TVL2D1");
});

test("notification permission denial never breaks a configured widget", async () => {
  const settings = defaults(); settings.group = "TVL2D1"; settings.notifications.enabled = true;
  const env = environment(settings);
  env.api.Notification.prototype.schedule = async () => { throw new Error("Permission denied"); };
  await fixedRun(env);
  assert.ok(env.result.widget); assert.ok(env.result.complete); assert.equal(env.dialogs.length, 0);
});

test("changing only the appearance performs no timetable request", async () => {
  const settings = defaults(); settings.group = "TVL2D1";
  const env = environment(settings, { config: { runsInWidget: false } });
  env.queue.push(3, 2, -1); await fixedRun(env);
  assert.equal(env.calls.length, 0); assert.equal(JSON.parse(env.files.get(ROOT + "settings.json")).theme, "dark");
});

test("the native transport converts documented timeout failures to a typed error and blocks redirects", async () => {
  const env = environment();
  env.api.Request = class { async loadString() { const error = new Error("Timed out"); error.code = -1001; throw error; } };
  await assert.rejects(() => transport(env.api)("https://nodarbibas.turiba.lv/", { timeoutSeconds: 20 }), error => error.code === "ETIMEDOUT");
  assert.throws(() => localAdapter(env.api).read("../outside"), error => error.code === "UNSAFE_STORAGE_PATH");
});

test("the generated single-file package runs with Scriptable mocks and no Node runtime imports", async () => {
  const source = fs.readFileSync(__dirname + "/../dist/TURIBA NEXT.js", "utf8");
  assert.ok(!/\brequire\s*\(|\beval\s*\(|new Function\s*\(/.test(source));
  const env = environment();
  const result = new vm.Script("(async () => {\n" + source + "\n})()").runInNewContext(env.api);
  await result;
  assert.ok(env.result.complete); assert.ok(env.result.widget);
});

module.exports = { environment, fixedRun };
