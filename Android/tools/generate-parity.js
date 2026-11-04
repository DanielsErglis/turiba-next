"use strict";
// Offline expectations from the unchanged iPhone implementation; never run in the app.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.resolve(__dirname, "../.."), out = path.resolve(__dirname, "../core/src/test/resources/parity");
const parser = require(path.join(root, "src/parser"));
const { scheduleState } = require(path.join(root, "src/engine"));
// The helper is private in the shipped source: expose it only in this offline test VM.
const fingerprint = require("node:vm").runInNewContext(
  fs.readFileSync(path.join(root, "src/notifications.js"), "utf8") + "\nfingerprint;",
  { require: require("node:module").createRequire(path.join(root,"src/notifications.js")), module: { exports: {} } }
);
const { choiceKey } = require(path.join(root, "src/settings"));
fs.mkdirSync(out, { recursive: true });
const raw = name => fs.readFileSync(path.join(root, "tests/fixtures/raw", name), "utf8");
const catalogs = ["home.html", "college.html", "masters.html", "doctoral.html", "branches.html"];
const catalog = parser.mergeCatalogs(catalogs.map(name => parser.parseCatalog(raw(name))));
const line = values => values.map(value => Buffer.from(value === null || value === undefined ? "~" : String(value), "utf8").toString("base64")).join("\t");
fs.writeFileSync(path.join(out, "catalog.golden"), catalog.map(g => line([g.code, g.branch, g.source])).join("\n") + "\n");
const files = fs.readdirSync(path.join(root, "tests/fixtures/raw")).filter(n => !catalogs.includes(n) && n !== "pic.html");
const states = [], weeks = [];
for (const name of files) {
  const html = raw(name);
  const { parseHtml, descendants, text } = require(path.join(root, "src/html"));
  const heading = descendants(parseHtml(html), n => n.tag === "h2" && /^Grupa\s/.test(text(n)))[0];
  const group = text(heading).match(/^Grupa\s+(\S+)\s+no/)[1];
  let lines;
  try {
    const w = parser.parseSchedule(html, { group, catalog, catalogComplete: group !== "NONEXISTENTPHASE0" });
    lines = [line([w.group, w.branch, w.weekStart, w.weekEnd, w.status, w.warnings.join("|"), ...["previous","current","next"].map(k => w.navigation[k])])];
    for (const l of w.lessons) lines.push(line([l.date,l.startTime,l.endTime,l.subject,l.room,l.period,l.group,l.sourceGroup,l.subgroup,l.category,l.type,l.elective,l.requiresSelection,l.provisional,l.individualSchedule,l.deliveryModeUnspecified,l.changed,l.source,choiceKey(l)]));
    if (w.status === "published") weeks.push(w);
  } catch (error) { lines = [line(["error", error.code])]; }
  fs.writeFileSync(path.join(out, name + ".golden"), lines.join("\n") + "\n");
}
for (const group of ["TVL2D1","CSA1D1","KFL1S5","BLL2S1","TBL1S5"]) {
  const groupWeeks = weeks.filter(w => w.group === group);
  const instants = new Set([Date.parse("2026-10-26T00:00:00Z"),Date.parse("2026-11-01T20:00:00Z"),Date.parse("2026-11-15T20:00:00Z")]);
  for (const l of groupWeeks.flatMap(w => w.lessons)) {
    const { rigaInstant } = require(path.join(root, "src/time"));
    const start = rigaInstant(l.date,l.startTime), end = rigaInstant(l.date,l.endTime);
    [start-600001,start-600000,start,start+1,end-1,end].forEach(t => instants.add(t));
  }
  for (const choices of [[],groupWeeks.flatMap(w => w.lessons).filter(l => l.requiresSelection).map(choiceKey)]) for (const now of instants) {
    const s = scheduleState({group,weeks:groupWeeks,selections:choices,now,offline:true,stale:true});
    states.push(line([group,now,choices.length ? "all" : "none",s.status,s.current ? choiceKey(s.current) : null,s.next ? choiceKey(s.next) : null,s.concurrent.length,s.selectionRequired,s.coverageIncomplete,s.offline,s.stale,s.issue,s.refreshAt]));
  }
}
fs.writeFileSync(path.join(out,"states.golden.gz"),require("node:zlib").gzipSync(states.join("\n")+"\n"));
fs.rmSync(path.join(out,"states.golden"),{force:true});
const strings = ["Rīga", "😀", 'TVL2D_IB01\n"\\', "Русский", "Āčēģīķļņšūž"];
fs.writeFileSync(path.join(out,"identity.golden"),strings.map(s => line([s,JSON.stringify([s,s]),fingerprint(s)])).join("\n")+"\n");
const subjects=["z","ā","a","ä","A","Ā","Ž","Z","Å","á","Ābols","Apple"];
fs.writeFileSync(path.join(out,"collation.golden"),subjects.slice().sort((a,b)=>a.localeCompare(b)).map(s=>line([s])).join("\n")+"\n");
const reminderRows=[];
const {reminderPlan}=require(path.join(root,"src/notifications"));
for(const group of ["TVL2D1","CSA1D1"]) for(const lead of [5,10,15,30]) for(const language of ["en","lv","ru"]) for(const mode of ["none","all"]) {
  const week=parser.parseSchedule(raw(group.toLowerCase()+"-current.html"),{group,catalog,catalogComplete:true});
  const choices=mode==="all" ? week.lessons.filter(l=>l.requiresSelection).map(choiceKey) : [];
  const settings={group,notifications:{enabled:true,leadMinutes:lead},selections:{[group]:choices}};
  const plan=reminderPlan(settings,[week],Date.parse("2026-10-26T00:00:00Z"),language);
  reminderRows.push(line([group,lead,language,mode,...plan.map(p=>JSON.stringify([p.identifier,String(p.trigger),p.body,p.userInfo.fingerprint,p.userInfo.weekStart]))]));
}
fs.writeFileSync(path.join(out,"reminders.golden.gz"),require("node:zlib").gzipSync(reminderRows.join("\n")+"\n"));
const provenance = { kind:"generated expectations, not captured source", generatedFrom:"unchanged JS modules",capturedManifest:"../../tests/fixtures/manifest.json",stateCases:states.length,reminderPlanCases:reminderRows.length,files:{} };
for (const file of ["parser","html","engine","time","settings","notifications"]) provenance.files["src/"+file+".js"]=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"src",file+".js"))).digest("hex");
fs.writeFileSync(path.join(out,"provenance.json"),JSON.stringify(provenance,null,2)+"\n");
console.log(`Generated ${files.length} schedule cases, ${catalog.length} catalog groups and ${states.length} state boundary cases.`);
