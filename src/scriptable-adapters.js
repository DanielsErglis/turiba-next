"use strict";

const { ensure } = require("./errors");

function localAdapter(api) {
  const fm = api.FileManager.local();
  const root = fm.joinPath(fm.documentsDirectory(), "TURIBA-NEXT");
  if (!fm.fileExists(root)) fm.createDirectory(root, true);
  function path(name) {
    ensure(typeof name === "string" && name.length < 240 && /^[A-Za-z0-9%_.-]+$/.test(name) && !name.startsWith("."),
      "UNSAFE_STORAGE_PATH", "Invalid project data filename.");
    return fm.joinPath(root, name);
  }
  return {
    read: name => fm.fileExists(path(name)) ? fm.readString(path(name)) : null,
    writeAtomic: (name, content) => {
      const target = path(name), temporary = target + ".tmp-" + api.UUID.string();
      try { fm.writeString(temporary, content); fm.move(temporary, target); }
      finally { if (fm.fileExists(temporary)) fm.remove(temporary); }
    },
    list: () => fm.listContents(root), remove: name => { const target = path(name); if (fm.fileExists(target)) fm.remove(target); }
  };
}

function transport(api) {
  return async (url, options) => {
    const request = new api.Request(url);
    request.timeoutInterval = api.config.runsInWidget ? Math.min(6, options.timeoutSeconds) : options.timeoutSeconds;
    request.allowInsecureRequest = false;
    request.onRedirect = () => null;
    let body;
    try { body = await request.loadString(); }
    catch (error) {
      if (error && (error.code === -1001 || /timed?\s*out|timeout/i.test(error.message || ""))) {
        const timeout = new Error("The timetable request timed out."); timeout.code = "ETIMEDOUT"; throw timeout;
      }
      throw error;
    }
    const response = request.response || {}, headers = response.headers || {};
    const key = Object.keys(headers).find(name => name.toLowerCase() === "content-type");
    return { statusCode: response.statusCode, url: response.url, contentType: key ? headers[key] : response.mimeType, body };
  };
}

function notificationAdapter(api) {
  return {
    pending: () => api.Notification.allPending(), remove: ids => api.Notification.removePending(ids),
    schedule: async item => {
      const notification = new api.Notification();
      notification.identifier = item.identifier; notification.title = item.title; notification.body = item.body;
      notification.userInfo = item.userInfo; notification.threadIdentifier = "turiba-next";
      notification.sound = "default"; notification.openURL = api.runUrl;
      notification.setTriggerDate(new Date(item.trigger));
      await notification.schedule();
    }
  };
}

module.exports = { localAdapter, transport, notificationAdapter };
