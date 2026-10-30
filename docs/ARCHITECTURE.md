# Architecture and Operational Decisions

## Runtime and modules

The runtime is plain JavaScript inside Scriptable. Source modules use local CommonJS-style imports for Node testing; tools/build.js replaces them with static module factories inside one distributable script. There is no runtime compiler, eval, remote import or Node dependency on the iPhone. The build includes only src modules; captured HTML and developer tools are excluded.

Modules: SourceClient (bounded HTTPS operations), parser/html (non-executing source normalization), time (IANA Europe/Riga conversion), engine (lesson selection/status/refresh boundaries), settings (validated configuration and explicit choice keys), storage (validated local records), ScheduleService (cache/sync policy), localization/theme/widget (presentation), notifications (opt-in scoped reconciliation), Scriptable adapters and app (platform integration/setup).

## Time and states

Use Intl.DateTimeFormat with Europe/Riga and formatToParts, never the device or development host's local time zone. Inversion discovers surrounding IANA offsets and verifies candidate wall times. Nonexistent DST times are rejected; repeated times require an explicit earlier/later choice and are rejected by default for schedule lessons. Calendar arithmetic uses ISO dates independently of elapsed hours. Tests cover the 23- and 25-hour Riga transition days and an alternate host time zone.

Upcoming is visible regardless of how far away a known lesson is. Soon begins exactly ten minutes before start. Ongoing includes the start instant and excludes the end instant; a break never extends a finished lesson. Concurrent selections remain visible in the state model. Finished preserves the next known lesson. A verified published week establishes day coverage; no selected lessons in that day can be shown as such. Unpublished/ambiguous weeks cannot establish a day off. Offline/stale and selection/coverage warnings are separate flags so the correct lesson state is retained.

refreshAfterDate is an advisory boundary capped at 15 minutes, with nearer lesson/soon/end/Riga-midnight boundaries when applicable. iOS decides when to refresh. No precise widget refresh or Shortcuts delivery is promised.

## Storage and synchronization

Use FileManager.local() under its documents directory in TURIBA-NEXT, separate from other scripts. Settings default to system appearance/language and notifications OFF with a ten-minute lead. Widget parameters override only that instance's group; per-group course choices are kept locally.

Settings, public catalog, per-group/week schedule envelopes and recent sync markers are JSON. Validate schema, identity, week boundaries and lesson times when reading. Corrupt settings are preserved until an explicit reset. Corrupt cache records are skipped and reported. Unknown formats are not silently migrated or accepted. The rc.3 native writer verifies a temporary sibling, moves any current target to a backup, installs only to an absent target, and verifies the result. Failures attempt rollback; an interrupted missing-target replacement is recovered from its backup before reads/cache enumeration. The iPhone owner demonstrated that move refuses an existing destination despite the documentation claiming replacement. No operation now relies on overwrite-by-move. This is recoverable replacement, not a guaranteed atomic transaction or crash-durability promise. Individual files avoid partial JSON in normal writes, but this is not an interprocess transactional database. Simultaneous widgets may issue duplicate requests or race; there is no documented cross-process lock in this implementation.

Successful published weeks alone replace schedule cache. Transport/parse failures and unpublished/empty-unconfirmed outcomes preserve the previous valid week. The five-section public catalog normally lasts 24 hours; on refresh failure a verified catalog up to seven days old can still establish the branch. Per-group refresh attempts are throttled for 15 minutes; manual sync bypasses the throttle and requests a fresh catalog. Force failures invalidate the latest reminder-verification marker without deleting the last schedule.

Fetch current and next server week on normal weekdays. On Sunday the source already calls next week current: request that actual week and retain any cached calendar week. An uncached Sunday does not gain invented current-week coverage. Negative-week navigation is not relied upon. Old cache files are retained locally until Delete My Data; the service considers only the relevant current/future window. Long-term retention can be reduced in a later schema-compatible optimization; no untested retention cleanup is claimed.

## Notifications

Default OFF widget runs do not enumerate, plan, create or request permission for notifications. Explicit disable, group change, choice changes and Delete My Data clean only identifiers with both the project prefix and matching owner marker. There is no call to removeAllPending.

ON planning uses only the primary group's explicitly selected, non-provisional lessons, up to seven days ahead and at most 32 reminders. IDs include group/date/time/period/subject/source-group identity; fingerprints detect room, lead-time and localization changes. Reconciliation is idempotent. Individually verified fresh weeks can update reminders even if another week failed; removal is restricted to verified weeks. Unverified weeks' pending reminders are preserved because unavailable source data cannot establish cancellation. These may become stale if the source remains unreachable; the user must refresh/check the public timetable.

Scriptable documents scheduling and pending/removal APIs but no separate notification permission-request method. The first actual schedule attempt after opt-in is the consent point; no fake permission notification is created. If no verified future selected lesson exists, there is nothing to schedule yet. Rejection is caught for the widget and reported in interactive settings. No real-device consent or delivery check has been performed.

## Privacy and acceptance

No developer backend, tracking, registration, secrets or university login. Runtime HTTPS is restricted to the public source; redirects are rejected and normal certificate checks stay enabled. Raw page scripts are data, never execution. Native UI and Shortcuts tests use mocks until owner-assisted iPhone acceptance. A browser screenshot is a layout approximation only. Version 1.0.0-rc.3 is a release candidate, not an accepted production release.

Official API references consulted: [Request](https://docs.scriptable.app/request/), [FileManager](https://docs.scriptable.app/filemanager/), [ListWidget](https://docs.scriptable.app/listwidget/), [Color](https://docs.scriptable.app/color/), [Device](https://docs.scriptable.app/device/), [Notification](https://docs.scriptable.app/notification/), [Alert](https://docs.scriptable.app/alert/).
