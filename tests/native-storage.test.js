"use strict";

const test = require("node:test"), assert = require("node:assert/strict");
const { localAdapter } = require("../src/scriptable-adapters");
const { Storage } = require("../src/storage");
const { defaults } = require("../src/settings");
const ROOT = "/documents/TURIBA-NEXT/";

function nativeFiles() {
  const files = new Map(), moves = [];
  let id = 0;
  const fm = {
    documentsDirectory: () => "/documents", joinPath: (a, b) => a + "/" + b,
    fileExists: name => name === ROOT.slice(0, -1) || files.has(name), createDirectory: () => {},
    readString: name => files.get(name), writeString: (name, value) => files.set(name, value),
    remove: name => files.delete(name), listContents: () => Array.from(files.keys()).map(name => name.slice(ROOT.length)),
    move: (from, to) => {
      moves.push([from, to]);
      if (files.has(to)) throw new Error("An item with the same name already exists.");
      if (!files.has(from)) throw new Error("Source does not exist.");
      files.set(to, files.get(from)); files.delete(from);
    }
  };
  return { files, fm, moves, api: { FileManager: { local: () => fm }, UUID: { string: () => "test-" + (++id) } } };
}

test("repeated language and group saves work when native move refuses existing destinations", () => {
  const env = nativeFiles(), storage = new Storage(localAdapter(env.api)), settings = defaults();
  storage.saveSettings(settings);
  settings.language = "ru"; storage.saveSettings(settings);
  settings.group = "TVL2D1"; storage.saveSettings(settings);
  assert.deepEqual(storage.settings(), settings);
  assert.deepEqual(Array.from(env.files.keys()), [ROOT + "settings.json"]);
});

test("replacement failure rolls back the original exact settings bytes", () => {
  const env = nativeFiles(), adapter = localAdapter(env.api), original = '{"original":true}';
  adapter.writeAtomic("settings.json", original);
  const move = env.fm.move;
  env.fm.move = (from, to) => {
    if (from.includes(".tmp-") && to.endsWith("settings.json")) throw new Error("Install failed");
    return move(from, to);
  };
  assert.throws(() => adapter.writeAtomic("settings.json", '{"new":true}'), /Install failed/);
  assert.equal(adapter.read("settings.json"), original);
  assert.deepEqual(Array.from(env.files.keys()), [ROOT + "settings.json"]);
});

test("failed restoration retains the backup and recovers on a later read", () => {
  const env = nativeFiles(), adapter = localAdapter(env.api);
  adapter.writeAtomic("settings.json", "old");
  const move = env.fm.move;
  env.fm.move = (from, to) => { if (to === ROOT + "settings.json") throw new Error("Destination unavailable"); return move(from, to); };
  assert.throws(() => adapter.writeAtomic("settings.json", "new"), /Destination unavailable/);
  assert.equal(env.files.get(ROOT + "settings.json.bak"), "old");
  env.fm.move = move;
  assert.equal(adapter.read("settings.json"), "old");
});

test("interrupted week replacement is recovered before cache enumeration", () => {
  const env = nativeFiles(), adapter = localAdapter(env.api);
  const key = "week-TVL2D1-2026-10-26.json";
  env.files.set(ROOT + key + ".bak", '{"old":true}');
  assert.deepEqual(adapter.list(), [key]);
  assert.equal(adapter.read(key), '{"old":true}');
});

test("temporary write verification failure leaves the current file untouched", () => {
  const env = nativeFiles(), adapter = localAdapter(env.api);
  adapter.writeAtomic("settings.json", "old");
  env.fm.writeString = (name, value) => env.files.set(name, "truncated");
  assert.throws(() => adapter.writeAtomic("settings.json", "new"), error => error.code === "STORAGE_VERIFY_ERROR");
  assert.equal(adapter.read("settings.json"), "old");
});

test("post-install verification failure restores the previous value", () => {
  const env = nativeFiles(), adapter = localAdapter(env.api);
  adapter.writeAtomic("settings.json", "old");
  const read = env.fm.readString;
  let rejected = false;
  env.fm.readString = name => {
    if (name === ROOT + "settings.json" && env.files.get(name) === "new" && !rejected) { rejected = true; return "incomplete"; }
    return read(name);
  };
  assert.throws(() => adapter.writeAtomic("settings.json", "new"), error => error.code === "STORAGE_VERIFY_ERROR");
  assert.equal(adapter.read("settings.json"), "old");
});
