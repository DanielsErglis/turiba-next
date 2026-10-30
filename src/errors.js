"use strict";

class ScheduleError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "ScheduleError";
    this.code = code;
    this.details = details || {};
  }
}

function ensure(condition, code, message, details) {
  if (!condition) throw new ScheduleError(code, message, details);
}

module.exports = { ScheduleError, ensure };
