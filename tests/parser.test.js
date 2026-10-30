"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { parseCatalog, mergeCatalogs, parseSchedule, normalizeGroup, isoDate } = require("../src/parser");
const { parseHtml, text, decodeEntities } = require("../src/html");

const fixture = name => fs.readFileSync(path.join(__dirname, "fixtures/raw", name + ".html"), "utf8");
const catalog = mergeCatalogs(["home", "college", "masters", "doctoral", "branches"].map(name => parseCatalog(fixture(name))));
const parse = (name, group, overrides) => parseSchedule(fixture(name), Object.assign({ group, catalog, catalogComplete: true }, overrides));
const mutate = (change, overrides) => parseSchedule(change(fixture("tvl2d1-current")), Object.assign({ group: "TVL2D1", catalog, catalogComplete: true }, overrides));
const errorCode = code => error => error.code === code;

test("captured fixture bytes match provenance hashes and successful HTTPS requests", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/manifest.json"), "utf8"));
  assert.equal(new Set(manifest.map(entry => entry.file)).size, manifest.length);
  for (const entry of manifest) {
    const bytes = fs.readFileSync(path.join(__dirname, "..", entry.file));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), entry.sha256, entry.file);
    assert.equal(bytes.length, entry.bytes);
    assert.equal(entry.status, 200);
    assert.equal(new URL(entry.url).origin, "https://nodarbibas.turiba.lv");
    assert.equal(entry.provenance, "captured");
    assert.ok(Number.isFinite(Date.parse(entry.retrievedAt)));
  }
});

test("all five catalog categories merge into 279 groups with known branches", () => {
  assert.equal(catalog.length, 279);
  assert.equal(new Set(catalog.map(entry => entry.code)).size, catalog.length);
  for (const [code, branch] of [["TVL2D1", "riga"], ["TBL1S5", "liepaja"], ["KFL1S3", "cesis"], ["KFL1S6", "talsi"]]) {
    assert.equal(catalog.find(entry => entry.code === code).branch, branch);
  }
});

test("catalog link labels and branch conflicts cannot silently change group identity", () => {
  assert.throws(() => parseCatalog(fixture("home").replace('>TVL2D1</a>', '>TVL2D9</a>')), errorCode("SOURCE_STRUCTURE_CHANGED"));
  assert.throws(() => mergeCatalogs([[{ code: "A1", branch: "riga" }], [{ code: "A1", branch: "cesis" }]]), errorCode("SOURCE_STRUCTURE_CHANGED"));
});

test("group normalization accepts codes without binding the product to one group", () => {
  assert.equal(normalizeGroup(" tvl2d1 "), "TVL2D1");
  assert.equal(normalizeGroup("CSA1D_AG02"), "CSA1D_AG02");
  for (const value of [null, "", "A", "TVL2D1&ned=9", "<script>", "A".repeat(33)]) {
    assert.throws(() => normalizeGroup(value), errorCode("INVALID_GROUP"));
  }
});

test("current-week lessons preserve repeated periods, source names and Riga wall times", () => {
  const result = parse("tvl2d1-current", "TVL2D1");
  assert.equal(result.status, "published");
  assert.equal(result.weekStart, "2026-10-26");
  assert.equal(result.weekEnd, "2026-11-01");
  assert.equal(result.lessons.length, 14);
  assert.equal(result.lessons[0].subject, "Integrētā mārketinga komunikācija");
  assert.equal(result.lessons[0].room, "C216");
  assert.deepEqual(result.lessons.slice(0, 2).map(lesson => [lesson.period, lesson.startTime, lesson.endTime]), [[1, "09:00", "10:30"], [2, "10:45", "12:15"]]);
  assert.ok(result.lessons.every(lesson => lesson.timeZone === "Europe/Riga"));
});

test("weekday and Saturday period three use different actual Riga grids", () => {
  assert.equal(parse("tvl2d1-current", "TVL2D1").lessons.find(lesson => lesson.period === 3).startTime, "12:55");
  const result = parse("bll2s1-current", "BLL2S1");
  const saturday = result.lessons.filter(lesson => lesson.date === "2026-10-31");
  assert.equal(saturday.length, 6);
  assert.equal(saturday.find(lesson => lesson.period === 3).startTime, "12:45");
  assert.equal(saturday.find(lesson => lesson.period === 6).endTime, "19:30");
  assert.equal(result.lessons[0].startTime, "18:15");
});

test("each branch uses its own captured Saturday grid", () => {
  for (const [name, group, start, third] of [
    ["kfl1s3-current", "KFL1S3", "09:00", "13:00"],
    ["kfl1s6-current", "KFL1S6", "09:00", "12:35"],
    ["tbl1s5-current", "TBL1S5", "10:00", "13:45"]
  ]) {
    const result = parse(name, group);
    assert.equal(result.lessons[0].startTime, start);
    assert.equal(result.lessons.find(lesson => lesson.period === 3).startTime, third);
  }
});

test("electives require selection and preserve their source subgroup identifiers", () => {
  const result = parse("tvl2d1-current", "TVL2D1");
  const choices = result.lessons.filter(lesson => lesson.elective);
  assert.equal(choices.length, 2);
  assert.equal(choices[0].subject, "Pakalpojumu mārketings");
  assert.equal(choices[0].subgroup, "TVL2D_IB01");
  assert.ok(choices.every(lesson => lesson.requiresSelection));
  assert.equal(result.lessons[0].requiresSelection, false);
});

test("split subgroup continuation rows inherit the period and elective category", () => {
  const result = parse("csa1d1-current", "CSA1D1");
  assert.equal(result.lessons.length, 27);
  const alternatives = result.lessons.filter(lesson => lesson.date === "2026-10-27" && lesson.period === 2);
  assert.deepEqual(alternatives.map(lesson => [lesson.subgroup, lesson.room]), [["CSA1D_IB032", "A304"], ["CSA1D_IB031", "A212"]]);
  assert.ok(alternatives.every(lesson => lesson.elective && lesson.requiresSelection));
  const languages = result.lessons.filter(lesson => lesson.date === "2026-10-27" && lesson.period === 1);
  assert.equal(languages.length, 2);
  assert.ok(languages.every(lesson => !lesson.elective && lesson.requiresSelection));
});

test("real exams can have a numbered but empty category cell", () => {
  const result = parse("kfl1s5-current", "KFL1S5");
  const exams = result.lessons.filter(lesson => lesson.type === "exam");
  assert.equal(exams.length, 2);
  assert.equal(exams[0].subject, "Lietišķā svešvaloda 1 (eksāmens)");
  assert.equal(exams[0].period, 3);
  assert.equal(exams[0].subgroup, "KFL1S_AG51");
});

test("missing rooms remain null; named locations are preserved rather than guessed", () => {
  assert.ok(parse("tbl1s5-current", "TBL1S5").lessons.every(lesson => lesson.room === null));
  assert.ok(parse("tbl1s5-current", "TBL1S5").warnings.includes("MISSING_ROOM"));
  assert.ok(parse("tvl2d1-next", "TVL2D1").lessons.some(lesson => lesson.room === "ekskursija"));
  assert.ok(parse("csa1d1-current", "CSA1D1").lessons.some(lesson => lesson.room === "A204/1"));
});

test("long official subjects and source change markup are retained as data", () => {
  const result = parse("csa1d1-current", "CSA1D1");
  assert.ok(result.lessons.some(lesson => lesson.subject === "Introduction to Computer Architecture, Computer Engineering and Computer Systems"));
  const selfStudy = result.lessons.filter(lesson => lesson.type === "selfStudy");
  assert.equal(selfStudy.length, 2);
  assert.ok(selfStudy.every(lesson => lesson.changed && lesson.room === null));
});

test("service rows never become invented lessons or inherit an earlier subject", () => {
  const result = parse("tvl2d1-next", "TVL2D1");
  assert.equal(result.lessons.length, 10);
  assert.ok(result.warnings.includes("BLANK_SERVICE_ROW"));
  assert.equal(result.lessons.filter(lesson => lesson.date === "2026-11-05").length, 2);
});

test("mobile and desktop responses yield identical normalized lessons", () => {
  assert.deepEqual(parse("tvl2d1-mobile", "TVL2D1"), parse("tvl2d1-current", "TVL2D1"));
});

test("zero and two offsets are interpreted from returned week dates", () => {
  assert.equal(parse("tvl2d1-zero", "TVL2D1").weekStart, "2026-10-26");
  assert.equal(parse("tvl2d1-two", "TVL2D1").weekStart, "2026-11-09");
});

test("the observed previous-link anomaly is rejected when the intended week is supplied", () => {
  for (const name of ["tvl2d1-previous", "tvl2d1-session-previous"]) {
    assert.equal(parse(name, "TVL2D1").weekStart, "2026-11-02");
    assert.throws(() => parse(name, "TVL2D1", { expectedWeekStart: "2026-10-19" }), errorCode("WEEK_MISMATCH"));
  }
});

test("navigation always includes the requested group and the approved HTTPS origin", () => {
  const result = parse("tvl2d1-current", "TVL2D1");
  for (const url of Object.values(result.navigation)) {
    assert.equal(new URL(url).searchParams.get("Grupa"), "TVL2D1");
    assert.equal(new URL(url).origin, "https://nodarbibas.turiba.lv");
  }
  assert.throws(() => mutate(html => html.replace('href="?ned=1"', 'href="https://example.com/"')), errorCode("SOURCE_STRUCTURE_CHANGED"));
});

test("unknown group cannot be accepted merely because its heading echoes the query", () => {
  assert.throws(() => parse("unknown-group", "NONEXISTENTPHASE0"), errorCode("UNKNOWN_GROUP"));
  const unverified = parseSchedule(fixture("unknown-group"), { group: "NONEXISTENTPHASE0" });
  assert.equal(unverified.status, "unverifiedGroup");
  assert.equal(unverified.lessons.length, 0);
});

test("a known group with the observed unavailable message is unpublished, not a free day (synthetic)", () => {
  const result = parseSchedule(fixture("unknown-group").replace(/NONEXISTENTPHASE0/g, "TVL2D1"), { group: "TVL2D1", catalog, catalogComplete: true });
  assert.equal(result.status, "unpublished");
  assert.ok(result.warnings.includes("PUBLICATION_REASON_UNVERIFIED"));
});

test("a real catalog-listed doctoral group returns the same unavailable message as an unknown code", () => {
  const result = parse("dkl1v1-current", "DKL1V1");
  assert.equal(result.status, "unpublished");
  assert.equal(result.lessons.length, 0);
  assert.equal(parse("bml1v1-current", "BML1V1").lessons.length, 6);
});

test("a structurally empty lesson body is explicitly unconfirmed, not known-empty (synthetic)", () => {
  const result = mutate(html => html.replace(/(<tbody class="content2">)[\s\S]*?(<\/tbody>)/, "$1$2"));
  assert.equal(result.status, "emptyUnconfirmed");
  assert.equal(result.lessons.length, 0);
});

test("header group mismatch and unverifiable branch fail before returning lessons", () => {
  assert.throws(() => parse("tvl2d1-current", "CSA1D1"), errorCode("GROUP_MISMATCH"));
  assert.throws(() => parseSchedule(fixture("tvl2d1-current"), { group: "TVL2D1" }), errorCode("GROUP_UNVERIFIED"));
});

test("truncated markup, challenge-only HTML and changed columns are rejected", () => {
  assert.throws(() => mutate(html => html.slice(0, html.indexOf("</tbody>"))), errorCode("HTML_PARSE_ERROR"));
  assert.throws(() => parseSchedule("<html><body>Checking your browser</body></html>", { group: "TVL2D1" }), errorCode("SOURCE_STRUCTURE_CHANGED"));
  assert.throws(() => mutate(html => html.replace('>Auditorija</td>', '>Different field</td>')), errorCode("SOURCE_STRUCTURE_CHANGED"));
});

test("invalid dates, week ranges and date-less first lessons fail closed", () => {
  assert.throws(() => isoDate("31.02.2026"), errorCode("HTML_PARSE_ERROR"));
  assert.equal(isoDate("29.02.2024"), "2024-02-29");
  assert.throws(() => mutate(html => html.replace("01.11.2026", "02.11.2026")), errorCode("SOURCE_STRUCTURE_CHANGED"));
  assert.throws(() => mutate(html => html.replace("Pirmdiena<br>26.10.2026", "&nbsp;")), errorCode("HTML_PARSE_ERROR"));
});

test("unsupported time grids cannot silently fall back to Riga or guessed times", () => {
  assert.throws(() => mutate(html => html.replace('id="laiks_1"', 'id="changed_grid"')), errorCode("TIME_GRID_MISSING"));
  assert.throws(() => mutate(html => html.replace("1. Integrētā", "99. Integrētā")), errorCode("TIME_GRID_MISSING"));
  assert.throws(() => mutate(html => html.replace("09:00 - 10:30", "25:00 - 26:30")), errorCode("SOURCE_STRUCTURE_CHANGED"));
});

test("unknown row layout and rowspans are rejected", () => {
  assert.throws(() => mutate(html => html.replace('colspan="2" class="color_4">1.', 'rowspan="2" colspan="2" class="color_4">1.')), errorCode("SOURCE_STRUCTURE_CHANGED"));
  assert.throws(() => mutate(html => html.replace('<td class="color_4">C216</td>', '<td>C216</td><td>unknown</td>')), errorCode("SOURCE_STRUCTURE_CHANGED"));
});

test("consultations and proposed session markings are data, not confirmed exams (synthetic)", () => {
  const result = mutate(html => html.replace(/Integrētā mārketinga komunikācija/g, "Konsultācija**"));
  assert.equal(result.lessons[0].type, "consultation");
  assert.equal(result.lessons[0].provisional, true);
});

test("one, two and three stars retain their distinct source footnote meanings (synthetic)", () => {
  const results = ["*", "**", "***"].map(stars => mutate(html => html.replace(/Integrētā mārketinga komunikācija/g, "Course" + stars)).lessons[0]);
  assert.deepEqual(results.map(lesson => [lesson.individualSchedule, lesson.provisional, lesson.deliveryModeUnspecified]),
    [[true, false, false], [false, true, false], [false, false, true]]);
  assert.equal(results[0].requiresSelection, true);
});

test("unexpectedly blank subject cells are errors rather than service rows (synthetic)", () => {
  assert.throws(() => mutate(html => html.replace("1. Integrētā mārketinga komunikācija", "&nbsp;")), errorCode("HTML_PARSE_ERROR"));
});

test("HTML entity decoding preserves diacritics and never executes embedded scripts", () => {
  assert.equal(decodeEntities("R&#299;ga &amp; &#x100; &nbsp; &#0;"), "Rīga & Ā   �");
  assert.equal(text(parseHtml('<p>A <b>long</b> name<br>next</p>')), "A long name next");
  globalThis.turibaUnsafeProbe = false;
  const result = mutate(html => html.replace("<head>", '<head><script>globalThis.turibaUnsafeProbe = true;</script>'));
  assert.equal(globalThis.turibaUnsafeProbe, false);
  assert.equal(result.lessons.length, 14);
  delete globalThis.turibaUnsafeProbe;
});

test("HTML input limits and mismatched table tags are enforced", () => {
  for (const value of ["", null, "x".repeat(2000001), "<table><tr><td>A</tr></td></table>"]) {
    assert.throws(() => parseHtml(value), errorCode("HTML_PARSE_ERROR"));
  }
});
