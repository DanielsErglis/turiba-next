"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const { STRINGS, resolveLanguage } = require("../src/localization");
const { PALETTES, themeColors } = require("../src/theme");
const { renderWidget, widgetModel } = require("../src/widget");
const { api, texts } = require("../tools/widget-mock");
const { defaults } = require("../src/settings");

test("all UI keys are translated and device language fallback is deterministic", () => {
  for (const language of ["lv", "en", "ru"]) {
    assert.deepEqual(Object.keys(STRINGS[language]).sort(), Object.keys(STRINGS.en).sort());
    assert.ok(Object.values(STRINGS[language]).every(value => typeof value === "string" && value.length));
  }
  assert.equal(resolveLanguage("system", ["lv-LV"]), "lv");
  assert.equal(resolveLanguage("system", ["de-DE"]), "en");
  assert.equal(resolveLanguage("ru", ["lv-LV"]), "ru");
});

test("Small and Medium render every state in all languages and theme modes without networking", () => {
  const lesson = { date: "2026-10-30", startTime: "12:55", endTime: "14:25", subject: "Introduction to Computer Architecture, Computer Engineering and Computer Systems", room: "C217" };
  for (const language of ["lv", "en", "ru"]) for (const theme of ["system", "light", "dark"]) for (const family of ["small", "medium"]) {
    for (const status of ["upcoming", "soon", "ongoing", "finished", "noSchedule", "error", "setupRequired"]) {
      const state = { status, group: "TVL2D1", current: ["upcoming", "soon", "ongoing"].includes(status) ? lesson : null,
        next: lesson, refreshAt: Date.now() + 60000, stale: false };
      const result = renderWidget(state, Object.assign(defaults(), { theme }), language, family, api());
      assert.ok(texts(result).includes("TURĪBA NEXT")); assert.ok(texts(result).includes(STRINGS[language][status]));
      if (state.current) assert.ok(texts(result).includes(lesson.subject));
      assert.ok(result.refreshAfterDate instanceof Date);
      if (theme === "system") assert.ok(result.backgroundColor.light && result.backgroundColor.dark);
      else assert.equal(result.backgroundColor.hex, PALETTES[theme].background);
    }
  }
});

test("saved-data warnings, missing rooms and next-lesson dates cannot be hidden in the view model", () => {
  const state = { status: "ongoing", offline: true, current: { date: "2026-10-30", startTime: "12:55", endTime: "14:25", subject: "Course", room: null },
    next: { date: "2026-11-03", startTime: "09:00", subject: "Another course" } };
  const result = widgetModel(state, "ru");
  assert.equal(result.room, STRINGS.ru.noRoom); assert.equal(result.badge, STRINGS.ru.offline);
  assert.ok(result.next.includes("03.11"));
  assert.ok(themeColors("light", api().Color).accent.hex);
});
