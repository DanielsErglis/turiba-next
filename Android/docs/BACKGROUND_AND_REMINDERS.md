# Background work and reminder decisions

Implemented in Phase 4, 2026-11-04. Timing and OEM behavior still require Phase 5/device acceptance.

## Four separate operations

1. Source synchronization: unique WorkManager network work, connectivity constraint, per-group coalescing, shared catalog cache and a 15-minute attempt throttle. Explicit manual refresh bypasses the throttle; joining a throttled automatic flight cannot consume a manual request without fetching. Hourly periodic work has an initial one-hour delay, so creating it from an appearance change does not cause a download. Foreground/process/boot restoration separately requests a one-time sync for configured groups.
2. Local state: Riga lesson/soon/end/midnight and first stale-marker boundaries are computed from cached lessons. Boundary work has no network constraint because it makes no network request. It reschedules itself without cancelling its own running job.
3. Widget redraw: immutable local snapshots, independent group mappings and live revision observation. Provider updatePeriodMillis remains a separate 30-minute OS-controlled fallback. Rendering never fetches or plans reminders.
4. Reminder delivery: scoped inexact AlarmManager PendingIntents and Android notifications, independent of widget refresh or periodic network cadence.

Network retries are limited to two retries after an initial transient-error run, with exponential WorkManager backoff. Parser/unknown-group errors are not retry storms. Group codes are not stored in WorkManager input data; workers read current configured groups and carry a deletion-generation token. No permanent foreground service is used.

## OFF and consent

OFF is the DataStore default. No consent request is made on startup, widget render, local boundary or background restoration. The reminder coordinator exits before permission inspection, registry enumeration, plan construction or platform scheduling. Only explicit ON in the primary-group screen requests POST_NOTIFICATIONS on Android 13+. Denial/revocation leaves the schedule usable; reconciliation disables reminders and cancels owned pending work. An explicit OFF/Delete action may clean earlier owned reminders; cleanup is not new planning.

There is no USE_EXACT_ALARM or SCHEDULE_EXACT_ALARM permission and no exact-alarm settings request. This candidate deliberately uses inexact delivery. Android/Doze/App Standby/OEM restrictions can delay it. A reminder is suppressed when its lesson has already started; missed alarms are not replayed in bursts after force-stop. WorkManager cannot promise an exact redraw/network time. Physical overnight timing and battery/resource observations remain pending.

## Ownership, confirmation and reconciliation

Only the primary group's explicitly selected, published, non-provisional lessons can enter a new plan, from freshly verified weeks. Leads are 5/10/15/30 minutes, horizon seven elapsed days, maximum 32 planned lessons. IDs and body fingerprints match the original JS compact JSON/UTF-16 hash rules. PendingIntents are immutable and have explicit receiver/data identities. Registry records carry both project owner and identifier prefix; cancellation touches only those records and owned active notifications. Delete also removes the one owned notification channel.

Unpublished/failed refreshes cannot establish a cancellation: existing reminders from the last verified published schedule are preserved unless a live user selection/group change, confirmed source change, expiration or deletion invalidates them. They can become outdated if the source remains unavailable; no new unverified plan is inferred. Delivery rechecks current main group, explicit choices, non-provisional cached lesson, generation, time, permission and fingerprint. Posting is idempotent and serialized with deletion. An OS-accepted post is not proof of sound, visible delivery or user acknowledgement.

Boot, package replacement, system-time/time-zone changes and foreground restoration re-establish configured work and re-arm confirmed future registry entries. Already posted entries are not re-posted. After user force-stop, Android prevents normal background recovery until the app is launched again; past-due alarms are not promised as catch-up delivery. Real reboot/update/force-stop/permission UI tests and OEM restrictions must be measured separately.

## Deletion and failures

Delete first increments a durable generation under the repository mutation lock, clears schedule/catalog/sync/widget mappings, cancels shared in-flight jobs, clears settings, cancels only tagged project WorkManager jobs and owned alarms/notifications/channel, then clears the reminder registry. A confirmed deletion is non-cancellable by its UI caller, so rotation/closing cannot interrupt it between database and settings cleanup. Notifications use the same lock; an earlier post is cancelled by deletion, and a later post sees OFF/new generation.

A blocked transport may take its bounded timeout to return after cancellation, but its result cannot restore deleted data and no subsequent request is started for the obsolete generation. The small generation marker is retained to enforce this barrier; it contains no group, selections or timetable. Unrelated Scriptable files, app data, notification tags and work tags are not touched. Cross-store writes are serialized and failure-reported, not claimed to be a crash-atomic transaction across Room/DataStore/Android services.

Background exceptions are represented as an in-memory local diagnostic code rather than crashing an uncaught supervisor child or uploading a log. A storage failure still requires user recovery and is not reported as successful deletion.

## Executed verification

- Core: 11 JUnit tests, including the 978 state cases, all captured schedule/catalog fields, UTF-16 choice/identity checks and 48 JS/Kotlin lead/language/selection reminder-plan cases.
- App transport: four unit tests covering host/redirect/content/body/timeout/UTF-8 behavior.
- AOSP API 36 emulator: 17 instrumented tests passed (two migration/scoped-work tests, six controlled-platform reminder tests, eight storage/concurrency/deletion tests, one 50-case native View rendering test).
- Final command: `tools/gradle-local.sh :app:connectedDebugAndroidTest :app:lintDebug :core:test :app:testDebugUnitTest`; successful. Up-to-date JVM tasks use their previously executed successful results. Lint: zero errors, one informational newer-version warning for serialization BOM 1.8.1.

Failures found and fixed: Room migration helper's JSON 1.8.1 was forced to app serialization-core 1.7.3 by consistent test resolution; aligned the app's existing serialization runtime through BOM 1.8.1 and retained the actual migration test. Clean-install notification delivery was incorrectly considered obsolete with an untyped zero default in a Long generation comparison; explicit Long defaults and typed delivery outcomes fixed it, with both delivery and delete/post regressions passing. These were real failing runs, not waived checks.

The test-only OfflineTestApplication disables automatic restore, so fixture-based instrumentation does not contact the timetable server. Controlled ReminderPlatform tests establish reconciliation/race behavior; they do not establish real AlarmManager timing or physical notification delivery.

Official references: [WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent), [alarms](https://developer.android.com/develop/background-work/services/alarms), [notification runtime permission](https://developer.android.com/develop/ui/views/notifications/notification-permission).
