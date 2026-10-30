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
  function recover(target) {
    const backup = target + ".bak";
    if (!fm.fileExists(target) && fm.fileExists(backup)) fm.move(backup, target);
  }
  function clean(file) {
    // Cleanup failure must not turn a committed save into a reported write failure.
    try { if (fm.fileExists(file)) fm.remove(file); } catch (error) { /* Retry during a later write or explicit deletion. */ }
  }
  return {
    read: name => {
      const target = path(name); recover(target);
      return fm.fileExists(target) ? fm.readString(target) : null;
    },
    writeAtomic: (name, content) => {
      const target = path(name), temporary = target + ".tmp-" + api.UUID.string(), backup = target + ".bak";
      recover(target);
      let backedUp = false, installed = false;
      try {
        fm.writeString(temporary, content);
        ensure(fm.readString(temporary) === content, "STORAGE_VERIFY_ERROR", "The temporary write could not be verified.");
        if (fm.fileExists(target)) {
          // Native iPhone behavior rejects move() when the destination already exists.
          if (fm.fileExists(backup)) fm.remove(backup);
          fm.move(target, backup); backedUp = true;
        }
        fm.move(temporary, target); installed = true;
        ensure(fm.readString(target) === content, "STORAGE_VERIFY_ERROR", "The installed write could not be verified.");
      } catch (error) {
        if (backedUp) {
          try {
            if (installed && fm.fileExists(target)) fm.remove(target);
            recover(target);
          } catch (recoveryError) { /* Keep the backup for the next read/recovery attempt. */ }
        } else if (installed) clean(target);
        throw error;
      } finally { clean(temporary); }
      clean(backup);
    },
    list: () => {
      // Recover interrupted replacements before Storage enumerates week records.
      for (const name of fm.listContents(root).filter(name => name.endsWith(".json.bak"))) recover(path(name.slice(0, -4)));
      return fm.listContents(root);
    },
    remove: name => { const target = path(name); if (fm.fileExists(target)) fm.remove(target); }
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
