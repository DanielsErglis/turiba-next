"use strict";

// Explicit, bounded development check; not part of offline tests or the iPhone bundle.
const fs = require("node:fs");
const { SourceClient } = require("../src/source-client");
const { serverWeekStart } = require("../src/time");

async function main() {
  let requests = 0;
  const client = new SourceClient(async (url, options) => {
    requests++;
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(options.timeoutSeconds * 1000) });
    return { statusCode: response.status, url: response.url, contentType: response.headers.get("content-type"), body: await response.text() };
  });
  const catalog = await client.loadCatalog();
  const expected = serverWeekStart(Date.now());
  const result = await client.loadSchedule("TVL2D1", { catalog, catalogComplete: true, weekOffset: 0, expectedWeekStart: expected });
  const report = { checkedAt: new Date().toISOString(), environment: "Node.js on macOS; not Scriptable/iPhone",
    requests, catalogGroups: catalog.length, group: result.group, branch: result.branch,
    expectedWeekStart: expected, returnedWeekStart: result.weekStart, status: result.status, lessons: result.lessons.length };
  fs.writeFileSync("docs/LIVE_SOURCE_CHECK.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
}
main().catch(error => { console.error(error.code || "LIVE_CHECK_FAILED", error.message); process.exitCode = 1; });
