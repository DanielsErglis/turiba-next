"use strict";

const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.join(__dirname, ".."), source = path.join(root, "src");
const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const acceptance = version.includes("-") ? "Native device acceptance pending." : "Owner-confirmed device acceptance on 2026-10-30.";
const modules = fs.readdirSync(source).filter(name => name.endsWith(".js")).sort();
const names = new Set(modules.map(name => name.slice(0, -3)));
const factories = modules.map(file => {
  const body = fs.readFileSync(path.join(source, file), "utf8").replace(/require\("\.\/([a-z-]+)"\)/g, (whole, name) => {
    if (!names.has(name)) throw new Error("Missing local module: " + name);
    return '__load("' + name + '")';
  });
  if (/\brequire\s*\(/.test(body)) throw new Error("Unbundled import in " + file);
  return JSON.stringify(file.slice(0, -3)) + ": function(module, exports) {\n" + body + "\n}";
});
const bundle = '// Variables used by Scriptable.\n// icon-color: cyan; icon-glyph: graduation-cap;\n// TURIBA NEXT ' + version + ' — independent student project. ' + acceptance + '\n' +
  'const __factories = {\n' + factories.join(",\n") + '\n};\nconst __cache = {};\n' +
  'function __load(name) { if (__cache[name]) return __cache[name].exports; const module = {exports:{}}; __cache[name] = module; __factories[name](module, module.exports); return module.exports; }\n' +
  'const __api = {FileManager, UUID, Request, config, args, Script, Device, Alert, Notification, ListWidget, Font, Color, Size, Timer: typeof Timer === "undefined" ? null : Timer, version: ' + JSON.stringify(version) + ', stage: "bootstrap"};\n' +
  'try { await __load("app").run(__api); }\n' +
  'catch (error) { const lang = __load("localization").resolveLanguage(__api.language || "system", Device.preferredLanguages()); const t = __load("localization").translator(lang); const details = __load("diagnostics").errorReport(error, __api.stage, __api.version); if (config.runsInWidget) { const widget = new ListWidget(); widget.addText("TURĪBA NEXT"); widget.addText(t("error")); widget.addText(String(error.code || error.name || "UNEXPECTED_ERROR")); widget.refreshAfterDate = new Date(Date.now() + 900000); Script.setWidget(widget); } else { const alert = new Alert(); alert.title = "TURĪBA NEXT"; alert.message = t("failure") + "\\n\\n" + details; alert.addAction(t("done")); await alert.presentAlert(); } Script.complete(); }\n';
const output = path.join(root, "dist"); fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "TURIBA NEXT.js"), bundle);
fs.writeFileSync(path.join(output, "SHA256SUMS"), crypto.createHash("sha256").update(bundle).digest("hex") + "  TURIBA NEXT.js\n");
console.log("Built dist/TURIBA NEXT.js (" + Buffer.byteLength(bundle) + " bytes)");
