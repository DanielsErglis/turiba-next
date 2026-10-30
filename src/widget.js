"use strict";

const { translator } = require("./localization");
const { themeColors } = require("./theme");

function dateLabel(date) { return date.slice(8, 10) + "." + date.slice(5, 7); }

function widgetModel(state, language) {
  const t = translator(language), lesson = state.current;
  const badge = state.offline ? t("offline") : state.stale ? t("stale") : state.coverageIncomplete ? t("unknownCoverage") : null;
  return { title: "TURĪBA NEXT", group: state.group || "", status: t(state.status),
    subject: lesson ? lesson.subject : t(state.status), room: lesson ? lesson.room || t("noRoom") : "",
    time: lesson ? dateLabel(lesson.date) + " · " + lesson.startTime + "–" + lesson.endTime : "",
    next: state.next ? t("next") + " · " + dateLabel(state.next.date) + " " + state.next.startTime + " · " + state.next.subject : "",
    badge, note: state.selectionRequired ? t("selection") : t("independent") };
}

function renderWidget(state, settings, language, family, api) {
  const medium = family === "medium", t = translator(language), model = widgetModel(state, language);
  const colors = themeColors(settings.theme, api.Color);
  const widget = new api.ListWidget();
  widget.backgroundColor = colors.background;
  widget.setPadding(14, 14, 12, 14);
  widget.refreshAfterDate = new Date(state.refreshAt);
  widget.url = api.runUrl;
  function label(container, value, size, color, weight, lines) {
    const item = container.addText(value);
    item.font = weight === "bold" ? api.Font.boldSystemFont(size) : api.Font.mediumSystemFont(size);
    item.textColor = color; item.lineLimit = lines || 1; item.minimumScaleFactor = 0.75;
    return item;
  }
  const header = widget.addStack(); header.centerAlignContent();
  label(header, model.title, 10, colors.accent, "bold"); header.addSpacer();
  if (medium && model.group) label(header, model.group, 10, colors.muted);
  widget.addSpacer(8);
  if (!["small", "medium"].includes(family)) { label(widget, t("unsupported"), 13, colors.text, "bold", 3); return widget; }
  if (medium) {
    label(widget, model.status, 10, colors.accent, "bold"); widget.addSpacer(3);
    label(widget, model.subject, 17, colors.text, "bold", 2); widget.addSpacer(4);
    const metadata = widget.addStack(); metadata.centerAlignContent();
    if (model.time) label(metadata, model.time, 10, colors.muted);
    metadata.addSpacer();
    if (model.room) label(metadata, model.room, model.room.length > 12 ? 10 : 22, colors.accent, "bold", 1);
    widget.addSpacer(4);
    if (model.next) label(widget, model.next, 10, colors.muted, null, 1);
  } else {
    label(widget, model.status, 10, colors.accent, "bold"); widget.addSpacer(4);
    label(widget, model.subject, 16, colors.text, "bold", 2); widget.addSpacer();
    if (model.room) label(widget, model.room, model.room.length > 12 ? 11 : 23, colors.accent, "bold", 1);
    if (model.time) label(widget, model.time, 10, colors.muted);
    if (!model.time && model.next) label(widget, model.next, 10, colors.muted, null, 2);
  }
  widget.addSpacer();
  label(widget, model.badge || model.note, 8, colors.muted, null, 1);
  return widget;
}

module.exports = { widgetModel, renderWidget, dateLabel };
