"use strict";

const { ensure } = require("./errors");
const DAY = 86400000;
let formatter;

function timestamp(value) {
  const result = value instanceof Date ? value.getTime() : value;
  ensure(typeof result === "number" && Number.isFinite(result), "INVALID_TIME", "A finite instant is required.");
  return result;
}

function calendarDate(value) {
  ensure(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), "INVALID_DATE", "An ISO calendar date is required.");
  const result = Date.parse(value + "T00:00:00Z");
  ensure(Number.isFinite(result) && new Date(result).toISOString().slice(0, 10) === value,
    "INVALID_DATE", "The calendar date is invalid.");
  return result;
}

function addDays(date, days) {
  ensure(Number.isInteger(days), "INVALID_DATE", "A whole number of calendar days is required.");
  return new Date(calendarDate(date) + days * DAY).toISOString().slice(0, 10);
}

function weekStart(date) {
  const weekday = new Date(calendarDate(date)).getUTCDay();
  return addDays(date, -(weekday === 0 ? 6 : weekday - 1));
}

function rigaParts(instant) {
  ensure(typeof Intl !== "undefined" && Intl.DateTimeFormat, "TIME_ZONE_UNAVAILABLE", "IANA time-zone support is required.");
  if (!formatter) formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Riga", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  ensure(typeof formatter.formatToParts === "function", "TIME_ZONE_UNAVAILABLE", "Time-zone date parts are unavailable.");
  const fields = {};
  for (const part of formatter.formatToParts(new Date(timestamp(instant)))) fields[part.type] = part.value;
  ensure(fields.hour !== "24", "TIME_ZONE_UNAVAILABLE", "The time-zone provider returned an unsupported midnight format.");
  return { date: fields.year + "-" + fields.month + "-" + fields.day,
    time: fields.hour + ":" + fields.minute, second: Number(fields.second) };
}

function wallEpoch(parts) {
  return Date.parse(parts.date + "T" + parts.time + ":00Z") + parts.second * 1000;
}

function rigaInstant(date, time, disambiguation) {
  calendarDate(date);
  ensure(typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time), "INVALID_TIME", "A valid HH:mm time is required.");
  const mode = disambiguation || "reject";
  ensure(["reject", "earlier", "later"].includes(mode), "INVALID_TIME", "Unsupported time disambiguation.");
  const wall = Date.parse(date + "T" + time + ":00Z");
  const offsets = new Set([-2, -1, 0, 1, 2].map(day => {
    const sample = wall + day * DAY;
    return wallEpoch(rigaParts(sample)) - sample;
  }));
  const candidates = Array.from(offsets).map(offset => wall - offset).filter(instant => {
    const parts = rigaParts(instant);
    return parts.date === date && parts.time === time && parts.second === 0;
  }).sort((a, b) => a - b);
  ensure(candidates.length > 0, "NONEXISTENT_LOCAL_TIME", "The Riga wall time does not exist during a clock transition.");
  ensure(candidates.length === 1 || mode !== "reject", "AMBIGUOUS_LOCAL_TIME", "The Riga wall time occurs twice during a clock transition.");
  return mode === "later" ? candidates[candidates.length - 1] : candidates[0];
}

function serverWeekStart(instant) {
  const date = rigaParts(instant).date;
  return new Date(calendarDate(date)).getUTCDay() === 0 ? addDays(date, 1) : weekStart(date);
}

module.exports = { DAY, timestamp, calendarDate, addDays, weekStart, rigaParts, rigaInstant, serverWeekStart };
