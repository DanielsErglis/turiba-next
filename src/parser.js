"use strict";

const { ensure, ScheduleError } = require("./errors");
const { parseHtml, descendants, text, hasClass } = require("./html");

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
