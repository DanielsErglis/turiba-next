// Variables used by Scriptable.
// icon-color: cyan; icon-glyph: graduation-cap;
// TURIBA NEXT 1.1.0-rc.2 — independent student project. Native device acceptance pending.
const __factories = {
"app": function(module, exports) {
"use strict";

const { Storage } = __load("storage");
const { SourceClient } = __load("source-client");
const { ScheduleService } = __load("schedule-service");
const { defaults, widgetGroup, availableChoices, validateSettings } = __load("settings");
const { normalizeGroup } = __load("parser");
const { resolveLanguage, translator } = __load("localization");
const { renderWidget } = __load("widget");
const { scheduleState } = __load("engine");
const { localAdapter, transport, notificationAdapter } = __load("scriptable-adapters");
const { clearReminders, reconcileReminders } = __load("notifications");
const { errorReport, presentDialog, captureTextInput } = __load("diagnostics");

async function run(api) {
  api.runUrl = "scriptable:///run?scriptName=" + encodeURIComponent(api.Script.name());
  api.stage = "storage.initialize";
  const storage = new Storage(localAdapter(api));
  const service = new ScheduleService(new SourceClient(transport(api)), storage);
  const reminders = notificationAdapter(api);
  let settings = defaults(), settingsIssue = null, state = null;
  api.stage = "settings.load";
  try { settings = storage.settings(); } catch (error) { settingsIssue = error.code; }
  api.language = settings.language;
  const language = () => resolveLanguage(settings.language, api.Device.preferredLanguages());
  const t = key => translator(language())(key);
  async function alert(title, message, actions, destructive, stage) {
    const dialog = new api.Alert(); dialog.title = title; dialog.message = message || "";
    for (const action of actions || []) dialog.addAction(action);
    if (destructive) dialog.addDestructiveAction(destructive);
    dialog.addCancelAction(t("cancel")); return presentDialog(api, dialog, stage || "settings.dialog");
  }
  async function tell(message) { await alert("TURĪBA NEXT", message, [t("done")]); }
  async function tellFailure(error, stage) {
    const details = errorReport(error, stage || api.stage, api.version);
    await tell(t("failure") + "\n\n" + details);
  }
  function save() {
    api.stage = "settings.save";
    api.language = settings.language;
    settings = validateSettings(settings); storage.saveSettings(settings);
  }
  async function load(group, force) {
    try { return await service.state(settings, group, Date.now(), force); }
    catch (error) {
      // The error view must remain usable even if the clock provider itself failed.
      return { status: "error", now: Date.now(), group, weeks: [], current: null, next: null,
        issue: error.code || "SCHEDULE_UNAVAILABLE", failure: error,
        refreshAt: Date.now() + 900000, stale: true, coverageIncomplete: true };
    }
  }
  async function syncReminders() {
    if (!settings.notifications.enabled || !state) return;
    try { await reconcileReminders(settings, state, Date.now(), language(), reminders); }
    catch (error) { await tell(t("permissionFailure")); }
  }
  async function changeGroup() {
    api.stage = "setup.group.configure";
    const dialog = new api.Alert(); dialog.title = t("group"); dialog.message = t("groupPrompt");
    const field = dialog.addTextField(t("group"), settings.group || ""); dialog.addAction(t("save")); dialog.addCancelAction(t("cancel"));
    const response = await presentDialog(api, dialog, "setup.group.present", async action => {
      if (action < 0) return { action, text: null };
      api.stage = "setup.group.read";
      return { action, text: await captureTextInput(dialog, field, 0) };
    });
    if (response.action < 0) return;
    api.stage = "setup.group.validate";
    const group = normalizeGroup(response.text);
    const candidate = await load(group, true);
    if (!candidate.weeks.length && !["SOURCE_UNPUBLISHED", "SOURCE_EMPTYUNCONFIRMED"].includes(candidate.issue)) {
      await tellFailure(candidate.failure || { code: candidate.issue, message: "The group schedule could not be verified." }, "setup.group.load"); return;
    }
    if (settings.group && settings.group !== group) await clearReminders(reminders);
    settings.group = group; save(); state = candidate;
    if (!candidate.weeks.length) await tell(t("sourceUnavailable"));
    await syncReminders();
  }
  async function chooseCourses() {
    if (!settings.group) return changeGroup();
    if (!state) state = await load(settings.group, false);
    const choices = availableChoices((state.weeks || []).flatMap(week => week.lessons), settings.group);
    if (!choices.length) return tell(t("noChoices"));
    while (true) {
      const selected = settings.selections[settings.group] || [];
      const index = await alert(t("choices"), t("choicesHint"), choices.map(choice =>
        (selected.includes(choice.key) ? "✓ " : "○ ") + choice.subject + (choice.subgroup ? " · " + choice.subgroup : "")));
      if (index < 0) break;
      const key = choices[index].key;
      if (settings.notifications.enabled) await clearReminders(reminders);
      settings.selections[settings.group] = selected.includes(key) ? selected.filter(value => value !== key) : selected.concat(key);
      save();
    }
    state = await load(settings.group, false); await syncReminders();
  }
  async function setReminders() {
    const enabled = await alert(t("notifications"), t("reminderHint"), [t("off"), t("on")]);
    if (enabled < 0) return;
    if (enabled === 0) {
      settings.notifications.enabled = false; save(); await clearReminders(reminders); return;
    }
    if (!settings.group) { await changeGroup(); if (!settings.group) return; }
    const options = [10, 5, 15, 30];
    const index = await alert(t("notifications"), "", options.map(value => value + " " + t("minutes")));
    if (index < 0) return;
    settings.notifications = { enabled: true, leadMinutes: options[index] }; save();
    state = await load(settings.group, true); await syncReminders();
  }
  async function deleteData() {
    const index = await alert(t("deleteData"), t("deleteConfirm"), [], t("deleteData"));
    if (index < 0) return false;
    // Remove reminders first; preserve the local record if cleanup fails so deletion can be retried.
    await clearReminders(reminders); storage.deleteLocalData(); settings = defaults(); settingsIssue = null; state = null;
    return true;
  }

  if (api.config.runsInWidget) {
    let group;
    try { group = widgetGroup(settings, api.args.widgetParameter); }
    catch (error) { settingsIssue = error.code; }
    state = settingsIssue ? Object.assign(scheduleState({ now: Date.now(), group: group || "invalid", issue: settingsIssue }), { group }) : await load(group, false);
    if (settings.notifications.enabled && !settingsIssue) {
      try { await reconcileReminders(settings, state, Date.now(), language(), reminders); } catch (error) { state.stale = true; }
    }
    api.Script.setWidget(renderWidget(state, settings, language(), api.config.widgetFamily || "small", api));
    api.Script.complete(); return;
  }
  const shortcut = api.args.shortcutParameter === "sync" || api.args.shortcutParameter && api.args.shortcutParameter.action === "sync";
  if (shortcut) {
    if (settingsIssue) throw new Error("Local settings are unreadable; open TURIBA NEXT to recover.");
    state = await load(settings.group, true);
    if (settings.notifications.enabled) await reconcileReminders(settings, state, Date.now(), language(), reminders);
    api.Script.setShortcutOutput(state.issue || (state.status === "setupRequired" ? "setupRequired" : "ok")); api.Script.complete(); return;
  }
  if (settingsIssue) {
    await tell(t("resetCorrupt"));
    if (!await deleteData()) { api.Script.complete(); return; }
  }
  if (!settings.group) {
    const choice = await alert(t("language"), "", ["Latviešu", "English", "Русский", t("system")], null, "setup.language");
    if (choice >= 0) { settings.language = ["lv", "en", "ru", "system"][choice]; save(); }
    try { await changeGroup(); } catch (error) { await tellFailure(error); }
  }
  while (true) {
    const actions = [t("group") + ": " + (settings.group || t("noGroup")), t("choices"), t("sync"), t("theme"), t("language"),
      t("notifications") + ": " + t(settings.notifications.enabled ? "on" : "off"), t("previewSmall"), t("previewMedium"), t("about"), t("deleteData")];
    const action = await alert("TURĪBA NEXT", t("independent"), actions);
    if (action < 0) break;
    try {
      if (action === 0) await changeGroup();
      if (action === 1) await chooseCourses();
      if (action === 2) {
        state = await load(settings.group, true); await syncReminders();
        if (state.issue) await tellFailure(state.failure || { code: state.issue, message: "The schedule could not be refreshed." }, "schedule.refresh");
        else await tell(t("synced"));
      }
      if (action === 3) {
        const index = await alert(t("theme"), "", [t("system"), t("light"), t("dark")]);
        if (index >= 0) { settings.theme = ["system", "light", "dark"][index]; save(); }
      }
      if (action === 4) {
        const index = await alert(t("language"), "", [t("system"), "Latviešu", "English", "Русский"]);
        if (index >= 0) { settings.language = ["system", "lv", "en", "ru"][index]; save(); await syncReminders(); }
      }
      if (action === 5) await setReminders();
      if (action === 6 || action === 7) {
        if (!state) state = await load(settings.group, false);
        const family = action === 6 ? "small" : "medium";
        const widget = renderWidget(state, settings, language(), family, api);
        if (family === "small") await widget.presentSmall(); else await widget.presentMedium();
      }
      if (action === 8) await tell(t("privacy"));
      if (action === 9 && await deleteData()) await changeGroup();
    } catch (error) { await tellFailure(error); }
  }
  api.Script.complete();
}

module.exports = { run };

},
"diagnostics": function(module, exports) {
"use strict";

const { ensure } = __load("errors");

// Diagnostics stay on the device. They are never uploaded or sent to another service.
function errorReport(error, stage, version) {
  const clean = value => String(value || "Unknown error").replace(/\/(?:private|var|Users)\/[^\s]+/g, "[local path]").slice(0, 240);
  const code = error && error.code || error && error.name || "UNEXPECTED_ERROR";
  const lines = ["Build: " + (version || "development"), "Stage: " + (stage || "unknown"),
    "Code: " + clean(code), "Message: " + clean(error && error.message)];
  if (error && error.details && error.details.cause) lines.push("Cause: " + clean(error.details.cause));
  return lines.join("\n");
}

async function presentDialog(api, dialog, stage, capture) {
  api.stage = stage;
  const result = await dialog.presentAlert();
  // Snapshot native input before yielding to a dismissal timer or another controller.
  let captured;
  try { captured = capture ? await capture(result) : result; }
  finally {
    // Also settle dismissal when input capture fails before showing the error controller.
    if (api.Timer && typeof api.Timer.schedule === "function") {
      await new Promise(resolve => { api.Timer.schedule(350, false, resolve); });
    }
  }
  return captured;
}

async function captureTextInput(dialog, field, index) {
  let value, failure;
  try { value = await dialog.textFieldValue(index); }
  catch (error) { failure = error; }
  if (typeof value === "string") return value;
  const reference = await field;
  const direct = reference ? await reference.text : undefined;
  ensure(typeof direct === "string", "GROUP_INPUT_UNAVAILABLE", "The native dialog did not return text.",
    { cause: failure ? failure.message : "textFieldValue type: " + typeof value + "; TextField.text type: " + typeof direct });
  return direct;
}

module.exports = { errorReport, presentDialog, captureTextInput };

},
"engine": function(module, exports) {
"use strict";

const { ensure } = __load("errors");
const { timestamp, rigaParts, rigaInstant } = __load("time");
const { selectLessons } = __load("settings");

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
  const { addDays } = __load("time");
  boundaries.push(rigaInstant(addDays(today, 1), "00:00"));
  base.refreshAt = Math.min(base.refreshAt, ...boundaries);
  return base;
}

module.exports = { timedLesson, scheduleState };

},
"errors": function(module, exports) {
"use strict";

class ScheduleError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "ScheduleError";
    this.code = code;
    this.details = details || {};
  }
}

function ensure(condition, code, message, details) {
  if (!condition) throw new ScheduleError(code, message, details);
}

module.exports = { ScheduleError, ensure };

},
"html": function(module, exports) {
"use strict";

const { ensure } = __load("errors");

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const ENTITIES = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ndash: "–", mdash: "—" };

function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
    if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] || whole;
    const hex = entity.slice(0, 2).toLowerCase() === "#x";
    const number = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : "�";
  });
}

// This constrained tokenizer reads data only. It never creates a browser or executes scripts.
function parseHtml(html) {
  ensure(typeof html === "string" && html.length > 0 && html.length <= 2000000,
    "HTML_PARSE_ERROR", "HTML is empty, invalid or exceeds the size limit.");
  const clean = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const root = { tag: "root", attrs: {}, children: [] };
  const stack = [root];
  const tokens = clean.match(/<(?:(?:"[^"]*"|'[^']*'|[^'">])*)>|[^<]+|</g) || [];
  for (const token of tokens) {
    const current = stack[stack.length - 1];
    if (token[0] !== "<") {
      current.children.push(decodeEntities(token));
      continue;
    }
    if (/^<!/i.test(token)) continue;
    ensure(token !== "<", "HTML_PARSE_ERROR", "HTML contains an incomplete tag.");
    const closing = token.match(/^<\/\s*([a-z][\w:-]*)\s*>$/i);
    if (closing) {
      const tag = closing[1].toLowerCase();
      ensure(stack.length > 1 && current.tag === tag, "HTML_PARSE_ERROR", "HTML tags are unbalanced.", { tag });
      stack.pop();
      continue;
    }
    const opening = token.match(/^<([a-z][\w:-]*)\b([\s\S]*?)\/?\s*>$/i);
    ensure(opening, "HTML_PARSE_ERROR", "HTML contains an invalid tag.");
    const attrs = {};
    const matcher = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    while ((match = matcher.exec(opening[2]))) {
      attrs[match[1].toLowerCase()] = decodeEntities(match[2] === undefined ? (match[3] === undefined ? (match[4] || "") : match[3]) : match[2]);
    }
    const node = { tag: opening[1].toLowerCase(), attrs, children: [] };
    current.children.push(node);
    if (!VOID_TAGS.has(node.tag) && !/\/\s*>$/.test(token)) stack.push(node);
    ensure(stack.length <= 256, "HTML_PARSE_ERROR", "HTML nesting exceeds the limit.");
  }
  ensure(stack.length === 1, "HTML_PARSE_ERROR", "HTML is truncated or has unclosed tags.");
  return root;
}

function descendants(node, predicate) {
  const result = [];
  function visit(item) {
    if (typeof item === "string") return;
    if (predicate(item)) result.push(item);
    item.children.forEach(visit);
  }
  visit(node);
  return result;
}

function text(node) {
  function collect(item) {
    if (typeof item === "string") return item;
    if (item.tag === "br") return " ";
    return item.children.map(collect).join("");
  }
  return collect(node).replace(/\s+/g, " ").trim();
}

function hasClass(node, name) {
  return (node.attrs.class || "").split(/\s+/).includes(name);
}

module.exports = { parseHtml, descendants, text, hasClass, decodeEntities };

},
"localization": function(module, exports) {
"use strict";

const STRINGS = {
  en: {
    upcoming: "Next class", soon: "Starting soon", ongoing: "In progress", next: "Next", upNext: "Up next", finished: "Done for today", noSchedule: "No selected classes today",
    offline: "Offline · saved data", error: "Schedule unavailable", setupRequired: "Choose your group", stale: "Check latest timetable", room: "Room", noRoom: "Room not provided",
    settings: "Settings", group: "Study group", groupPrompt: "Enter your group code from the public timetable.", language: "Language", theme: "Appearance", system: "System", light: "Light", dark: "Dark",
    choices: "Electives & subgroups", choicesHint: "Select only your own courses and subgroups. BATIS may contain additional personal information.", noChoices: "No choices found in the loaded weeks.",
    sync: "Sync now", synced: "Timetable refreshed", notifications: "Class reminders", on: "On", off: "Off", minutes: "minutes", reminderHint: "Optional local reminders for the main group. iOS may request notification permission. Refresh regularly to keep reminders current.",
    previewSmall: "Preview Small", previewMedium: "Preview Medium", deleteData: "Delete My Data", deleteConfirm: "Delete local settings, timetable cache and pending TURĪBA NEXT reminders?", cancel: "Cancel", done: "Done", save: "Save", back: "Back",
    about: "Privacy & about", independent: "Unofficial student project", privacy: "Independent student project. Not affiliated with Turība administration. No accounts or telemetry. Timetable requests go directly to Turība over HTTPS. Settings stay in local Scriptable storage. Local files are not claimed to be encrypted.",
    failure: "The operation could not be completed. See the diagnostic details below.", selection: "Review study choices", unknownCoverage: "Current week not verified", updated: "Updated", permissionFailure: "Reminders could not be scheduled. Check Scriptable notification permission in iPhone Settings. The widget still works.",
    sourceUnavailable: "This week is not published or could not be verified. This does not confirm a day off.", resetCorrupt: "Local settings could not be read. Use Delete My Data to reset; existing files have been preserved.", unsupported: "Choose a Small or Medium widget.", nextDay: "Next known class", noGroup: "Not configured"
  },
  lv: {
    upcoming: "Nākamā nodarbība", soon: "Drīz sāksies", ongoing: "Notiek", next: "Tālāk", upNext: "Tālāk", finished: "Šodien pabeigts", noSchedule: "Šodien nav izvēlētu nodarbību",
    offline: "Bezsaistē · saglabātie dati", error: "Saraksts nav pieejams", setupRequired: "Izvēlies savu grupu", stale: "Pārbaudi jaunāko sarakstu", room: "Auditorija", noRoom: "Auditorija nav norādīta",
    settings: "Iestatījumi", group: "Studiju grupa", groupPrompt: "Ievadi grupas kodu no publiskā nodarbību saraksta.", language: "Valoda", theme: "Izskats", system: "Sistēmas", light: "Gaišs", dark: "Tumšs",
    choices: "Izvēles kursi un apakšgrupas", choicesHint: "Izvēlies tikai savus kursus un apakšgrupas. BATIS var būt papildu individuāla informācija.", noChoices: "Ielādētajās nedēļās izvēļu nav.",
    sync: "Atjaunināt tagad", synced: "Saraksts atjaunināts", notifications: "Nodarbību atgādinājumi", on: "Ieslēgts", off: "Izslēgts", minutes: "minūtes", reminderHint: "Izvēles atgādinājumi pamatgrupai. iOS var pieprasīt atļauju. Regulāri atjaunini sarakstu, lai atgādinājumi būtu aktuāli.",
    previewSmall: "Mazā logrīka priekšskatījums", previewMedium: "Vidējā logrīka priekšskatījums", deleteData: "Dzēst manus datus", deleteConfirm: "Dzēst vietējos iestatījumus, saraksta kešatmiņu un gaidošos TURĪBA NEXT atgādinājumus?", cancel: "Atcelt", done: "Gatavs", save: "Saglabāt", back: "Atpakaļ",
    about: "Privātums un informācija", independent: "Neoficiāls studentu projekts", privacy: "Neoficiāls studentu projekts. Nav saistīts ar Turība administrāciju. Nav kontu vai telemetrijas. Saraksts tiek saņemts no Turība ar HTTPS. Iestatījumi glabājas lokāli Scriptable. Vietējie faili netiek uzskatīti par šifrētiem.",
    failure: "Darbību neizdevās pabeigt. Skati diagnostikas informāciju zemāk.", selection: "Pārskati studiju izvēles", unknownCoverage: "Pašreizējā nedēļa nav pārbaudīta", updated: "Atjaunināts", permissionFailure: "Neizdevās ieplānot atgādinājumus. Pārbaudi Scriptable paziņojumu atļauju iPhone iestatījumos. Logrīks turpina darboties.",
    sourceUnavailable: "Nedēļas saraksts nav publicēts vai nav pārbaudāms. Tas nenozīmē, ka nodarbību nav.", resetCorrupt: "Vietējie iestatījumi nav nolasāmi. Atiestatīšanai izmanto datu dzēšanu; esošie faili ir saglabāti.", unsupported: "Izvēlies mazo vai vidējo logrīku.", nextDay: "Nākamā zināmā nodarbība", noGroup: "Nav iestatīts"
  },
  ru: {
    upcoming: "Следующее занятие", soon: "Скоро начнётся", ongoing: "Идёт занятие", next: "Далее", upNext: "Далее", finished: "На сегодня всё", noSchedule: "Сегодня нет выбранных занятий",
    offline: "Нет сети · сохранённые данные", error: "Расписание недоступно", setupRequired: "Выберите свою группу", stale: "Проверьте актуальное расписание", room: "Аудитория", noRoom: "Аудитория не указана",
    settings: "Настройки", group: "Учебная группа", groupPrompt: "Введите код группы из публичного расписания.", language: "Язык", theme: "Оформление", system: "Системное", light: "Светлое", dark: "Тёмное",
    choices: "Факультативы и подгруппы", choicesHint: "Выберите только свои курсы и подгруппы. Дополнительные индивидуальные сведения могут быть в BATIS.", noChoices: "В загруженных неделях вариантов нет.",
    sync: "Обновить сейчас", synced: "Расписание обновлено", notifications: "Напоминания о занятиях", on: "Вкл.", off: "Выкл.", minutes: "минут", reminderHint: "Необязательные напоминания для основной группы. iOS может запросить разрешение. Регулярно обновляйте расписание для актуальности напоминаний.",
    previewSmall: "Предпросмотр Small", previewMedium: "Предпросмотр Medium", deleteData: "Удалить мои данные", deleteConfirm: "Удалить локальные настройки, кеш расписания и ожидающие напоминания TURĪBA NEXT?", cancel: "Отмена", done: "Готово", save: "Сохранить", back: "Назад",
    about: "Приватность и информация", independent: "Независимый студенческий проект", privacy: "Независимый студенческий проект. Не связан с администрацией Turība. Нет аккаунтов и телеметрии. Расписание загружается напрямую с Turība через HTTPS. Настройки хранятся локально в Scriptable. Локальные файлы не называются зашифрованными.",
    failure: "Не удалось выполнить действие. Ниже указаны диагностические сведения.", selection: "Проверьте выбор курсов", unknownCoverage: "Текущая неделя не проверена", updated: "Обновлено", permissionFailure: "Не удалось запланировать напоминания. Проверьте разрешение уведомлений Scriptable в настройках iPhone. Виджет продолжает работать.",
    sourceUnavailable: "Расписание недели не опубликовано или не подтверждено. Это не означает отсутствие занятий.", resetCorrupt: "Локальные настройки не читаются. Для сброса удалите данные через меню; существующие файлы сохранены.", unsupported: "Выберите виджет Small или Medium.", nextDay: "Следующее известное занятие", noGroup: "Не настроено"
  }
};

function resolveLanguage(setting, deviceLanguages) {
  if (setting !== "system" && STRINGS[setting]) return setting;
  for (const locale of deviceLanguages || []) {
    const code = String(locale).toLowerCase().split(/[-_]/)[0];
    if (STRINGS[code]) return code;
  }
  return "en";
}

function translator(language) { return key => STRINGS[language] && STRINGS[language][key] || STRINGS.en[key] || STRINGS.en.error; }

module.exports = { STRINGS, resolveLanguage, translator };

},
"notifications": function(module, exports) {
"use strict";

const { ensure } = __load("errors");
const { selectLessons } = __load("settings");
const { timedLesson } = __load("engine");
const { translator } = __load("localization");
const { DAY, weekStart } = __load("time");
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
    result.push({ identifier, trigger, title: "TURĪBA NEXT", body, userInfo: { owner: OWNER, fingerprint: mark, weekStart: weekStart(lesson.date) } });
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
  const scoped = Array.isArray(state.reminderWeeks);
  if (scoped ? !state.reminderWeeks.length : state.stale || state.offline || state.issue || state.coverageIncomplete) return { scheduled: 0, skipped: true };
  const weeks = scoped ? state.reminderWeeks : state.weeks || [];
  const plan = reminderPlan(settings, weeks, now, language);
  const pending = (await adapter.pending()).filter(owns);
  const desired = new Set(plan.map(item => item.identifier));
  const verified = new Set(weeks.map(week => week.weekStart));
  const remove = pending.filter(item => !desired.has(item.identifier) && (!scoped || verified.has(item.userInfo.weekStart))).map(item => item.identifier);
  if (remove.length) await adapter.remove(remove);
  let scheduled = 0;
  for (const item of plan) {
    const existing = pending.find(candidate => candidate.identifier === item.identifier);
    if (!existing || existing.userInfo.fingerprint !== item.userInfo.fingerprint || existing.userInfo.weekStart !== item.userInfo.weekStart) {
      await adapter.schedule(item); scheduled++;
    }
  }
  return { scheduled, skipped: false };
}

module.exports = { OWNER, PREFIX, owns, reminderPlan, clearReminders, reconcileReminders };

},
"parser": function(module, exports) {
"use strict";

const { ensure, ScheduleError } = __load("errors");
const { parseHtml, descendants, text, hasClass } = __load("html");

const ORIGIN = "https://nodarbibas.turiba.lv/";
const BRANCHES = { "Rīga": "riga", "Cēsis": "cesis", "Liepāja": "liepaja", "Talsi": "talsi" };
const CATALOG_PATHS = ["", "?lim=1", "?lim=3", "?lim=4", "?lim=5"];

function normalizeGroup(value) {
  ensure(typeof value === "string", "INVALID_GROUP", "A study group code is required.");
  const code = value.trim().toUpperCase();
  ensure(/^[A-Z0-9][A-Z0-9_/-]{1,31}$/.test(code), "INVALID_GROUP", "The study group code has an invalid format.");
  return code;
}

function isoDate(value) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  ensure(match, "HTML_PARSE_ERROR", "The source date has an unsupported format.", { value });
  const iso = match[3] + "-" + match[2] + "-" + match[1];
  const parsed = new Date(iso + "T00:00:00Z");
  ensure(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso,
    "HTML_PARSE_ERROR", "The source date is invalid.", { value });
  return iso;
}

function only(node, predicate, description) {
  const found = descendants(node, predicate);
  ensure(found.length === 1, "SOURCE_STRUCTURE_CHANGED", "Expected exactly one " + description + ".");
  return found[0];
}

function cells(row) {
  return row.children.filter(child => typeof child !== "string" && (child.tag === "td" || child.tag === "th"));
}

function parseCatalog(html) {
  const root = parseHtml(html);
  const tables = descendants(root, node => node.tag === "table");
  const groups = [];
  for (const table of tables) {
    let columnBranches = [];
    for (const row of descendants(table, node => node.tag === "tr")) {
      const columns = cells(row);
      if (columns.length && columns.every(cell => BRANCHES[text(cell)])) {
        columnBranches = columns.map(cell => BRANCHES[text(cell)]);
      }
      columns.forEach((cell, index) => {
        let branch = columnBranches[index] || null;
        for (const item of descendants(cell, node => node.tag === "p" || node.tag === "a")) {
          if (item.tag === "p" && BRANCHES[text(item)]) branch = BRANCHES[text(item)];
          if (item.tag !== "a") continue;
          const link = (item.attrs.href || "").match(/^pub_nod\.asp\?Grupa=([^&#]+)$/i);
          if (!link) continue;
          let code;
          try { code = normalizeGroup(decodeURIComponent(link[1])); }
          catch (error) { throw new ScheduleError("SOURCE_STRUCTURE_CHANGED", "The catalog group link is invalid."); }
          ensure(text(item).toUpperCase() === code, "SOURCE_STRUCTURE_CHANGED", "Catalog link and group label differ.");
          ensure(branch, "SOURCE_STRUCTURE_CHANGED", "The catalog does not identify the group branch.", { code });
          groups.push({ code, branch, source: ORIGIN + item.attrs.href });
        }
      });
    }
  }
  ensure(groups.length > 0, "SOURCE_STRUCTURE_CHANGED", "No supported group catalog was found.");
  return mergeCatalogs([groups]);
}

function mergeCatalogs(catalogs) {
  const result = [];
  for (const catalog of catalogs) for (const group of catalog) {
    const existing = result.find(item => item.code === group.code);
    ensure(!existing || existing.branch === group.branch, "SOURCE_STRUCTURE_CHANGED", "Conflicting catalog branches.", { group: group.code });
    if (!existing) result.push(group);
  }
  return result;
}

function parseTimeGrids(root) {
  const grids = {};
  for (const section of descendants(root, node => /^laiks_[1-4]$/.test(node.attrs.id || ""))) {
    const branchNumber = section.attrs.id.slice(-1);
    const label = only(root, node => node.attrs.id === "fil_" + branchNumber, "branch label");
    const branch = BRANCHES[text(label)];
    ensure(branch, "SOURCE_STRUCTURE_CHANGED", "Unknown timetable branch label.");
    let day = null;
    const grid = {};
    for (const element of descendants(section, node => hasClass(node, "dienas") || node.tag === "ul")) {
      if (hasClass(element, "dienas")) {
        const name = text(element);
        day = name === "Sestdiena" ? "saturday" : name === "Pirmdiena, Otrdiena, Trešdiena, Ceturtdiena, Piektdiena" ? "weekday" : null;
        ensure(day, "SOURCE_STRUCTURE_CHANGED", "Unsupported timetable day label.", { name });
      } else {
        ensure(day && !grid[day], "SOURCE_STRUCTURE_CHANGED", "Unsupported timetable grid structure.");
        const periods = {};
        for (const item of descendants(element, node => node.tag === "li")) {
          const match = text(item).match(/^(\d+)\.\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
          ensure(match, "SOURCE_STRUCTURE_CHANGED", "Unsupported timetable period.");
          ensure(validTime(match[2]) && validTime(match[3]) && match[2] < match[3] && !periods[match[1]],
            "SOURCE_STRUCTURE_CHANGED", "Invalid or duplicate timetable period.");
          periods[match[1]] = { startTime: match[2], endTime: match[3] };
        }
        ensure(Object.keys(periods).length > 0, "SOURCE_STRUCTURE_CHANGED", "Timetable grid is empty.");
        grid[day] = periods;
      }
    }
    grids[branch] = grid;
  }
  return grids;
}

function validTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseNavigation(root, group) {
  const nav = only(root, node => hasClass(node, "time_table_content_block_nav"), "week navigation");
  const result = {};
  for (const anchor of descendants(nav, node => node.tag === "a")) {
    const key = hasClass(anchor, "time_table_content_block_nav_left") ? "previous" :
      hasClass(anchor, "time_table_content_block_nav_right") ? "next" :
        hasClass(anchor, "time_table_content_block_nav_down") ? "current" : null;
    const href = anchor.attrs.href || "";
    ensure(key && (/^\?ned=-?\d+$/.test(href) || href === "pub_nod.asp"),
      "SOURCE_STRUCTURE_CHANGED", "Unexpected week navigation link.");
    // Keep the group explicit: the observed links otherwise rely on a server session.
    result[key] = ORIGIN + "pub_nod.asp?Grupa=" + encodeURIComponent(group) + (href[0] === "?" ? "&" + href.slice(1) : "");
  }
  ensure(result.previous && result.current && result.next, "SOURCE_STRUCTURE_CHANGED", "Week navigation is incomplete.");
  return result;
}

function lessonType(subject) {
  if (/\beksāmens\b|\bexam(?:ination)?\b/i.test(subject)) return "exam";
  if (/konsultācij|consultation/i.test(subject)) return "consultation";
  if (/self-dependent studies|patstāvīg/i.test(subject)) return "selfStudy";
  return "lesson";
}

function parseSchedule(html, options) {
  const group = normalizeGroup(options.group);
  const root = parseHtml(html);
  const heading = only(root, node => node.tag === "h2" && /^Grupa\s/.test(text(node)), "group/week heading");
  const match = text(heading).match(/^Grupa\s+(\S+)\s+no\s+(\d{2}\.\d{2}\.\d{4})\s+līdz\s+(\d{2}\.\d{2}\.\d{4})$/);
  ensure(match, "SOURCE_STRUCTURE_CHANGED", "Unsupported group/week heading.");
  ensure(match[1].toUpperCase() === group, "GROUP_MISMATCH", "The source returned a different study group.");
  const weekStart = isoDate(match[2]);
  const weekEnd = isoDate(match[3]);
  ensure(new Date(weekStart + "T00:00:00Z").getUTCDay() === 1 &&
    Date.parse(weekEnd + "T00:00:00Z") - Date.parse(weekStart + "T00:00:00Z") === 6 * 86400000,
  "SOURCE_STRUCTURE_CHANGED", "The source week does not span Monday through Sunday.");
  if (options.expectedWeekStart) ensure(options.expectedWeekStart === weekStart,
    "WEEK_MISMATCH", "The source returned an unexpected week.", { expected: options.expectedWeekStart, actual: weekStart });
  const navigation = parseNavigation(root, group);
  const catalogEntry = options.catalog && options.catalog.find(item => item.code === group);
  if (options.catalogComplete) ensure(catalogEntry, "UNKNOWN_GROUP", "The group is absent from the current public catalog.");
  const container = only(root, node => hasClass(node, "classes_table"), "schedule table container");
  const table = only(container, node => node.tag === "table", "schedule table");
  const unavailable = descendants(table, node => hasClass(node, "nav_public"));
  const base = { schemaVersion: 1, group, branch: catalogEntry ? catalogEntry.branch : null,
    weekStart, weekEnd, timeZone: "Europe/Riga", navigation, lessons: [], warnings: [] };
  if (unavailable.length) {
    ensure(unavailable.length === 1 && text(unavailable[0]) === "Atvainojiet, nodarbību saraksts šajā nedēļā nav publicēts",
      "SOURCE_STRUCTURE_CHANGED", "Unrecognized schedule availability message.");
    base.status = catalogEntry ? "unpublished" : "unverifiedGroup";
    base.warnings.push("PUBLICATION_REASON_UNVERIFIED");
    return base;
  }
  ensure(catalogEntry, "GROUP_UNVERIFIED", "A catalog entry is required to select the correct branch timetable.");
  const header = only(table, node => node.tag === "tr" && hasClass(node, "head2"), "schedule header");
  ensure(cells(header).map(text).join("|") === "Datums|Nodarbības|Grupa|Auditorija",
    "SOURCE_STRUCTURE_CHANGED", "The schedule columns changed.");
  const body = only(table, node => node.tag === "tbody" && hasClass(node, "content2"), "lesson table body");
  ensure(body.children.every(node => typeof node === "string" ? !node.trim() : node.tag === "tr"),
    "SOURCE_STRUCTURE_CHANGED", "Unexpected content inside the lesson body.");
  ensure(descendants(table, node => node.tag === "tr").length === descendants(body, node => node.tag === "tr").length + 1,
    "SOURCE_STRUCTURE_CHANGED", "Unexpected rows outside the lesson body.");
  const grids = parseTimeGrids(root);
  let date = null;
  let period = null;
  let category = null;
  for (const row of body.children.filter(node => typeof node !== "string" && node.tag === "tr")) {
    const columns = cells(row);
    ensure(columns.length === 4 || columns.length === 5, "SOURCE_STRUCTURE_CHANGED", "Unsupported lesson row shape.");
    ensure(columns.every(cell => !cell.attrs.rowspan), "SOURCE_STRUCTURE_CHANGED", "Unsupported lesson row span.");
    const dateText = text(columns[0]);
    if (dateText) {
      const dayMatch = dateText.match(/(\d{2}\.\d{2}\.\d{4})$/);
      ensure(dayMatch, "HTML_PARSE_ERROR", "A lesson row has an invalid date.");
      date = isoDate(dayMatch[1]); period = null; category = null;
    }
    ensure(date && date >= weekStart && date <= weekEnd, "HTML_PARSE_ERROR", "Lesson date is missing or outside the source week.");
    const numbered = text(columns[1]);
    const numberMatch = numbered.match(/^(\d+)\.\s*(.*)$/);
    if (numbered) {
      ensure(numberMatch, "HTML_PARSE_ERROR", "A lesson row has an unsupported period/subject format.");
      period = Number(numberMatch[1]); category = numberMatch[2];
    }
    if (columns.length === 4) {
      ensure(columns[1].attrs.colspan === "2", "SOURCE_STRUCTURE_CHANGED", "Merged lesson cell has an unsupported span.");
      // Observed blank rows repeat group/room but contain no lesson. Do not invent one.
      if (!numbered) {
        ensure(hasClass(columns[1], "color_2"), "HTML_PARSE_ERROR", "A lesson subject is unexpectedly empty.");
        base.warnings.push("BLANK_SERVICE_ROW"); continue;
      }
    } else {
      ensure(columns.every(cell => !cell.attrs.rowspan && (!cell.attrs.colspan || cell.attrs.colspan === "1")),
        "SOURCE_STRUCTURE_CHANGED", "Unsupported split lesson cell span.");
    }
    ensure(period && category !== null, "HTML_PARSE_ERROR", "A subgroup continuation has no preceding period.");
    const subject = columns.length === 5 ? text(columns[2]) : category;
    ensure(subject, "HTML_PARSE_ERROR", "A lesson subject is missing.");
    const sourceGroup = text(columns[columns.length - 2]);
    ensure(sourceGroup, "HTML_PARSE_ERROR", "A lesson group is missing.");
    const room = text(columns[columns.length - 1]) || null;
    const weekday = new Date(date + "T00:00:00Z").getUTCDay();
    const dayKind = weekday === 6 ? "saturday" : (weekday >= 1 && weekday <= 5 ? "weekday" : "sunday");
    const grid = grids[base.branch] && grids[base.branch][dayKind];
    const time = grid && grid[period];
    ensure(time, "TIME_GRID_MISSING", "The source does not provide a timetable for this branch/day/period.",
      { branch: base.branch, date, period });
    const elective = /Izvēles studiju kursi|Study Courses by choice/i.test(category);
    const subgroup = sourceGroup === group ? null : sourceGroup;
    const annotations = category + " " + subject;
    const provisional = /(^|[^*])\*{2}(?!\*)/.test(annotations);
    const individualSchedule = /(^|[^*])\*(?!\*)/.test(annotations);
    const deliveryModeUnspecified = /(^|[^*])\*{3}(?!\*)/.test(annotations);
    base.lessons.push({ date, startTime: time.startTime, endTime: time.endTime, timeZone: "Europe/Riga",
      subject, room, period, group, sourceGroup, subgroup, category, type: lessonType(subject), elective,
      requiresSelection: elective || subgroup !== null || individualSchedule, provisional, individualSchedule, deliveryModeUnspecified,
      changed: descendants(row, node => node.tag === "font" && /^(red|#ff0000)$/i.test(node.attrs.color || "")).length > 0,
      source: options.sourceUrl || navigation.current });
    if (!room) base.warnings.push("MISSING_ROOM");
  }
  base.status = base.lessons.length ? "published" : "emptyUnconfirmed";
  if (!base.lessons.length) base.warnings.push("EMPTY_PUBLICATION_UNCONFIRMED");
  base.warnings = Array.from(new Set(base.warnings));
  return base;
}

module.exports = { ORIGIN, CATALOG_PATHS, normalizeGroup, isoDate, parseCatalog, mergeCatalogs, parseSchedule };

},
"schedule-service": function(module, exports) {
"use strict";

const { normalizeGroup } = __load("parser");
const { timestamp, rigaParts, weekStart, serverWeekStart, addDays, DAY } = __load("time");
const { scheduleState } = __load("engine");

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
    let verifiedWeekStarts = fresh && Array.isArray(marker.verifiedWeekStarts) ? marker.verifiedWeekStarts : [];
    if (options.force || !fresh) {
      issue = null;
      verifiedWeekStarts = [];
      try {
        const catalog = await this.catalog(now, !!options.force);
        // On Sunday the server's current page is already next week; keep any cached current week.
        const offsets = serverWeek === calendarWeek ? [0, 1] : [0];
        for (const offset of offsets) {
          try {
            const week = await this.client.loadSchedule(code, { catalog, catalogComplete: true,
              weekOffset: offset, expectedWeekStart: addDays(serverWeek, offset * 7) });
            if (week.status === "published") { this.storage.saveWeek(week, now); verifiedWeekStarts.push(week.weekStart); }
            else issue = issue || "SOURCE_" + week.status.toUpperCase();
          } catch (error) { issue = issue || error.code || "NETWORK_ERROR"; }
        }
      } catch (error) { issue = error.code || "NETWORK_ERROR"; }
      try { this.storage.writeJson(markerKey, { version: 1, checkedAt: now, calendarWeek, serverWeek, issue, verifiedWeekStarts }); }
      catch (error) { issue = issue || error.code; }
    }
    const saved = this.storage.weeks(code);
    const relevant = saved.weeks.filter(entry => entry.week.weekEnd >= today && entry.week.weekStart <= addDays(calendarWeek, 14));
    if (!issue && saved.issues.length) issue = "CORRUPT_CACHE";
    const current = relevant.find(entry => entry.week.weekStart === calendarWeek);
    const stale = !!issue || relevant.some(entry => now < entry.syncedAt || now - entry.syncedAt >= REFRESH_MS);
    return { group: code, weeks: relevant.map(entry => entry.week), stale, issue,
      reminderWeeks: relevant.filter(entry => verifiedWeekStarts.includes(entry.week.weekStart) && now >= entry.syncedAt && now - entry.syncedAt < REFRESH_MS).map(entry => entry.week),
      offline: ["NETWORK_ERROR", "NETWORK_TIMEOUT"].includes(issue),
      lastSync: current ? current.syncedAt : (relevant.length ? Math.max(...relevant.map(entry => entry.syncedAt)) : null),
      cacheIssues: saved.issues };
  }

  async state(settings, group, now, force) {
    if (!group) return scheduleState({ now });
    const result = await this.synchronize(group, { now, force });
    return Object.assign(scheduleState(Object.assign({}, result, { now, selections: settings.selections[group] || [] })),
      { lastSync: result.lastSync, weeks: result.weeks, reminderWeeks: result.reminderWeeks, group });
  }
}

module.exports = { ScheduleService, REFRESH_MS };

},
"scriptable-adapters": function(module, exports) {
"use strict";

const { ensure } = __load("errors");

function localAdapter(api) {
  const fm = api.FileManager.local();
  const root = fm.joinPath(fm.documentsDirectory(), "TURIBA-NEXT");
  if (!fm.fileExists(root)) fm.createDirectory(root, true);
  function path(name) {
    ensure(typeof name === "string" && name.length < 240 && /^[A-Za-z0-9%_.-]+$/.test(name) && !name.startsWith("."),
      "UNSAFE_STORAGE_PATH", "Invalid project data filename.");
    return fm.joinPath(root, name);
  }
  function recover(target) {
    const backup = target + ".bak";
    if (!fm.fileExists(target) && fm.fileExists(backup)) fm.move(backup, target);
  }
  function clean(file) {
    // Cleanup failure must not turn a committed save into a reported write failure.
    try { if (fm.fileExists(file)) fm.remove(file); } catch (error) { /* Retry during a later write or explicit deletion. */ }
  }
  return {
    read: name => {
      const target = path(name); recover(target);
      return fm.fileExists(target) ? fm.readString(target) : null;
    },
    writeAtomic: (name, content) => {
      const target = path(name), temporary = target + ".tmp-" + api.UUID.string(), backup = target + ".bak";
      recover(target);
      let backedUp = false, installed = false;
      try {
        fm.writeString(temporary, content);
        ensure(fm.readString(temporary) === content, "STORAGE_VERIFY_ERROR", "The temporary write could not be verified.");
        if (fm.fileExists(target)) {
          // Native iPhone behavior rejects move() when the destination already exists.
          if (fm.fileExists(backup)) fm.remove(backup);
          fm.move(target, backup); backedUp = true;
        }
        fm.move(temporary, target); installed = true;
        ensure(fm.readString(target) === content, "STORAGE_VERIFY_ERROR", "The installed write could not be verified.");
      } catch (error) {
        if (backedUp) {
          try {
            if (installed && fm.fileExists(target)) fm.remove(target);
            recover(target);
          } catch (recoveryError) { /* Keep the backup for the next read/recovery attempt. */ }
        } else if (installed) clean(target);
        throw error;
      } finally { clean(temporary); }
      clean(backup);
    },
    list: () => {
      // Recover interrupted replacements before Storage enumerates week records.
      for (const name of fm.listContents(root).filter(name => name.endsWith(".json.bak"))) recover(path(name.slice(0, -4)));
      return fm.listContents(root);
    },
    remove: name => { const target = path(name); if (fm.fileExists(target)) fm.remove(target); }
  };
}

function transport(api) {
  return async (url, options) => {
    const request = new api.Request(url);
    request.timeoutInterval = api.config.runsInWidget ? Math.min(6, options.timeoutSeconds) : options.timeoutSeconds;
    request.allowInsecureRequest = false;
    request.onRedirect = () => null;
    let body;
    try { body = await request.loadString(); }
    catch (error) {
      if (error && (error.code === -1001 || /timed?\s*out|timeout/i.test(error.message || ""))) {
        const timeout = new Error("The timetable request timed out."); timeout.code = "ETIMEDOUT"; throw timeout;
      }
      throw error;
    }
    const response = request.response || {}, headers = response.headers || {};
    const key = Object.keys(headers).find(name => name.toLowerCase() === "content-type");
    return { statusCode: response.statusCode, url: response.url, contentType: key ? headers[key] : response.mimeType, body };
  };
}

function notificationAdapter(api) {
  return {
    pending: () => api.Notification.allPending(), remove: ids => api.Notification.removePending(ids),
    schedule: async item => {
      const notification = new api.Notification();
      notification.identifier = item.identifier; notification.title = item.title; notification.body = item.body;
      notification.userInfo = item.userInfo; notification.threadIdentifier = "turiba-next";
      notification.sound = "default"; notification.openURL = api.runUrl;
      notification.setTriggerDate(new Date(item.trigger));
      await notification.schedule();
    }
  };
}

module.exports = { localAdapter, transport, notificationAdapter };

},
"settings": function(module, exports) {
"use strict";

const { ensure } = __load("errors");
const { normalizeGroup } = __load("parser");

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

},
"source-client": function(module, exports) {
"use strict";

const { ensure, ScheduleError } = __load("errors");
const { ORIGIN, CATALOG_PATHS, normalizeGroup, parseCatalog, mergeCatalogs, parseSchedule } = __load("parser");

function scheduleUrl(group, weekOffset) {
  const code = normalizeGroup(group);
  ensure(weekOffset === undefined || (Number.isInteger(weekOffset) && weekOffset >= -8 && weekOffset <= 16),
    "INVALID_WEEK", "The requested week offset is outside the supported range.");
  return ORIGIN + "pub_nod.asp?Grupa=" + encodeURIComponent(code) +
    (weekOffset === undefined ? "" : "&ned=" + weekOffset);
}

// The injected transport must enforce timeoutSeconds and must not follow external redirects.
// The Scriptable Request adapter is added with the application runtime in a later phase.
class SourceClient {
  constructor(transport) {
    ensure(typeof transport === "function", "INVALID_TRANSPORT", "An HTTPS transport is required.");
    this.transport = transport;
  }

  async loadHtml(url) {
    ensure(url.startsWith(ORIGIN), "UNSAFE_SOURCE", "Requests must use the approved HTTPS origin.");
    let response;
    try {
      response = await this.transport(url, { timeoutSeconds: 20, followRedirects: false });
    } catch (error) {
      throw new ScheduleError(error && error.code === "ETIMEDOUT" ? "NETWORK_TIMEOUT" : "NETWORK_ERROR",
        "The public timetable could not be loaded.");
    }
    ensure(response && response.statusCode === 200, "HTTP_ERROR", "The timetable server returned an unsuccessful response.",
      { statusCode: response && response.statusCode });
    ensure(!response.url || response.url.startsWith(ORIGIN), "UNSAFE_SOURCE", "The response came from an unapproved origin.");
    ensure(response.contentType && /^text\/html(?:\s*;|$)/i.test(response.contentType),
      "INVALID_RESPONSE", "The timetable response is not HTML.");
    ensure(typeof response.body === "string" && response.body.length > 0 && response.body.length <= 2000000,
      "INVALID_RESPONSE", "The timetable response body is invalid.");
    return response.body;
  }

  async loadCatalog() {
    const catalogs = [];
    // Keep requests sequential and bounded. Caching belongs to the storage/service layer.
    for (const path of CATALOG_PATHS) catalogs.push(parseCatalog(await this.loadHtml(ORIGIN + path)));
    return mergeCatalogs(catalogs);
  }

  async loadSchedule(group, options) {
    options = options || {};
    const code = normalizeGroup(group);
    ensure(options.catalog && options.catalogComplete === true, "CATALOG_REQUIRED", "A complete verified catalog is required.");
    ensure(options.catalog.some(entry => entry.code === code), "UNKNOWN_GROUP", "The group is absent from the current public catalog.");
    const url = scheduleUrl(code, options.weekOffset);
    return parseSchedule(await this.loadHtml(url), { group: code, catalog: options.catalog, catalogComplete: true,
      sourceUrl: url, expectedWeekStart: options.expectedWeekStart });
  }
}

module.exports = { SourceClient, scheduleUrl };

},
"storage": function(module, exports) {
"use strict";

const { ensure, ScheduleError } = __load("errors");
const { defaults, validateSettings } = __load("settings");
const { normalizeGroup, ORIGIN } = __load("parser");
const { calendarDate, addDays, timestamp } = __load("time");
const { timedLesson } = __load("engine");

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

// The adapter owns verified replacement and recovery inside the project's local data directory.
// The retained writeAtomic method name does not imply an atomic multi-file transaction.
class Storage {
  constructor(adapter) { this.adapter = adapter; }

  readJson(key) {
    let content;
    try { content = this.adapter.read(key); }
    catch (error) { throw new ScheduleError("STORAGE_READ_ERROR", "Local data could not be read.", { cause: error.message }); }
    if (content === null) return null;
    try { return JSON.parse(content); }
    catch (error) { throw new ScheduleError("CORRUPT_DATA", "Local JSON is corrupted."); }
  }

  writeJson(key, data) {
    try { this.adapter.writeAtomic(key, JSON.stringify(data)); }
    catch (error) { throw new ScheduleError("STORAGE_WRITE_ERROR", "Local data could not be saved.", { cause: error.message }); }
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

},
"theme": function(module, exports) {
"use strict";

const PALETTES = {
  light: { background: "F1F8FC", card: "DDEFF7", text: "073044", muted: "4F6C7B", accent: "006486", roomText: "00587E", line: "B8DEEE" },
  dark: { background: "062D3E", card: "0E4D67", text: "F7FCFF", muted: "ADC9D6", accent: "42CFF5", roomText: "FFFFFF", line: "00AAE7" }
};

function themeColors(mode, Color) {
  const result = {};
  for (const key of Object.keys(PALETTES.light)) {
    result[key] = mode === "light" || mode === "dark" ? new Color(PALETTES[mode][key]) :
      Color.dynamic(new Color(PALETTES.light[key]), new Color(PALETTES.dark[key]));
  }
  return result;
}

module.exports = { PALETTES, themeColors };

},
"time": function(module, exports) {
"use strict";

const { ensure } = __load("errors");
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

},
"widget": function(module, exports) {
"use strict";

const { translator } = __load("localization");
const { themeColors } = __load("theme");

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
  function centered(container, value, size, color, weight, lines, width, scale) {
    // A native flexible spacer on each side can take width away from the room text.
    // Give text the card's entire content width and center the text itself instead.
    const row = container.addStack(); row.layoutVertically();
    row.size = new api.Size(width, 0); row.setPadding(0, 0, 0, 0);
    label(row, value, size, color, weight, lines, scale).centerAlignText();
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
      centered(room, t("room"), 9, colors.muted, null, 1, roomWidth - 14); room.addSpacer(3);
      const roomSize = !model.roomProvided ? 12 : model.room.length <= 5 ? Math.min(38, Math.floor((roomWidth - 14) / (model.room.length * 0.63)), Math.floor((bodyHeight - 25) / 1.1)) : model.room.length <= 9 ? (narrow ? 15 : notice ? 18 : 22) : 15;
      centered(room, model.room, roomSize, colors.roomText, "bold", model.roomProvided && model.room.length <= 5 ? 1 : 2,
        roomWidth - 14, model.roomProvided && model.room.length <= 5 ? 0.65 : 0.85);
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

}
};
const __cache = {};
function __load(name) { if (__cache[name]) return __cache[name].exports; const module = {exports:{}}; __cache[name] = module; __factories[name](module, module.exports); return module.exports; }
const __api = {FileManager, UUID, Request, config, args, Script, Device, Alert, Notification, ListWidget, Font, Color, Size, Timer: typeof Timer === "undefined" ? null : Timer, version: "1.1.0-rc.2", stage: "bootstrap"};
try { await __load("app").run(__api); }
catch (error) { const lang = __load("localization").resolveLanguage(__api.language || "system", Device.preferredLanguages()); const t = __load("localization").translator(lang); const details = __load("diagnostics").errorReport(error, __api.stage, __api.version); if (config.runsInWidget) { const widget = new ListWidget(); widget.addText("TURĪBA NEXT"); widget.addText(t("error")); widget.addText(String(error.code || error.name || "UNEXPECTED_ERROR")); widget.refreshAfterDate = new Date(Date.now() + 900000); Script.setWidget(widget); } else { const alert = new Alert(); alert.title = "TURĪBA NEXT"; alert.message = t("failure") + "\n\n" + details; alert.addAction(t("done")); await alert.presentAlert(); } Script.complete(); }
