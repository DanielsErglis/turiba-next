"use strict";

const { Storage } = require("./storage");
const { SourceClient } = require("./source-client");
const { ScheduleService } = require("./schedule-service");
const { defaults, widgetGroup, availableChoices, validateSettings } = require("./settings");
const { normalizeGroup } = require("./parser");
const { resolveLanguage, translator } = require("./localization");
const { renderWidget } = require("./widget");
const { scheduleState } = require("./engine");
const { localAdapter, transport, notificationAdapter } = require("./scriptable-adapters");
const { clearReminders, reconcileReminders } = require("./notifications");

async function run(api) {
  api.runUrl = "scriptable:///run?scriptName=" + encodeURIComponent(api.Script.name());
  const storage = new Storage(localAdapter(api));
  const service = new ScheduleService(new SourceClient(transport(api)), storage);
  const reminders = notificationAdapter(api);
  let settings = defaults(), settingsIssue = null, state = null;
  try { settings = storage.settings(); } catch (error) { settingsIssue = error.code; }
  const language = () => resolveLanguage(settings.language, api.Device.preferredLanguages());
  const t = key => translator(language())(key);
  async function alert(title, message, actions, destructive) {
    const dialog = new api.Alert(); dialog.title = title; dialog.message = message || "";
    for (const action of actions || []) dialog.addAction(action);
    if (destructive) dialog.addDestructiveAction(destructive);
    dialog.addCancelAction(t("cancel")); return dialog.presentAlert();
  }
  async function tell(message) { await alert("TURĪBA NEXT", message, [t("done")]); }
  function save() { settings = validateSettings(settings); storage.saveSettings(settings); }
  async function load(group, force) {
    try { return await service.state(settings, group, Date.now(), force); }
    catch (error) {
      const fallback = scheduleState({ now: Date.now(), group, issue: error.code || "SCHEDULE_UNAVAILABLE" });
      return Object.assign(fallback, { group, weeks: [] });
    }
  }
  async function syncReminders() {
    if (!settings.notifications.enabled || !state) return;
    try { await reconcileReminders(settings, state, Date.now(), language(), reminders); }
    catch (error) { await tell(t("permissionFailure")); }
  }
  async function changeGroup() {
    const dialog = new api.Alert(); dialog.title = t("group"); dialog.message = t("groupPrompt");
    dialog.addTextField(t("group"), settings.group || ""); dialog.addAction(t("save")); dialog.addCancelAction(t("cancel"));
    if (await dialog.presentAlert() < 0) return;
    const group = normalizeGroup(dialog.textFieldValue(0));
    const candidate = await load(group, true);
    if (!candidate.weeks.length && !["SOURCE_UNPUBLISHED", "SOURCE_EMPTYUNCONFIRMED"].includes(candidate.issue)) {
      await tell(t("failure")); return;
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
    const choice = await alert(t("language"), "", ["Latviešu", "English", "Русский", t("system")]);
    if (choice >= 0) { settings.language = ["lv", "en", "ru", "system"][choice]; save(); }
    try { await changeGroup(); } catch (error) { await tell(t("failure")); }
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
        await tell(state.issue ? t("failure") : t("synced"));
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
    } catch (error) { await tell(t("failure")); }
  }
  api.Script.complete();
}

module.exports = { run };
