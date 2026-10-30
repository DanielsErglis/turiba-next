"use strict";

const { normalizeGroup } = require("./parser");
const { timestamp, rigaParts, weekStart, serverWeekStart, addDays, DAY } = require("./time");
const { scheduleState } = require("./engine");

const REFRESH_MS = 15 * 60000;

function validCatalog(value) {
  return value && value.version === 1 && Number.isFinite(value.syncedAt) && Array.isArray(value.groups) && value.groups.length > 0 &&
    value.groups.every(group => group && typeof group.code === "string" && ["riga", "cesis", "liepaja", "talsi"].includes(group.branch));
}

class ScheduleService {
  constructor(client, storage) { this.client = client; this.storage = storage; }

  async catalog(now, force) {
    let cached = null;
    try { cached = this.storage.readJson("catalog.json"); } catch (error) { /* Recover by fetching verified public data. */ }
    const valid = validCatalog(cached);
    if (!force && valid && now >= cached.syncedAt && now - cached.syncedAt < DAY) return cached.groups;
    try {
      const groups = await this.client.loadCatalog();
      this.storage.writeJson("catalog.json", { version: 1, syncedAt: now, groups });
      return groups;
    } catch (error) {
      // A previously verified catalog can still establish a branch while the index is offline.
      if (valid && now >= cached.syncedAt && now - cached.syncedAt < 7 * DAY) return cached.groups;
      throw error;
    }
  }

  async synchronize(group, options) {
    options = options || {};
    const code = normalizeGroup(group);
    const now = timestamp(options.now);
    const today = rigaParts(now).date;
    const calendarWeek = weekStart(today), serverWeek = serverWeekStart(now);
    const markerKey = "sync-" + encodeURIComponent(code) + ".json";
    let marker = null;
    try { marker = this.storage.readJson(markerKey); } catch (error) { /* Retry after an invalid sync marker. */ }
    const fresh = marker && marker.version === 1 && marker.calendarWeek === calendarWeek && marker.serverWeek === serverWeek &&
      Number.isFinite(marker.checkedAt) && now >= marker.checkedAt && now - marker.checkedAt < REFRESH_MS;
    let issue = fresh ? marker.issue : null;
    if (options.force || !fresh) {
      issue = null;
      try {
        const catalog = await this.catalog(now, !!options.force);
        // On Sunday the server's current page is already next week; keep any cached current week.
        const offsets = serverWeek === calendarWeek ? [0, 1] : [0];
        for (const offset of offsets) {
          try {
            const week = await this.client.loadSchedule(code, { catalog, catalogComplete: true,
              weekOffset: offset, expectedWeekStart: addDays(serverWeek, offset * 7) });
            if (week.status === "published") this.storage.saveWeek(week, now);
            else issue = issue || "SOURCE_" + week.status.toUpperCase();
          } catch (error) { issue = issue || error.code || "NETWORK_ERROR"; }
        }
      } catch (error) { issue = error.code || "NETWORK_ERROR"; }
      try { this.storage.writeJson(markerKey, { version: 1, checkedAt: now, calendarWeek, serverWeek, issue }); }
      catch (error) { issue = issue || error.code; }
    }
    const saved = this.storage.weeks(code);
    const relevant = saved.weeks.filter(entry => entry.week.weekEnd >= today && entry.week.weekStart <= addDays(calendarWeek, 14));
    if (!issue && saved.issues.length) issue = "CORRUPT_CACHE";
    const current = relevant.find(entry => entry.week.weekStart === calendarWeek);
    const stale = !!issue || relevant.some(entry => now < entry.syncedAt || now - entry.syncedAt >= REFRESH_MS);
    return { group: code, weeks: relevant.map(entry => entry.week), stale, issue,
      offline: ["NETWORK_ERROR", "NETWORK_TIMEOUT"].includes(issue),
      lastSync: current ? current.syncedAt : (relevant.length ? Math.max(...relevant.map(entry => entry.syncedAt)) : null),
      cacheIssues: saved.issues };
  }

  async state(settings, group, now, force) {
    if (!group) return scheduleState({ now });
    const result = await this.synchronize(group, { now, force });
    return Object.assign(scheduleState(Object.assign({}, result, { now, selections: settings.selections[group] || [] })),
      { lastSync: result.lastSync, weeks: result.weeks, group });
  }
}

module.exports = { ScheduleService, REFRESH_MS };
