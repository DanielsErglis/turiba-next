"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { rigaInstant, rigaParts, weekStart, addDays, serverWeekStart, DAY } = require("../src/time");
const { defaults, validateSettings, widgetGroup, choiceKey, selectLessons, availableChoices } = require("../src/settings");
const { scheduleState } = require("../src/engine");
const { Storage, validateWeek } = require("../src/storage");
const { ScheduleService, REFRESH_MS } = require("../src/schedule-service");
const { parseSchedule, parseCatalog } = require("../src/parser");

const html = name => fs.readFileSync(__dirname + "/fixtures/raw/" + name + ".html", "utf8");
const catalog = parseCatalog(html("home"));
const week = name => parseSchedule(html(name || "tvl2d1-current"), { group: "TVL2D1", catalog, catalogComplete: true });
const at = (date, time) => rigaInstant(date, time);
const code = name => error => error.code === name;
function memory() {
  const files = new Map();
  return { files, read: key => files.has(key) ? files.get(key) : null,
    writeAtomic: (key, value) => files.set(key, value), list: () => Array.from(files.keys()), remove: key => files.delete(key) };
}

test("Riga wall times map independently of the host zone in winter and summer", () => {
  assert.equal(new Date(at("2026-01-15", "09:00")).toISOString(), "2026-01-15T07:00:00.000Z");
  assert.equal(new Date(at("2026-07-15", "09:00")).toISOString(), "2026-07-15T06:00:00.000Z");
  assert.deepEqual(rigaParts(Date.parse("2026-10-30T22:30:00Z")), { date: "2026-10-31", time: "00:30", second: 0 });
});

test("DST gaps are rejected and repeated Riga times require an explicit choice", () => {
  assert.throws(() => at("2026-03-29", "03:30"), code("NONEXISTENT_LOCAL_TIME"));
  assert.throws(() => at("2026-10-25", "03:30"), code("AMBIGUOUS_LOCAL_TIME"));
  assert.equal(rigaInstant("2026-10-25", "03:30", "later") - rigaInstant("2026-10-25", "03:30", "earlier"), 3600000);
  assert.equal(at("2026-03-30", "00:00") - at("2026-03-29", "00:00"), 23 * 3600000);
  assert.equal(at("2026-10-26", "00:00") - at("2026-10-25", "00:00"), 25 * 3600000);
});

test("calendar arithmetic handles week, month, year and Sunday server semantics", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekStart("2027-01-01"), "2026-12-28");
  assert.equal(serverWeekStart(at("2026-11-01", "12:00")), "2026-11-02");
  assert.equal(weekStart("2026-11-01"), "2026-10-26");
  assert.throws(() => at("2026-02-30", "09:00"), code("INVALID_DATE"));
});

test("lesson states change exactly at the ten-minute, start and end boundaries", () => {
  const options = { group: "TVL2D1", weeks: [week()], selections: [] };
  const state = time => scheduleState(Object.assign({}, options, { now: at("2026-10-30", time) }));
  assert.equal(state("12:44").status, "upcoming");
  assert.equal(state("12:45").status, "soon");
  assert.equal(state("12:55").status, "ongoing");
  assert.equal(state("14:24").current.period, 3);
  assert.equal(state("14:25").status, "upcoming");
  assert.equal(state("14:30").status, "soon");
  assert.equal(state("14:40").current.period, 4);
  assert.equal(state("16:10").status, "finished");
  assert.equal(state("13:00").nextStatus, "next");
  assert.equal(state("12:44").refreshAt, at("2026-10-30", "12:45"));
});

test("finished today retains the next known lesson and an empty published day can be distinguished", () => {
  const result = scheduleState({ group: "TVL2D1", weeks: [week(), week("tvl2d1-next")], now: at("2026-10-30", "17:00") });
  assert.equal(result.status, "finished"); assert.equal(result.next.date, "2026-11-03");
  const sunday = scheduleState({ group: "TVL2D1", weeks: [week()], now: at("2026-11-01", "12:00") });
  assert.equal(sunday.status, "noSchedule");
  const unknown = scheduleState({ group: "TVL2D1", weeks: [], now: at("2026-11-01", "12:00") });
  assert.equal(unknown.status, "error"); assert.equal(unknown.coverageIncomplete, true);
  assert.equal(scheduleState({ now: at("2026-10-30", "10:00") }).status, "setupRequired");
});

test("only explicitly chosen alternatives are selected and widget parameters never change the primary group", () => {
  const source = week();
  const choices = availableChoices(source.lessons, "TVL2D1");
  assert.equal(choices.length, 1);
  assert.equal(selectLessons(source.lessons, "TVL2D1", []).length, 12);
  assert.equal(selectLessons(source.lessons, "TVL2D1", [choices[0].key]).length, 14);
  assert.equal(choiceKey(source.lessons[2]), choices[0].key);
  const settings = defaults(); settings.group = "TVL2D1";
  assert.equal(widgetGroup(settings, "csa1d1"), "CSA1D1"); assert.equal(settings.group, "TVL2D1");
  assert.equal(defaults().notifications.enabled, false);
  assert.throws(() => validateSettings(Object.assign(defaults(), { theme: "invalid" })), code("INVALID_SETTINGS"));
});

test("overlapping selected lessons are reported without erasing the currently active lesson", () => {
  const source = week();
  const copy = JSON.parse(JSON.stringify(source.lessons[0])); copy.subject = "Another concurrent lesson"; source.lessons.push(copy);
  const result = scheduleState({ group: "TVL2D1", weeks: [source], now: at("2026-10-26", "09:30") });
  assert.equal(result.status, "ongoing"); assert.equal(result.concurrent.length, 1);
});

test("storage validates persisted identities, schema, selections and time ranges", () => {
  const adapter = memory(), storage = new Storage(adapter), now = at("2026-10-30", "10:00");
  const settings = defaults(); settings.group = "TVL2D1";
  storage.saveSettings(settings); assert.deepEqual(storage.settings(), settings);
  storage.saveWeek(week(), now); assert.equal(storage.weeks("TVL2D1").weeks.length, 1);
  assert.equal(storage.weeks("CSA1D1").weeks.length, 0);
  const corrupted = week(); corrupted.lessons[0].endTime = "08:00";
  assert.throws(() => validateWeek(corrupted, "TVL2D1"), code("INVALID_LESSON"));
  corrupted.lessons[0].endTime = "10:30"; corrupted.lessons[2].requiresSelection = false;
  assert.throws(() => validateWeek(corrupted, "TVL2D1"), code("INVALID_CACHE"));
  adapter.files.set("settings.json", "{"); assert.throws(() => storage.settings(), code("CORRUPT_DATA"));
  adapter.files.set("week-TVL2D1-2026-10-26.json", "{");
  assert.equal(storage.weeks("TVL2D1").issues.length, 1);
});

test("storage write failures do not report a successful save", () => {
  const adapter = memory(); adapter.writeAtomic = () => { throw new Error("Disk unavailable"); };
  const storage = new Storage(adapter);
  assert.throws(() => storage.saveSettings(defaults()), code("STORAGE_WRITE_ERROR"));
});

test("synchronization caches successful current/next weeks and throttles repeated widget requests", async () => {
  const storage = new Storage(memory()), calls = [], now = at("2026-10-30", "10:00");
  const client = { loadCatalog: async () => catalog, loadSchedule: async (group, options) => {
    calls.push(options); return week(options.weekOffset === 0 ? "tvl2d1-current" : "tvl2d1-next");
  } };
  const service = new ScheduleService(client, storage);
  const first = await service.synchronize("TVL2D1", { now });
  assert.equal(first.weeks.length, 2); assert.equal(first.stale, false);
  assert.equal(calls[0].expectedWeekStart, "2026-10-26"); assert.equal(calls[1].expectedWeekStart, "2026-11-02");
  await service.synchronize("TVL2D1", { now: now + 60000 }); assert.equal(calls.length, 2);
  await service.synchronize("TVL2D1", { now: now + REFRESH_MS }); assert.equal(calls.length, 4);
});

test("network failures and unpublished responses retain the exact last valid schedule bytes", async () => {
  for (const outcome of ["network", "unpublished", "emptyUnconfirmed"]) {
    const adapter = memory(), storage = new Storage(adapter), now = at("2026-10-30", "10:00");
    storage.saveWeek(week(), now - DAY);
    const before = adapter.read("week-TVL2D1-2026-10-26.json");
    const client = { loadCatalog: async () => catalog, loadSchedule: async () => {
      if (outcome === "network") { const error = new Error("Offline"); error.code = "NETWORK_ERROR"; throw error; }
      return { status: outcome };
    } };
    const result = await new ScheduleService(client, storage).synchronize("TVL2D1", { now });
    assert.equal(adapter.read("week-TVL2D1-2026-10-26.json"), before);
    assert.equal(result.weeks.length, 1); assert.equal(result.stale, true);
    assert.equal(result.offline, outcome === "network");
  }
});

test("Sunday sync preserves the cached calendar week and requests the actual server week", async () => {
  const storage = new Storage(memory()), now = at("2026-11-01", "12:00");
  storage.saveWeek(week(), now - DAY);
  const calls = [];
  const service = new ScheduleService({ loadCatalog: async () => catalog, loadSchedule: async (group, options) => {
    calls.push(options); return week("tvl2d1-next");
  } }, storage);
  const result = await service.synchronize("TVL2D1", { now });
  assert.equal(result.weeks.length, 2); assert.equal(calls.length, 1);
  assert.equal(calls[0].expectedWeekStart, "2026-11-02");
});

test("a forced failed refresh cannot reuse an earlier successful reminder-verification marker", async () => {
  const storage = new Storage(memory()), now = at("2026-10-30", "10:00");
  let offline = false;
  const client = { loadCatalog: async () => catalog, loadSchedule: async (group, options) => {
    if (offline) { const error = new Error("Offline"); error.code = "NETWORK_ERROR"; throw error; }
    return week(options.weekOffset === 0 ? "tvl2d1-current" : "tvl2d1-next");
  } };
  const service = new ScheduleService(client, storage);
  assert.equal((await service.synchronize("TVL2D1", { now })).reminderWeeks.length, 2);
  offline = true;
  const result = await service.synchronize("TVL2D1", { now: now + 1000, force: true });
  assert.equal(result.reminderWeeks.length, 0); assert.equal(result.weeks.length, 2);
});

test("local data deletion is confined to the adapter scope and resets defaults", () => {
  const adapter = memory(), storage = new Storage(adapter);
  storage.saveSettings(defaults()); storage.writeJson("catalog.json", {});
  storage.deleteLocalData(); assert.equal(adapter.list().length, 0);
  assert.deepEqual(storage.settings(), defaults());
});
