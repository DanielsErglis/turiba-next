"use strict";

const { ensure } = require("./errors");

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
