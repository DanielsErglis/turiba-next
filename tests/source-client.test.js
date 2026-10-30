"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { SourceClient, scheduleUrl } = require("../src/source-client");
const { ORIGIN, parseCatalog, mergeCatalogs } = require("../src/parser");

const fixture = name => fs.readFileSync(path.join(__dirname, "fixtures/raw", name + ".html"), "utf8");
const catalog = mergeCatalogs(["home", "college", "masters", "doctoral", "branches"].map(name => parseCatalog(fixture(name))));
const response = (body, overrides) => Object.assign({ statusCode: 200, contentType: "text/html; charset=utf-8", body }, overrides);
const code = value => error => error.code === value;

test("source client loads exactly the five observed catalogs, sequentially", async () => {
  const names = ["home", "college", "masters", "doctoral", "branches"];
  const calls = [];
  let active = false;
  const client = new SourceClient(async (url, options) => {
    assert.equal(active, false);
    active = true;
    await Promise.resolve();
    const name = names[calls.length];
    calls.push(url);
    assert.equal(options.timeoutSeconds, 20);
    assert.equal(options.followRedirects, false);
    active = false;
    return response(fixture(name));
  });
  assert.deepEqual(await client.loadCatalog(), catalog);
  assert.deepEqual(calls, [ORIGIN, ORIGIN + "?lim=1", ORIGIN + "?lim=3", ORIGIN + "?lim=4", ORIGIN + "?lim=5"]);
});

test("schedule fetch keeps group explicit and validates the returned week", async () => {
  const calls = [];
  const client = new SourceClient(async url => { calls.push(url); return response(fixture("tvl2d1-next")); });
  const result = await client.loadSchedule(" tvl2d1 ", { catalog, catalogComplete: true, weekOffset: 1, expectedWeekStart: "2026-11-02" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0], ORIGIN + "pub_nod.asp?Grupa=TVL2D1&ned=1");
  assert.ok(result.lessons.every(lesson => lesson.source === calls[0]));
  await assert.rejects(() => client.loadSchedule("TVL2D1", { catalog, catalogComplete: true, weekOffset: -1, expectedWeekStart: "2026-10-19" }), code("WEEK_MISMATCH"));
});

test("unknown or unverified groups cause no schedule network request", async () => {
  let calls = 0;
  const client = new SourceClient(async () => { calls++; });
  await assert.rejects(() => client.loadSchedule("NONEXISTENTPHASE0", { catalog, catalogComplete: true }), code("UNKNOWN_GROUP"));
  await assert.rejects(() => client.loadSchedule("TVL2D1", { catalog }), code("CATALOG_REQUIRED"));
  assert.equal(calls, 0);
});

test("transport errors and timeouts have separate typed outcomes", async () => {
  for (const [transportCode, expected] of [["ETIMEDOUT", "NETWORK_TIMEOUT"], ["ECONNRESET", "NETWORK_ERROR"]]) {
    const client = new SourceClient(async () => { const error = new Error("Transport failed"); error.code = transportCode; throw error; });
    await assert.rejects(() => client.loadHtml(ORIGIN), code(expected));
  }
});

test("HTTP failures, non-HTML, empty bodies and redirected external responses are rejected", async () => {
  for (const [overrides, expected] of [
    [{ statusCode: 503 }, "HTTP_ERROR"], [{ statusCode: 302 }, "HTTP_ERROR"],
    [{ contentType: "application/json" }, "INVALID_RESPONSE"], [{ contentType: null }, "INVALID_RESPONSE"],
    [{ body: "" }, "INVALID_RESPONSE"], [{ url: "https://example.com/" }, "UNSAFE_SOURCE"]
  ]) {
    const client = new SourceClient(async () => response(fixture("tvl2d1-current"), overrides));
    await assert.rejects(() => client.loadHtml(ORIGIN), code(expected));
  }
});

test("unsafe request origins and invalid offsets are blocked before transport", async () => {
  let calls = 0;
  const client = new SourceClient(async () => { calls++; });
  for (const url of ["http://nodarbibas.turiba.lv/", "https://nodarbibas.turiba.lv.evil.example/", "https://nodarbibas.turiba.lv@evil.example/"]) {
    await assert.rejects(() => client.loadHtml(url), code("UNSAFE_SOURCE"));
  }
  assert.equal(calls, 0);
  for (const offset of [-9, 17, 1.5, "1"]) assert.throws(() => scheduleUrl("TVL2D1", offset), code("INVALID_WEEK"));
  assert.equal(scheduleUrl("CSA1D1"), ORIGIN + "pub_nod.asp?Grupa=CSA1D1");
});
