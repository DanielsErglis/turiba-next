"use strict";

// Browser approximation of the actual renderer tree. This is not native iOS verification.
const fs = require("node:fs"), path = require("node:path");
const { renderWidget } = require("../src/widget");
const { defaults } = require("../src/settings");
const { api } = require("./widget-mock");
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function html(node, dark) {
  const color = value => "#" + (value.hex || (dark ? value.dark.hex : value.light.hex));
  if (node.kind === "spacer") return '<div style="' + (node.value ? "flex-shrink:0;min-height:" + node.value + "px;min-width:" + node.value + "px" : "flex:1") + '"></div>';
  if (node.kind === "text") return '<div style="font-size:' + node.font.size + 'px;font-weight:' + node.font.weight + ';color:' + color(node.textColor) + ';display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + node.lineLimit + ';overflow:hidden;line-height:1.15;flex-shrink:0">' + escape(node.value) + "</div>";
  const style = "display:flex;min-width:0;flex-direction:" + (node.kind === "widget" || node.vertical ? "column" : "row") + ";" +
    (node.kind === "widget" ? "width:100%;height:100%;box-sizing:border-box;padding:" + node.padding.join("px ") + "px;background:" + color(node.backgroundColor) + ";border-radius:23px" : "") +
    (node.spacing ? "gap:" + node.spacing + "px;" : "") + (node.centered ? "align-items:center" : "");
  return '<div style="' + style + '">' + node.children.map(child => html(child, dark)).join("") + "</div>";
}
const cards = [];
for (const language of ["lv", "en", "ru"]) for (const theme of ["light", "dark"]) for (const family of ["small", "medium"]) {
  const lesson = { date: "2026-10-30", startTime: "12:55", endTime: "14:25", subject: language === "en" ? "Introduction to Computer Architecture, Computer Engineering and Computer Systems" : "Integrētā mārketinga komunikācija", room: "C217" };
  const state = { status: "ongoing", group: "TVL2D1", current: lesson, next: Object.assign({}, lesson, { startTime: "14:40", subject: "Uzņēmējdarbība" }), refreshAt: Date.now() + 60000 };
  cards.push('<section><p>' + language + " · " + theme + " · " + family + '</p><div style="width:' + (family === "small" ? 158 : 338) + 'px;height:158px">' + html(renderWidget(state, Object.assign(defaults(), { theme }), language, family, api()), theme === "dark") + "</div></section>");
}
const output = path.join(__dirname, "../.tmp"); fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "widgets.html"), '<!doctype html><meta charset="utf-8"><title>TURĪBA NEXT renderer preview</title><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#dfe6eb;padding:25px;margin:0}main{display:grid;grid-template-columns:180px 360px 180px 360px;gap:18px}p{font-size:12px;color:#294353;margin:0 0 9px}h1{font-size:24px}small{display:block;margin-bottom:22px}</style><h1>TURĪBA NEXT</h1><small>Renderer-tree approximation · native iPhone acceptance pending</small><main>' + cards.join("") + "</main>");
console.log("Preview HTML generated in .tmp/widgets.html");
