"use strict";

const { ensure, ScheduleError } = require("./errors");
const { defaults, validateSettings } = require("./settings");
const { normalizeGroup, ORIGIN } = require("./parser");
const { calendarDate, addDays, timestamp } = require("./time");
const { timedLesson } = require("./engine");

function validateWeek(week, group) {
  ensure(week && week.schemaVersion === 1 && week.group === group && week.status === "published" &&
    week.timeZone === "Europe/Riga" && ["riga", "cesis", "liepaja", "talsi"].includes(week.branch),
  "INVALID_CACHE", "The cached schedule identity or version is invalid.");
  calendarDate(week.weekStart); calendarDate(week.weekEnd);
  ensure(new Date(week.weekStart + "T00:00:00Z").getUTCDay() === 1 && addDays(week.weekStart, 6) === week.weekEnd,
    "INVALID_CACHE", "The cached week range is invalid.");
  ensure(Array.isArray(week.lessons) && week.lessons.length > 0 && week.lessons.length <= 2000,
    "INVALID_CACHE", "The cached lesson list is invalid.");
  for (const lesson of week.lessons) {
    ensure(lesson && lesson.group === group && lesson.date >= week.weekStart && lesson.date <= week.weekEnd && lesson.timeZone === "Europe/Riga" &&
      typeof lesson.subject === "string" && lesson.subject.length > 0 && typeof lesson.sourceGroup === "string" &&
      (lesson.room === null || typeof lesson.room === "string") && typeof lesson.requiresSelection === "boolean" &&
      typeof lesson.elective === "boolean" && (lesson.subgroup === null || typeof lesson.subgroup === "string") &&
      (!(lesson.elective || lesson.subgroup || lesson.individualSchedule) || lesson.requiresSelection) &&
      typeof lesson.source === "string" && lesson.source.startsWith(ORIGIN), "INVALID_CACHE", "A cached lesson is invalid.");
    timedLesson(lesson);
  }
  return week;
}

function cacheKey(group, weekStart) {
  normalizeGroup(group); calendarDate(weekStart);
  return "week-" + encodeURIComponent(group) + "-" + weekStart + ".json";
}

// The adapter owns atomic/durable writes inside the project's local data directory.
class Storage {
  constructor(adapter) { this.adapter = adapter; }

  readJson(key) {
    let content;
    try { content = this.adapter.read(key); }
    catch (error) { throw new ScheduleError("STORAGE_READ_ERROR", "Local data could not be read."); }
    if (content === null) return null;
    try { return JSON.parse(content); }
    catch (error) { throw new ScheduleError("CORRUPT_DATA", "Local JSON is corrupted."); }
  }

  writeJson(key, data) {
    try { this.adapter.writeAtomic(key, JSON.stringify(data)); }
    catch (error) { throw new ScheduleError("STORAGE_WRITE_ERROR", "Local data could not be saved."); }
  }

  settings() {
    const value = this.readJson("settings.json");
    return value === null ? defaults() : validateSettings(value);
  }

  saveSettings(value) { this.writeJson("settings.json", validateSettings(value)); }

  saveWeek(week, syncedAt) {
    validateWeek(week, week.group); timestamp(syncedAt);
    this.writeJson(cacheKey(week.group, week.weekStart), { version: 1, syncedAt, week });
  }

  weeks(group) {
    const code = normalizeGroup(group);
    const prefix = "week-" + encodeURIComponent(code) + "-";
    const weeks = [], issues = [];
    for (const key of this.adapter.list().filter(name => name.startsWith(prefix) && name.endsWith(".json"))) {
      try {
        const value = this.readJson(key);
        ensure(value && value.version === 1, "INVALID_CACHE", "Unsupported cache version.");
        timestamp(value.syncedAt); validateWeek(value.week, code);
        ensure(cacheKey(code, value.week.weekStart) === key, "INVALID_CACHE", "The cache filename does not match its contents.");
        weeks.push(value);
      } catch (error) { issues.push({ key, code: error.code || "INVALID_CACHE" }); }
    }
    return { weeks, issues };
  }

  deleteLocalData() {
    // Adapter.list() is scoped to the dedicated project directory, never Scriptable's root.
    for (const key of this.adapter.list()) this.adapter.remove(key);
  }
}

module.exports = { Storage, validateWeek, cacheKey };
