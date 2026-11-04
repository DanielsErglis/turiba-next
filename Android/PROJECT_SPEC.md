# Android project specification

Normative English requirements derived from the owner's complete attached Android brief, explicitly adopted in chat on 2026-11-04. This specification supplements the existing iPhone specification; it does not replace or reopen accepted iPhone work. No scope reduction is authorized.

## 1. Scope and priorities

Build an installable native Android application with adaptive square/rectangular widgets, local cache, settings and optional reminders, preserving the existing product's functional rules and visual character. Priorities: timetable correctness, privacy/security, stability, ease of installation/use, interface quality, battery/network economy. Do not degrade iPhone. Communicate in Russian; engineering material in English; user instructions/UI may use LV/EN/RU.

## 2. Workflow

Phase 0 audits the actual branch/head, current source/build, root requirements/progress/architecture/tests, permissions and tooling before source implementation. Prepare architecture, acceptance gates and limitations first. Continue autonomously through authorized work. Ask only for indispensable information, new permissions, material requirement/architecture changes, paid services, public distribution or physical-device checks. No global tools/system changes without necessity; prefer project-local dependencies. Every completed phase needs actual checks, updated Android progress and a commit. Never claim unperformed checks.

## 3. Architecture

Kotlin; Compose app; Glance widgets; Room structured schedule/cache; DataStore settings; WorkManager synchronization; AlarmManager/Notifications when justified. Check official documentation/version compatibility. Evaluate RemoteViews if Glance cannot meet a specific requirement and explain the choice. No Flutter, React Native, WebView or embedded JS engine without evidence and approval of a material architecture change. Separate Source Client, HTML Parser, Schedule Engine, Time/Calendar, Storage, Settings, Localization, Theme, Widget Renderer, Background Sync and Reminders. Keep domain logic independent of Android/UI. Keep Android in its own directory and share verification data.

## 4. Compatibility

Baseline minSdk 29 (Android 10), subject to technical audit. Choose compile/target SDK from available stable SDK and current requirements. Distinguish planned compatibility, executed emulator checks and physical-device evidence. Planned families: Pixel/standard Android; Samsung One UI; Xiaomi/Redmi/POCO HyperOS and relevant MIUI; OnePlus OxygenOS; OPPO ColorOS; realme UI; vivo. Evaluate Huawei/Honor by actual model/OS; HarmonyOS NEXT is a separate platform. Never claim manufacturer-wide compatibility from one model.

## 5. Behavior parity

Support multiple groups, primary app group and per-widget group, manual elective/subgroup choices, current/next lessons, upcoming/soon/ongoing/finished/noSchedule/setupRequired/error, independent offline/stale/incomplete flags, local cache/manual sync, LV/EN/RU, System/Light/Dark, optional reminders and Delete My Data. Use common inputs and expected outputs to compare Kotlin with JavaScript. Explicitly test dates, collation, JSON escaping, Unicode, choice keys and reminder identifiers.

## 6. Evidence and parsing

Source: https://nodarbibas.turiba.lv/. Reuse captured public HTML and provenance. Refresh only bounded requests when necessary. Record URL/retrieval date/hash/provenance/limitations for new fixtures; label synthetic cases. Never execute source JavaScript or invent APIs, lessons, rooms or times. Distinguish published, verified published day with no selected lessons, unpublished/ambiguous, unknown group, transport failure, parse failure and changed structure to available evidence. Preserve valid cache on failure. Respect branch/Saturday grids, Sunday navigation and actual returned week dates. Reject malformed/changed HTML; an auto-repairing parser must not silently produce plausible schedules.

## 7. Time

Use java.time and Europe/Riga regardless of phone time zone. Explicitly reject DST gaps and unresolved repeated wall times; test day/week/month/year boundaries. Soon starts ten minutes before start. Ongoing includes start and excludes end. Keep current until end; expose next known lesson in advance. Expose overlapping selected lessons. Unpublished weeks do not establish absence of lessons.

## 8. Widgets

Large official subject title, readable room, separate room card in rectangular layout, next subject/time footer, restrained blue/cyan palette, system fonts. Square/rectangular adapt to actual launcher size/grid, density, system padding/corners, font scale, long subjects/rooms and Latvian/Russian. Persist instance group by appWidgetId and handle addition, reconfiguration, deletion/restoration. Tapping opens matching app screen; provide manual refresh. No university logo/commercial fonts. Keep project provenance in About/Privacy, not widgets.

## 9. Setup and settings

Flow: install → choose language → enter/validate group → select alternatives → add widget. No code editing. Settings: main group, widget instances, System/LV/EN/RU, System/Light/Dark, manual sync, last successful sync, meaningful errors, reminders, About/Privacy and Delete My Data. Do not translate official subject names. Theme changes must not fetch.

## 10. Cache/background

Separate network sync, local state calculation, widget rendering and reminders. No downloads at every state boundary. Coalesce identical group/week requests and exclude concurrent duplicates; bounded retries/backoff; keep last valid data; no network on UI thread. Account for Doze/App Standby/OEM limits. Periodic WorkManager is not exact; no permanent foreground service solely for widgets. Explain any boundary update strategy and actual OS timing limits.

## 11. Reminders

OFF by default. OFF requests no consent, schedules nothing and does not run reminder planning; app/widgets continue. Explicit ON requests necessary permission in context, supports 5/10/15/30-minute leads, uses only main-group selected verified non-provisional lessons, deduplicates and reconciles changed time/room/selection. Handle denial/revocation. Separate POST_NOTIFICATIONS from exact-alarm special access; no privileged permission speculatively. Offer honestly delayed delivery when exact mode is unavailable. Keep own registry and cancel only project alarms/notifications. Handle reboot/update/time change/permission recovery and document force-stop limitations.

## 12. Privacy and deletion

No own server, registration, analytics, ads, trackers, remote logs, credentials or remote code. Exact HTTPS host validation using URL APIs; reject redirects/cleartext; preserve TLS verification. Internal app storage only; no unrelated permissions. Explicitly disable default cloud backup/transfer of settings/cache. Do not call storage cryptographically encrypted. Delete stops owned work, cancels owned reminders, removes settings/choices/cache/service records, returns widgets to setup, prevents in-flight writes from resurrecting data, and preserves unrelated data.

## 13. Verification

Cover actual multiple groups/weeks, branches/Saturday, exams, alternatives, missing rooms, duplicate periods, malformed/changed HTML, unknown/unpublished groups, network/timeouts/cache corruption, Riga DST/state boundaries, locales/themes/sizes, multiple widgets, notifications OFF/ON/denial, deletion, reboot/update, concurrency/cancellation. Run appropriate unit/integration/UI/instrumented tests, lint and builds. Emulator/screenshots do not prove physical behavior. Minimum physical gate: Pixel, Samsung, Xiaomi, including overnight idle without app opening, measured timing/resource limits. Other families require available devices.

## 14. Repository and delivery

Only DanielsErglis/turiba-next is authorized. **Owner amendment 2026-11-04: use the existing public repository and add Android/.** This overrides the original private-repository clause. Public repository authorization does not imply stores/public hosting/release distribution. Inspect remote before updates, preserve owner changes, use a separate Android branch and obtain approval before merging substantial changes into main. Prepare signed release APK for private testing. No signing keys/passwords in Git/chat/logs; securely retain update continuity and explain owner backup. No new paid services/accounts without approval.

## 15. Phases

0 Audit & Architecture; 1 Data & Core; 2 Storage & App; 3 Widgets; 4 Background & Reminders; 5 Verification; 6 Delivery. Update Android progress after each with commands/results/limits/next action and commit. Preserve iPhone history.

## 16. Completion gates

User installs without script runtime; selects group without code; both widgets readable/functional with independent groups; verified timetable/state correctness; explicit alternatives; resilient offline cache; all locales/themes; reminders optional/OFF/permission-safe; complete verified deletion; reproducible build; updates preserve settings; iPhone preserved; available automated checks performed; agreed physical acceptance complete; honest limitations. No full-readiness claim before mandatory physical checks.

## 17. Initial handoff

Start with Phase 0 findings, concrete architecture, phase plan and genuinely necessary owner requests. Resolve indispensable prerequisites before implementation and then proceed autonomously.
