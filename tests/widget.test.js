"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const { STRINGS, resolveLanguage } = require("../src/localization");
const { PALETTES, themeColors } = require("../src/theme");
const { renderWidget, widgetModel, widgetMetrics } = require("../src/widget");
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
      assert.ok(!texts(result).includes(STRINGS[language].independent));
      if (state.current) assert.ok(texts(result).includes(lesson.subject));
      assert.ok(result.refreshAfterDate instanceof Date);
      if (theme === "system") assert.ok(result.backgroundColor.light && result.backgroundColor.dark);
      else assert.equal(result.backgroundColor.hex, PALETTES[theme].background);
    }
  }
});

test("reference layout gives room codes a large font and separates next subject from its right-hand time", () => {
  const state = { status: "soon", today: "2026-11-03", group: "TVL2D1", refreshAt: Date.now() + 60000,
    current: { date: "2026-11-03", startTime: "09:00", endTime: "10:30", subject: "E-komercija", room: "C216" },
    next: { date: "2026-11-03", startTime: "10:45", subject: "Grāmatvedība" } };
  function nodes(node) { return [node].concat(node.children.flatMap(nodes)); }
  for (const family of ["small", "medium"]) {
    const widget = renderWidget(state, defaults(), "en", family, api());
    const room = nodes(widget).find(node => node.kind === "text" && node.value === "C216");
    assert.ok(room.font.size >= 34);
    if (family === "medium") {
      const subject = nodes(widget).find(node => node.kind === "text" && node.value === "Grāmatvedība");
      const time = nodes(widget).find(node => node.kind === "text" && node.value === "10:45");
      assert.ok(subject.font.size >= 13); assert.ok(time.font.size >= 17);
      assert.ok(nodes(widget).some(node => node.kind === "stack" && node.backgroundColor && node.cornerRadius === 12));
    }
  }
  const model = widgetModel(state, "en"); assert.equal(model.date, ""); assert.equal(model.nextDate, "");
  state.next.date = "2026-11-04"; assert.equal(widgetModel(state, "en").nextDate, "04.11");
});

test("layout buckets reserve room-card width even on a narrow iPhone", () => {
  const renderer = api(); renderer.Device = { screenSize: () => ({ width: 320, height: 568 }) };
  assert.deepEqual(widgetMetrics(renderer), { small: 141, medium: 292 });
  const model = widgetModel({ status: "finished", today: "2026-11-03", next: { date: "2026-11-04", startTime: "09:00", subject: "A course" } }, "en");
  assert.equal(model.note, null); assert.ok(model.next.includes("04.11"));
});

test("Medium room text receives the full card content width without competing flexible spacers", () => {
  for (const screen of [320, 375, 390, 430]) {
    const renderer = api(); renderer.Device = { screenSize: () => ({ width: screen, height: 844 }) };
    const state = { status: "upcoming", today: "2026-10-31", group: "TVL2D1", refreshAt: Date.now() + 60000,
      current: { date: "2026-11-03", startTime: "09:00", endTime: "10:30", subject: "E-komercija", room: "C216" } };
    const widget = renderWidget(state, defaults(), "en", "medium", renderer);
    const all = node => [node].concat(node.children.flatMap(all));
    const nodes = all(widget), card = nodes.find(node => node.cornerRadius === 12);
    const row = nodes.find(node => node.children.some(child => child.kind === "text" && child.value === "C216"));
    assert.equal(row.size.width, card.size.width - card.padding[1] - card.padding[3]);
    assert.deepEqual(row.children.map(node => node.kind), ["text"]);
    assert.equal(row.children[0].textAlignment, "center");
    assert.ok(row.children[0].minimumScaleFactor <= 0.7);
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
