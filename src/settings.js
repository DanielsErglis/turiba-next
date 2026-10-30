"use strict";

const { ensure } = require("./errors");
const { normalizeGroup } = require("./parser");

function defaults() {
  return { version: 1, group: null, theme: "system", language: "system",
    notifications: { enabled: false, leadMinutes: 10 }, selections: {} };
}

function validateSettings(value) {
  ensure(value && value.version === 1, "INVALID_SETTINGS", "Unsupported settings version.");
  ensure(["system", "light", "dark"].includes(value.theme) && ["system", "lv", "en", "ru"].includes(value.language),
    "INVALID_SETTINGS", "Invalid theme or language.");
  ensure(value.notifications && typeof value.notifications.enabled === "boolean" &&
    [5, 10, 15, 30].includes(value.notifications.leadMinutes), "INVALID_SETTINGS", "Invalid reminder settings.");
  ensure(value.selections && typeof value.selections === "object" && !Array.isArray(value.selections),
    "INVALID_SETTINGS", "Invalid study selections.");
  const result = defaults();
  result.group = value.group === null ? null : normalizeGroup(value.group);
  result.theme = value.theme; result.language = value.language;
  result.notifications = { enabled: value.notifications.enabled, leadMinutes: value.notifications.leadMinutes };
  for (const key of Object.keys(value.selections)) {
    const group = normalizeGroup(key);
    const choices = value.selections[key];
    ensure(Array.isArray(choices) && choices.length <= 300 && choices.every(choice => typeof choice === "string" && choice.length > 0 && choice.length <= 500),
      "INVALID_SETTINGS", "Invalid elective/subgroup selection.");
    result.selections[group] = Array.from(new Set(choices));
  }
  return result;
}

function widgetGroup(settings, parameter) {
  return typeof parameter === "string" && parameter.trim() ? normalizeGroup(parameter) : settings.group;
}

function choiceKey(lesson) {
  // Subject is part of the key so choosing one course does not select unrelated electives.
  return JSON.stringify([lesson.sourceGroup, lesson.subject]);
}

function selectLessons(lessons, group, selections) {
  const choices = new Set(selections || []);
  return lessons.filter(lesson => lesson.group === group && (!lesson.requiresSelection || choices.has(choiceKey(lesson))));
}

function availableChoices(lessons, group) {
  const seen = new Set();
  return lessons.filter(lesson => lesson.group === group && lesson.requiresSelection).filter(lesson => {
    const key = choiceKey(lesson);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).map(lesson => ({ key: choiceKey(lesson), subject: lesson.subject, subgroup: lesson.subgroup, elective: lesson.elective }));
}

module.exports = { defaults, validateSettings, widgetGroup, choiceKey, selectLessons, availableChoices };
