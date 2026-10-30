"use strict";

const { ensure } = require("./errors");
const { selectLessons } = require("./settings");
const { timedLesson } = require("./engine");
const { translator } = require("./localization");
const { DAY } = require("./time");
const OWNER = "turiba-next", PREFIX = "turiba-next.v1.";

function hash(value, seed) {
  let result = seed >>> 0;
  for (let index = 0; index < value.length; index++) result = Math.imul(result ^ value.charCodeAt(index), 16777619) >>> 0;
  return result.toString(16).padStart(8, "0");
}
function fingerprint(value) { return hash(value, 2166136261) + hash(value, 3339675911); }
function owns(notification) {
  return notification && typeof notification.identifier === "string" && notification.identifier.startsWith(PREFIX) &&
    notification.userInfo && notification.userInfo.owner === OWNER;
}

function reminderPlan(settings, weeks, now, language) {
  if (!settings.notifications.enabled || !settings.group) return [];
  const t = translator(language), seen = new Map();
  const selected = selectLessons(weeks.filter(week => week.status === "published").flatMap(week => week.lessons), settings.group, settings.selections[settings.group] || []);
  const result = [];
  for (const lesson of selected.map(timedLesson).sort((a, b) => a.start - b.start)) {
    if (lesson.provisional) continue;
    const trigger = lesson.start - settings.notifications.leadMinutes * 60000;
    if (trigger <= now || trigger > now + 7 * DAY) continue;
    const key = JSON.stringify([lesson.group, lesson.date, lesson.startTime, lesson.period, lesson.subject, lesson.sourceGroup]);
    const identifier = PREFIX + fingerprint(key);
    ensure(!seen.has(identifier) || seen.get(identifier) === key, "NOTIFICATION_ID_COLLISION", "Reminder identities collided.");
    if (seen.has(identifier)) continue;
    seen.set(identifier, key);
    const body = lesson.startTime + " · " + lesson.subject + " · " + (lesson.room || t("noRoom"));
    const mark = fingerprint(JSON.stringify([trigger, body, language]));
    result.push({ identifier, trigger, title: "TURĪBA NEXT", body, userInfo: { owner: OWNER, fingerprint: mark } });
    if (result.length === 32) break;
  }
  return result;
}

async function clearReminders(adapter) {
  const pending = (await adapter.pending()).filter(owns);
  if (pending.length) await adapter.remove(pending.map(item => item.identifier));
  return pending.length;
}

async function reconcileReminders(settings, state, now, language, adapter) {
  // OFF and secondary widgets do not even enumerate notifications or construct a plan.
  if (!settings.notifications.enabled || state.group !== settings.group || !settings.group) return { scheduled: 0, skipped: true };
  if (state.stale || state.offline || state.issue || state.coverageIncomplete) return { scheduled: 0, skipped: true };
  const plan = reminderPlan(settings, state.weeks || [], now, language);
  const pending = (await adapter.pending()).filter(owns);
  const desired = new Set(plan.map(item => item.identifier));
  const remove = pending.filter(item => !desired.has(item.identifier)).map(item => item.identifier);
  if (remove.length) await adapter.remove(remove);
  let scheduled = 0;
  for (const item of plan) {
    const existing = pending.find(candidate => candidate.identifier === item.identifier);
    if (!existing || existing.userInfo.fingerprint !== item.userInfo.fingerprint) {
      await adapter.schedule(item); scheduled++;
    }
  }
  return { scheduled, skipped: false };
}

module.exports = { OWNER, PREFIX, owns, reminderPlan, clearReminders, reconcileReminders };
