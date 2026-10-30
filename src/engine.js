"use strict";

const { ensure } = require("./errors");
const { timestamp, rigaParts, rigaInstant } = require("./time");
const { selectLessons } = require("./settings");

function timedLesson(lesson) {
  const start = rigaInstant(lesson.date, lesson.startTime);
  const end = rigaInstant(lesson.date, lesson.endTime);
  ensure(end > start, "INVALID_LESSON", "The lesson must end after it begins.");
  return Object.assign({}, lesson, { start, end });
}

function scheduleState(options) {
  const now = timestamp(options.now);
  const today = rigaParts(now).date;
  const base = { status: "setupRequired", current: null, next: null, nextStatus: null, concurrent: [],
    offline: !!options.offline, stale: !!options.stale, issue: options.issue || null, today,
    refreshAt: now + 15 * 60000, selectionRequired: false, coverageIncomplete: false };
  if (!options.group) return base;
  const weeks = (options.weeks || []).filter(week => week.group === options.group && week.status === "published");
  const coverage = weeks.some(week => week.weekStart <= today && week.weekEnd >= today);
  base.coverageIncomplete = !coverage;
  const raw = weeks.flatMap(week => week.lessons);
  const selected = selectLessons(raw, options.group, options.selections);
  base.selectionRequired = raw.some(lesson => lesson.requiresSelection && !selected.includes(lesson));
  const lessons = selected.map(timedLesson).sort((a, b) => a.start - b.start || a.end - b.end || a.subject.localeCompare(b.subject));
  const active = lessons.filter(lesson => lesson.start <= now && now < lesson.end);
  const future = lessons.filter(lesson => lesson.start > now);
  if (active.length) {
    base.status = "ongoing"; base.current = active[0]; base.concurrent = active.slice(1);
    base.next = future[0] || null; base.nextStatus = base.next ? "next" : null;
  } else if (future.length) {
    base.current = future[0]; base.next = future[1] || null;
    base.status = future[0].start - now <= 10 * 60000 ? "soon" : "upcoming";
    // Preserve today's finished state while still exposing the following known lesson.
    if (coverage && future[0].date !== today && lessons.some(lesson => lesson.date === today && lesson.end <= now)) {
      base.status = "finished"; base.current = null; base.next = future[0];
    }
    base.nextStatus = base.next ? "next" : null;
  } else if (coverage) {
    base.status = lessons.some(lesson => lesson.date === today && lesson.end <= now) ? "finished" : "noSchedule";
  } else {
    base.status = "error"; base.issue = base.issue || "SCHEDULE_UNAVAILABLE";
  }
  const boundaries = lessons.flatMap(lesson => [lesson.start - 10 * 60000, lesson.start, lesson.end]).filter(value => value > now);
  // Midnight is a calendar boundary in Riga; a day is not always 24 hours long.
  const { addDays } = require("./time");
  boundaries.push(rigaInstant(addDays(today, 1), "00:00"));
  base.refreshAt = Math.min(base.refreshAt, ...boundaries);
  return base;
}

module.exports = { timedLesson, scheduleState };
