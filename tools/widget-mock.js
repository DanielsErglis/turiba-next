"use strict";

class Node {
  constructor(kind, value) { this.kind = kind; this.value = value; this.children = []; }
  addText(value) { const node = new Node("text", value); this.children.push(node); return node; }
  addStack() { const node = new Node("stack"); this.children.push(node); return node; }
  addSpacer(value) { const node = new Node("spacer", value); this.children.push(node); return node; }
  setPadding(...value) { this.padding = value; }
  centerAlignContent() { this.centered = true; }
  layoutVertically() { this.vertical = true; }
}
class Color {
  constructor(hex) { this.hex = hex; }
  static dynamic(light, dark) { return { light, dark }; }
}
function api() {
  return { ListWidget: class extends Node { constructor() { super("widget"); } }, Color,
    Font: { boldSystemFont: size => ({ size, weight: 700 }), mediumSystemFont: size => ({ size, weight: 500 }) },
    runUrl: "scriptable:///run?scriptName=TURIBA%20NEXT" };
}
function texts(node) { return node.kind === "text" ? [node.value] : node.children.flatMap(texts); }
module.exports = { api, texts };
