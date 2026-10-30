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
