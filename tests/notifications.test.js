"use strict";

const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs");
const { reminderPlan, clearReminders, reconcileReminders, PREFIX } = require("../src/notifications");
const { defaults } = require("../src/settings");
const { rigaInstant } = require("../src/time");
const { parseCatalog, parseSchedule } = require("../src/parser");
function data() {
  const read = name => fs.readFileSync(__dirname + "/fixtures/raw/" + name + ".html", "utf8");
  const catalog = parseCatalog(read("home"));
  return parseSchedule(read("tvl2d1-current"), { group: "TVL2D1", catalog, catalogComplete: true });
}
function adapter() {
  const pending = [], calls = [];
  return { calls, items: pending, pending: async () => { calls.push("pending"); return pending; },
    remove: async ids => { calls.push(["remove", ids]); for (const id of ids) { const index = pending.findIndex(item => item.identifier === id); if (index >= 0) pending.splice(index, 1); } },
    schedule: async item => { calls.push(["schedule", item]); const old = pending.findIndex(value => value.identifier === item.identifier); if (old >= 0) pending.splice(old, 1); pending.push(item); } };
}

test("default OFF bypasses notification planning and every notification API", async () => {
  const settings = defaults(), api = adapter(); settings.group = "TVL2D1";
  assert.deepEqual(reminderPlan(settings, [data()], Date.now(), "en"), []);
  await reconcileReminders(settings, { group: settings.group }, Date.now(), "en", api);
  assert.equal(api.calls.length, 0);
});

test("all lead intervals generate the exact expected Riga trigger and exclude unselected courses", () => {
  for (const leadMinutes of [5, 10, 15, 30]) {
    const settings = defaults(); settings.group = "TVL2D1"; settings.notifications = { enabled: true, leadMinutes };
    const plan = reminderPlan(settings, [data()], rigaInstant("2026-10-26", "08:00"), "ru");
    assert.equal(plan[0].trigger, rigaInstant("2026-10-26", "09:00") - leadMinutes * 60000);
    assert.ok(plan.every(item => !item.body.includes("Pakalpojumu")));
  }
});

test("reconciliation preserves other scripts, deduplicates unchanged reminders, and updates changed rooms", async () => {
  const settings = defaults(), api = adapter(), now = rigaInstant("2026-10-26", "08:00");
  settings.group = "TVL2D1"; settings.notifications.enabled = true;
  api.items.push({ identifier: "unrelated", userInfo: {} }, { identifier: PREFIX + "someone-else", userInfo: { owner: "another-script" } });
  const state = { group: settings.group, weeks: [data()] };
  const first = await reconcileReminders(settings, state, now, "en", api); assert.ok(first.scheduled > 0);
  assert.equal((await reconcileReminders(settings, state, now, "en", api)).scheduled, 0);
  state.weeks[0].lessons[0].room = "New room";
  assert.equal((await reconcileReminders(settings, state, now, "en", api)).scheduled, 1);
  await clearReminders(api);
  assert.deepEqual(api.items.map(item => item.identifier), ["unrelated", PREFIX + "someone-else"]);
});

test("secondary-group widgets and stale/unavailable data cannot plan reminders", async () => {
  const settings = defaults(), api = adapter(); settings.group = "TVL2D1"; settings.notifications.enabled = true;
  for (const state of [{ group: "CSA1D1" }, { group: settings.group, stale: true }, { group: settings.group, issue: "SOURCE_UNPUBLISHED" }]) {
    assert.equal((await reconcileReminders(settings, state, Date.now(), "en", api)).skipped, true);
  }
  assert.equal(api.calls.length, 0);
});

test("notification rejection propagates for localized handling without altering schedule data", async () => {
  const settings = defaults(), api = adapter(), source = data(); settings.group = "TVL2D1"; settings.notifications.enabled = true;
  const original = JSON.stringify(source); api.schedule = async () => { throw new Error("Permission denied"); };
  await assert.rejects(() => reconcileReminders(settings, { group: settings.group, weeks: [source] }, rigaInstant("2026-10-26", "08:00"), "en", api));
  assert.equal(JSON.stringify(source), original);
});
