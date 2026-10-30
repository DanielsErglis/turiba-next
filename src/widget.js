"use strict";

const { translator } = require("./localization");
const { themeColors } = require("./theme");

function dateLabel(date) { return date.slice(8, 10) + "." + date.slice(5, 7); }

function widgetModel(state, language) {
  const t = translator(language), lesson = state.current, next = state.next;
  const badge = state.offline ? t("offline") : state.stale ? t("stale") : state.coverageIncomplete ? t("unknownCoverage") : null;
  const date = lesson && lesson.date !== state.today ? dateLabel(lesson.date) : "";
  const nextDate = next && next.date !== (state.today || (lesson && lesson.date)) ? dateLabel(next.date) : "";
  return { title: "TURĪBA NEXT", group: state.group || "", status: t(state.status),
    subject: lesson ? lesson.subject : t(state.status), room: lesson ? lesson.room || t("noRoom") : "",
    roomProvided: !!(lesson && lesson.room), hasLesson: !!lesson, date,
    start: lesson ? lesson.startTime : "", range: lesson ? lesson.startTime + "–" + lesson.endTime : "",
    time: lesson ? [date, lesson.startTime + "–" + lesson.endTime].filter(Boolean).join(" · ") : "",
    next: next ? t("upNext") + " · " + [nextDate, next.startTime, next.subject].filter(Boolean).join(" · ") : "",
    nextSubject: next ? next.subject : "", nextTime: next ? next.startTime : "", nextDate,
    nextLabel: [t("upNext"), nextDate].filter(Boolean).join(" · "),
    badge, note: state.selectionRequired ? t("selection") : null };
}

function widgetMetrics(api) {
  let screen = 390;
  if (api.Device && typeof api.Device.screenSize === "function") {
    const size = api.Device.screenSize();
    if (size && size.width > 0 && size.height > 0) screen = Math.min(size.width, size.height);
  }
  // Conservative portrait iPhone layout buckets. Browser previews also exercise the narrow bucket.
  if (screen < 375) return { small: 141, medium: 292 };
  if (screen < 390) return { small: 155, medium: 329 };
  if (screen < 414) return { small: 158, medium: 338 };
  if (screen < 428) return { small: 169, medium: 360 };
  return { small: 170, medium: 364 };
}

function renderWidget(state, settings, language, family, api) {
  const medium = family === "medium", t = translator(language), model = widgetModel(state, language);
  const colors = themeColors(settings.theme, api.Color), metrics = widgetMetrics(api);
  const notice = model.badge || model.note;
  const widget = new api.ListWidget();
  widget.backgroundColor = colors.background;
  widget.setPadding(12, 12, 10, 12);
  widget.refreshAfterDate = new Date(state.refreshAt);
  widget.url = api.runUrl;
  function label(container, value, size, color, weight, lines, scale) {
    const item = container.addText(value);
    item.font = weight === "bold" ? api.Font.boldSystemFont(size) : api.Font.mediumSystemFont(size);
    item.textColor = color; item.lineLimit = lines || 1; item.minimumScaleFactor = scale || 0.85;
    return item;
  }
  function accentLine() {
    const line = widget.addStack(); line.backgroundColor = colors.accent;
    line.size = new api.Size(0, 3); line.cornerRadius = 1.5; line.addSpacer();
  }
  function centered(container, value, size, color, weight, lines) {
    const row = container.addStack(); row.addSpacer();
    label(row, value, size, color, weight, lines).centerAlignText(); row.addSpacer();
  }
  const header = widget.addStack(); header.centerAlignContent();
  if (!medium) {
    const mark = header.addStack(); mark.size = new api.Size(4, 13); mark.backgroundColor = colors.accent; mark.cornerRadius = 2;
    header.addSpacer(5);
  }
  label(header, model.title, medium ? 12 : 9, medium ? colors.text : colors.muted, "bold"); header.addSpacer();
  if (medium && model.group) label(header, model.group, 10, colors.muted);
  widget.addSpacer(medium ? 7 : 7);
  if (!["small", "medium"].includes(family)) {
    label(widget, t("unsupported"), 15, colors.text, "bold", 3); return widget;
  }
  if (medium) {
    const width = metrics.medium - 24, roomWidth = Math.round(metrics.medium * 0.31);
    const narrow = metrics.medium < 320;
    const bodyHeight = Math.min(notice ? 69 : 78, metrics.small - (notice ? 84 : 80));
    const body = widget.addStack(); body.centerAlignContent();
    const main = body.addStack(); main.layoutVertically(); main.size = new api.Size(model.hasLesson ? width - roomWidth - 12 : width, bodyHeight);
    main.addSpacer();
    label(main, model.status, narrow ? 9 : 10, colors.accent, "bold"); main.addSpacer(narrow ? 1 : 3);
    const subjectSize = narrow ? (notice ? 15 : 16) : model.subject.length > 22 ? (notice ? 18 : 20) : 24;
    label(main, model.subject, subjectSize, colors.text, "bold", 2, 0.85); main.addSpacer(narrow ? 1 : 3);
    if (model.time) label(main, model.time, narrow ? 11 : 14, colors.muted);
    main.addSpacer();
    if (model.hasLesson) {
      body.addSpacer(12);
      const room = body.addStack(); room.layoutVertically(); room.size = new api.Size(roomWidth, bodyHeight);
      room.backgroundColor = colors.card; room.cornerRadius = 12; room.setPadding(6, 7, 6, 7); room.addSpacer();
      centered(room, t("room"), 9, colors.muted); room.addSpacer(3);
      const roomSize = !model.roomProvided ? 12 : model.room.length <= 5 ? Math.min(38, Math.floor((roomWidth - 14) / (model.room.length * 0.63)), Math.floor((bodyHeight - 25) / 1.1)) : model.room.length <= 9 ? (narrow ? 15 : notice ? 18 : 22) : 15;
      centered(room, model.room, roomSize, colors.roomText, "bold", model.roomProvided && model.room.length <= 5 ? 1 : 2);
      room.addSpacer();
    }
    widget.addSpacer();
    if (model.nextSubject) {
      const next = widget.addStack(); next.centerAlignContent();
      const description = next.addStack(); description.layoutVertically(); description.size = new api.Size(width - 57, 29);
      label(description, model.nextLabel, 9, colors.muted, null, 1);
      label(description, model.nextSubject, 13, colors.text, "bold", 1, 0.9);
      next.addSpacer(); label(next, model.nextTime, 17, colors.accent, "bold");
    }
    if (notice) { widget.addSpacer(2); label(widget, notice, 9, colors.muted); }
    else { widget.addSpacer(5); accentLine(); }
  } else {
    const narrow = metrics.small < 155;
    const status = widget.addStack(); status.centerAlignContent();
    label(status, model.status, 9, colors.accent, "bold"); status.addSpacer();
    if (model.date) label(status, model.date, 9, colors.muted);
    widget.addSpacer(4);
    label(widget, model.subject, model.subject.length > 20 ? 17 : narrow ? 18 : 20, colors.text, "bold", 2, 0.9);
    widget.addSpacer();
    if (model.room) {
      if (model.roomProvided && !(narrow && model.subject.length > 20)) { label(widget, t("room"), 9, colors.muted); widget.addSpacer(1); }
      const details = widget.addStack(); details.bottomAlignContent();
      const roomSize = !model.roomProvided ? 12 : model.room.length <= 5 ? (narrow || notice ? 34 : 38) : model.room.length <= 9 ? 23 : 15;
      // Reserve a readable start time alongside compact room codes; long locations get their own row.
      label(details, model.room, roomSize, colors.accent, "bold", model.roomProvided ? 1 : 2, 0.85);
      if (model.roomProvided && model.room.length <= 5) { details.addSpacer(); label(details, model.start, 13, colors.text); }
      else if (model.start) label(widget, model.start, 13, colors.text);
    } else if (model.nextSubject) {
      label(widget, model.nextLabel, 9, colors.muted);
      label(widget, model.nextSubject, 13, colors.text, "bold", 2);
      label(widget, model.nextTime, 16, colors.accent, "bold");
    }
    if (notice) { widget.addSpacer(3); label(widget, notice, 9, colors.muted); }
    else { widget.addSpacer(6); accentLine(); }
  }
  return widget;
}

module.exports = { widgetModel, widgetMetrics, renderWidget, dateLabel };
