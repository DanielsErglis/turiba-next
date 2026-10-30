"use strict";

const { ensure, ScheduleError } = require("./errors");
const { ORIGIN, CATALOG_PATHS, normalizeGroup, parseCatalog, mergeCatalogs, parseSchedule } = require("./parser");

function scheduleUrl(group, weekOffset) {
  const code = normalizeGroup(group);
  ensure(weekOffset === undefined || (Number.isInteger(weekOffset) && weekOffset >= -8 && weekOffset <= 16),
    "INVALID_WEEK", "The requested week offset is outside the supported range.");
  return ORIGIN + "pub_nod.asp?Grupa=" + encodeURIComponent(code) +
    (weekOffset === undefined ? "" : "&ned=" + weekOffset);
}

// The injected transport must enforce timeoutSeconds and must not follow external redirects.
// The Scriptable Request adapter is added with the application runtime in a later phase.
class SourceClient {
  constructor(transport) {
    ensure(typeof transport === "function", "INVALID_TRANSPORT", "An HTTPS transport is required.");
    this.transport = transport;
  }

  async loadHtml(url) {
    ensure(url.startsWith(ORIGIN), "UNSAFE_SOURCE", "Requests must use the approved HTTPS origin.");
    let response;
    try {
      response = await this.transport(url, { timeoutSeconds: 20, followRedirects: false });
    } catch (error) {
      throw new ScheduleError(error && error.code === "ETIMEDOUT" ? "NETWORK_TIMEOUT" : "NETWORK_ERROR",
        "The public timetable could not be loaded.");
    }
    ensure(response && response.statusCode === 200, "HTTP_ERROR", "The timetable server returned an unsuccessful response.",
      { statusCode: response && response.statusCode });
    ensure(!response.url || response.url.startsWith(ORIGIN), "UNSAFE_SOURCE", "The response came from an unapproved origin.");
    ensure(response.contentType && /^text\/html(?:\s*;|$)/i.test(response.contentType),
      "INVALID_RESPONSE", "The timetable response is not HTML.");
    ensure(typeof response.body === "string" && response.body.length > 0 && response.body.length <= 2000000,
      "INVALID_RESPONSE", "The timetable response body is invalid.");
    return response.body;
  }

  async loadCatalog() {
    const catalogs = [];
    // Keep requests sequential and bounded. Caching belongs to the storage/service layer.
    for (const path of CATALOG_PATHS) catalogs.push(parseCatalog(await this.loadHtml(ORIGIN + path)));
    return mergeCatalogs(catalogs);
  }

  async loadSchedule(group, options) {
    options = options || {};
    const code = normalizeGroup(group);
    ensure(options.catalog && options.catalogComplete === true, "CATALOG_REQUIRED", "A complete verified catalog is required.");
    ensure(options.catalog.some(entry => entry.code === code), "UNKNOWN_GROUP", "The group is absent from the current public catalog.");
    const url = scheduleUrl(code, options.weekOffset);
    return parseSchedule(await this.loadHtml(url), { group: code, catalog: options.catalog, catalogComplete: true,
      sourceUrl: url, expectedWeekStart: options.expectedWeekStart });
  }
}

module.exports = { SourceClient, scheduleUrl };
