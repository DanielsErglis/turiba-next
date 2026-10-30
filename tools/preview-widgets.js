"use strict";

// Preview the actual renderer tree. CSS is an approximation, not native WidgetKit validation.
const fs = require("node:fs"), path = require("node:path");
const { renderWidget, widgetMetrics } = require("../src/widget");
const { defaults } = require("../src/settings");
const { api } = require("./widget-mock");
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function html(node, dark, parentVertical) {
  const color = value => "#" + (value.hex || (dark ? value.dark.hex : value.light.hex));
  if (node.kind === "spacer") return '<div style="' + (node.value ? 'flex:0 0 ' + node.value + 'px;' + (parentVertical ? 'height:' : 'width:') + node.value + 'px' : 'flex:1;min-width:0;min-height:0') + '"></div>';
  if (node.kind === "text") return '<div class="label" style="font-size:' + node.font.size + 'px;font-weight:' + node.font.weight + ';color:' + color(node.textColor) + ';-webkit-line-clamp:' + node.lineLimit + ';text-align:' + (node.textAlignment || "left") + '">' + escape(node.value) + "</div>";
  const vertical = node.kind === "widget" || node.vertical;
  const size = node.size || {};
  const style = 'display:flex;min-width:0;min-height:0;flex-shrink:0;box-sizing:border-box;flex-direction:' + (vertical ? 'column' : 'row') + ';' +
    (node.kind === "widget" ? 'width:100%;height:100%;border-radius:23px;' : '') +
    (size.width > 0 ? 'width:' + size.width + 'px;' : '') + (size.height > 0 ? 'height:' + size.height + 'px;' : '') +
    (node.padding ? 'padding:' + node.padding.map(n => n + 'px').join(' ') + ';' : '') +
    (node.backgroundColor ? 'background:' + color(node.backgroundColor) + ';' : '') +
    (node.cornerRadius ? 'border-radius:' + node.cornerRadius + 'px;' : '') +
    (node.spacing ? 'gap:' + node.spacing + 'px;' : '') +
    (node.centered ? 'align-items:center;' : node.bottomAligned ? 'align-items:flex-end;' : '');
  return '<div data-kind="' + node.kind + '" style="' + style + '">' + node.children.map(child => html(child, dark, vertical)).join('') + '</div>';
}
function card(language, theme, family, scenario, screen) {
  const renderer = api(); renderer.Device = { screenSize: () => ({ width: screen || 390, height: 844 }) };
  const long = scenario === "long";
  const lesson = { date: "2026-11-03", startTime: "09:00", endTime: "10:30", subject: long ? "Introduction to Computer Architecture, Computer Engineering and Computer Systems" : "E-komercija", room: scenario === "missing" ? null : scenario === "location" ? "C214 ITN" : "C216" };
  const state = { status: "soon", today: lesson.date, group: "TVL2D1", current: lesson,
    next: Object.assign({}, lesson, { date: scenario === "future" ? "2026-11-04" : lesson.date, startTime: "10:45", subject: long ? "Grāmatvedība un nodokļi" : "Grāmatvedība" }),
    offline: scenario === "offline", refreshAt: Date.now() + 60000 };
  const metrics = widgetMetrics(renderer);
  return '<div class="sample" data-family="' + family + '" style="width:' + metrics[family] + 'px;height:' + metrics.small + 'px">' + html(renderWidget(state, Object.assign(defaults(), { theme }), language, family, renderer), theme === "dark", true) + '</div>';
}
const hero = '<section id="hero"><div class="caption">Small + Medium · reference composition · synthetic sample</div><div class="pair">' + card('en', 'dark', 'small') + card('en', 'dark', 'medium') + '</div></section>';
const samples = [];
for (const language of ['lv', 'en', 'ru']) for (const theme of ['light', 'dark']) {
  samples.push('<section><p>' + language + ' · ' + theme + '</p><div class="pair">' + card(language, theme, 'small') + card(language, theme, 'medium') + '</div></section>');
}
for (const scenario of ['long', 'missing', 'location', 'future', 'offline']) {
  samples.push('<section><p>ru · dark · ' + scenario + '</p><div class="pair">' + card('ru','dark','small',scenario) + card('ru','dark','medium',scenario) + '</div></section>');
}
samples.push('<section><p>Narrow iPhone · 141 / 292 points · long subject</p><div class="pair">' + card('ru','dark','small','long',320) + card('ru','dark','medium','long',320) + '</div></section>');
const output = path.join(__dirname, '../.tmp'); fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'widgets.html'), '<!doctype html><meta charset="utf-8"><title>TURĪBA NEXT · new widget layout</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Arial",sans-serif;background:#181818;color:#d6e3e9;padding:24px;margin:0}h1{font-size:22px;margin:0 0 10px}p,.caption{font-size:11px;color:#a6b9c3;margin:0 0 9px}.caption{padding-top:12px}#hero{width:max-content;padding:0 10px 16px;background:#181818}.pair{display:flex;align-items:flex-start;gap:12px}.sample{flex-shrink:0}.label{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden;line-height:1.1;min-width:0;flex-shrink:1}main{display:grid;grid-template-columns:repeat(2,max-content);gap:20px;margin-top:24px}</style><h1>TURĪBA NEXT · 1.1 visual update</h1><p>Renderer-tree approximation. Updated native layout still needs iPhone confirmation.</p>' + hero + '<main>' + samples.join('') + '</main>');
console.log('Generated .tmp/widgets.html');
