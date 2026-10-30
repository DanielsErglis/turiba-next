# TURĪBA NEXT — Master Project Specification v1.0

Specification date: 2026-10-30. Product: independent student timetable widget for Biznesa augstskola Turība. Platform: iPhone / iOS / Scriptable. Implementation: JavaScript. Development environment: Codex on macOS.

This is the complete normative English rendering of the owner-supplied brief, organized by its original sections. The owner-supplied Russian original is authoritative if a translation discrepancy is discovered. No product requirements have been waived. Priorities, in order: timetable correctness, security, privacy, stability, interface quality.

## 1. Role and working policy

Act as Lead Developer, Software Architect, Project Manager and QA Engineer. Deliver the complete project autonomously, from environment preparation to a usable Scriptable installation package. Own architecture, data research, tooling, permissions, implementation, UI, security, privacy, automated tests, defect correction, quality control, documentation, progress preservation and release packaging. Do not change agreed requirements, add paid services, or request excessive permissions.

Do not start implementation until Phase 0 is complete. Read the whole brief first, audit tools/access, present one consolidated missing-access request, then create PROJECT_SPEC.md, AGENTS.md and PROGRESS.md. Create the private GitHub repository only after appropriate authorization. Continue through phases without repeated general approval. Save and commit each completed phase. Preserve resumable progress when limits approach. Contact the owner only when necessary for permissions, material clarification, paid actions or physical-device checks. Never claim technical checks that were not performed.

### 1.1 Language policy

All internal source comments (including JSDoc, TODO, FIXME, NOTE, WARNING and HACK), technical notes, architecture decisions, documentation, AGENTS.md, PROGRESS.md, development records, commit titles/bodies, changelogs, technical release notes, developer diagnostics, test logs, GitHub technical issues and tasks must be in English. File, variable, function, class and module names must also be English. Communicate with the owner in Russian. Exceptions: localized LV/EN/RU product UI, official subject names in their original language, multilingual test data and optionally localized user instructions. Localized UI does not relax the internal language policy.

## 2. Phase 0 — Access and Permissions Setup

Before source implementation, determine and verify the tools, integrations, permissions and resources needed for the entire project. Audit local filesystem and project folder access; terminal commands; Git and Node versions; internet for documentation and public schedule; private GitHub repository creation/use; automated tests; Scriptable file builds; UI checks without an iPhone; and observable environment limits. Justify additional tools.

For each missing access, state tool/service, purpose, exact rights, whether an alternative exists, and how to grant it. Prefer native Codex/macOS/service permission flows. Give precise manual instructions when needed; never ask for passwords in chat. Use least privilege: project folder, local developer tools, documentation/dependency/schedule internet, one private repository, necessary temporary files. Do not request full Mac access, Apple ID, BATIS/university credentials, contacts, photos, location, mail or unrelated repositories. Retain approval for dangerous operations.

Report verified status for local environment, filesystem, terminal, Node/Git, internet, schedule source, GitHub, test environment and remaining limitations. Do not claim access until exercised. If required access is missing, explain and obtain an owner decision. Once requirements are verified and authorized, continue automatically without new general confirmation.

## 3. Product

TURĪBA NEXT is a working name for an independent student project. Show current public university timetable information at a glance: subject, room/location, start time, lesson status, and extra information when space allows, reducing repeated visits to BATIS or the website.

Primary flow: install Scriptable, import TURĪBA NEXT, choose a study group, optionally choose language/theme, add a Home Screen widget, and receive current lesson information. After setup, require minimal intervention. Support different Turība groups; never hard-code the product to TVL2D1. Group selection must require no JavaScript editing.

## 4. Schedule source and parser

Primary source: https://nodarbibas.turiba.lv/. Research entry point: https://nodarbibas.turiba.lv/pub_nod.asp?Grupa=TVL2D1. These are starting points, not an assumed API contract.

Research actual HTML, week navigation, group retrieval, date/time formats, encoding, room formats, mandatory lessons, electives, subgroups, exams, consultations, Saturday timetables, blank/additional rows, and possible mobile/desktop differences. Do not invent HTML or unknown URLs. Support important decisions with observed data.

Build a universal parser producing normalized lesson date, start/end time, subject, room, period number, group, subgroup, lesson type and source. Use Europe/Riga. Do not calculate lesson times solely from period numbers when official schedules have differing grids.

Distinguish actually empty schedules, unpublished schedules, unknown groups, network errors, HTML parse errors, source structure changes and missing rooms. Never invent lessons, rooms or times. Retain the last correct cache on failure and indicate possible staleness.

## 5. Study groups

On first launch, accept group entry/selection, validate syntax and existence in the source, fetch schedule, persist selection and render. Explain errors in the selected UI language. Allow group changes through settings at any time and update schedule, cache, widgets and enabled related reminders.

Support args.widgetParameter for different groups in separate widget instances. Keep the primary group in settings; notifications apply only to that primary group. Let users select their electives and subgroups where present. Do not assume every elective is compulsory or promise personal BATIS information absent from the public source.

## 6. Widgets and states

Provide Small (square) and Medium (rectangular) widgets. Small shows TURĪBA NEXT, subject, room, start time and status, emphasizing subject/room without clutter. Medium adds group, start/end time and brief next-lesson information when available.

Required states: upcoming (next lesson), soon (starts within 10 minutes), ongoing (currently in progress), next (following the current lesson), finished (today's lessons ended), noSchedule (no lessons), offline (saved data), error (information retrieval failure), setupRequired (select a group). Keep the current lesson visible until it ends.

Ideally update the visual status 10 minutes before a lesson. iOS does not guarantee exact WidgetKit/Scriptable refresh timing. Use documented refreshAfterDate, WidgetDate and local-cache mechanisms where appropriate; do not bypass system limits through undocumented methods. Basic next-lesson information must remain available at all times, not only during the final 10 minutes.

## 7. Design and university identity

Use a modern minimalist iOS design informed by Turība visual identity: readable large type, clear hierarchy, balanced proportions, little decoration, high contrast and glanceability. Do not shrink the university website into a widget.

Palette: Turība Blue #00AAE7, Deep Blue #00587E, White #FFFFFF, Black #000000, Grey #809699. Additional related shades may support contrast. Use the iOS San Francisco system font; do not package commercial font files.

Do not distribute official university logos without necessary permission. Include an independent student project notice, for example: “Neoficiāls studentu projekts. Nav saistīts ar Biznesa augstskolas Turība administrāciju.” Check name/symbol usage requirements before public distribution. Publication requires owner authorization.

## 8. Themes

Settings provide system (default, follows iPhone), light and dark modes. Use documented Scriptable mechanisms including Color.dynamic(). Manual choice overrides the system. Theme changes must not force schedule downloads. Verify both widget sizes in all three modes.

## 9. Localization

Provide Latvian (lv), English (en), Russian (ru), and system language mode. Default to a supported device language, otherwise English. Translate widget labels, settings, errors, reminders, lesson statuses and in-product instructions. Do not automatically translate official subject names. Keep translations in a separate localization module; account for long Russian text and Latvian diacritics.

## 10. Optional notifications

Notifications must be OFF by default; the widget must function fully without them. Users can enable/disable reminders and select 5, 10, 15 or 30 minutes before class; default when enabling is 10 minutes.

OFF: do not request system consent, create reminders or run planning. Continue synchronization and widgets. Turning previously enabled reminders OFF must remove pending TURĪBA NEXT reminders.

ON: request necessary iOS consent and schedule local reminders before lessons. Reconcile pending reminders after detecting schedule changes. Do not touch notifications belonging to other Scriptable projects. Permission denial must not break the widget.

## 11. Security and privacy

Use Privacy First / Zero Telemetry. No developer server collecting data, registration, accounts, analytics, advertising trackers, remote logging, personal-data collection systems or unnecessary external SDKs.

Runtime requests go to the public Turība timetable through HTTPS. Never send settings to third-party servers. Justify any additional network dependency. Do not execute code from schedule HTML. No eval() or similar execution of remote/untrusted code.

Persist personal settings with FileManager.local(); no iCloud configuration by default. Store only group, electives/subgroups, theme, language, reminder settings, schedule cache, service reminder identifiers and last-sync time. Local storage must not be misrepresented as cryptographic encryption.

Provide Delete My Data: remove settings, cache, selected group and project pending reminders, then return to initial setup. Preserve unrelated data.

Keep development source in a private GitHub repository. No public repository without approval. No secrets in user files. Distributed Scriptable JavaScript cannot be hidden completely from recipients; obfuscation is not a substitute for security.

## 12. Cache and synchronization

Persist timetable on-device. Offline, show last valid data and warn about age when necessary. Never replace good cache with empty data after a failed request.

Consider synchronization at 07:00, 12:00 and 20:00. Apple Shortcuts may support scheduled refresh only if testing establishes it works. These are suggested times, not iOS guarantees. Provide manual sync and minimize university-server requests.

Handle timeouts, invalid responses, corrupted cache, absent schedules, data-format changes, group changes, week transitions, and daylight-saving changes.

## 13. Architecture

Provide independent logical modules: Source Client, Parser, Schedule Engine, Storage, Localization, Theme Engine, Widget Renderer (Small/Medium), Notifications, and Settings/Setup. Choose a maintainable file layout and Scriptable packaging approach. Avoid duplicated logic and single-group coupling. Target Scriptable-compatible JavaScript. Node.js serves tests/builds only and is never an iPhone dependency. Follow the English naming/comment policy.

## 14. Tests and quality assurance

Automate checks for multiple groups/weeks/weekdays, Saturdays, exams, electives, long names, missing rooms, repeated periods, time zones, date boundaries, network failures, incomplete HTML, damaged cache and no schedule. Cover all three languages, all three theme modes and both widget sizes. Thoroughly verify upcoming, soon, ongoing and finished. Test reminder ON and OFF separately.

Security checks: no excessive permissions, configuration sent to outsiders, secrets, third-party analytics or remote code execution; verify data deletion.

Prepare physical-iPhone test instructions. Do not claim actual native rendering has been tested without device evidence. Complete available independent checks first; request only minimal owner participation for real-device acceptance.

## 15. Installation and distribution

Provide a simple package enabling a non-programmer to install Scriptable, import required files, run setup, choose a group, and add Small or Medium widgets. Deliver ready Scriptable files, installation/setup/update instructions, troubleshooting, Privacy Policy and README. No standalone App Store application is needed for v1. Internal technical documentation is English; user instructions may be localized.

## 16. Development phases

| Phase | Scope |
| --- | --- |
| 0 — Access & Permissions | Tool/access audit, permissions, environment checks before programming. |
| 1 — Research & Data | Real HTML, groups/weeks, parser and tests. |
| 2 — Core Engine | Lesson logic, local cache, temporal states, multiple-group configuration. |
| 3 — UI & Design | University-inspired visual system, two sizes, Light/Dark/Auto, LV/EN/RU. |
| 4 — Settings & Automation | Setup/settings, group changes, electives, sync, optional reminders. |
| 5 — Testing & Optimization | Automated tests, defects, optimization, privacy audit. |
| 6 — Release Preparation | Installation package, documentation, first release. |

## 17. Progress and limits

After every completed phase: run tests, save changes, create a Git commit, update PROGRESS.md, record known issues and the next step. PROGRESS.md must track current phase, completed and remaining tasks, actual test results, known defects, technical decisions and next action. All internal records/commits/changelog are English.

If Codex limits are exhausted, save progress while possible, preserve uncommitted changes and a clear resume state, do not buy credits or switch to paid external APIs. Resume from saved state on a later launch or a confirmed supported continuation mechanism. Do not promise automatic resumption without it.

## 18. Owner involvement

Contact the owner only for new permissions, inability to meet a material requirement, a fundamental architectural change, paid services, physical iPhone actions, indispensable missing information, public publication approval or a problem that cannot safely be solved independently. Do not repeat answered questions or stop for routine decisions. Do not publish, connect third-party services or perform high-risk actions without appropriate permission. Owner-facing communication is Russian.

## 19. Definition of done

v1.0 is ready only when: group selection requires no code edits; square/rectangular widgets correctly show subject/room and current/next lessons; every required state exists; system and forced Light/Dark themes work; LV/EN/RU work; reminders default OFF and widget works independently; enabled reminders schedule correctly; local cache/offline handling work; developer collects no data; permissions are minimal; settings and installation instructions exist; automated tests pass; core functions are confirmed on a real device; limitations are documented; all internal comments/technical records obey English policy. Do not mark the project fully verified before required real-device tests finish.

## 20. Final deliverables

Deliver the complete project and source; working Scriptable package; two widget sizes; settings UI; three languages; automatic/manual themes; configurable optional reminders; sync/cache; automated tests/results; installation and security documentation; a private GitHub repository with development history; and a readiness/remaining-limitations report. All code must follow the language policy.

## 21. Initial action and continuation

The first action is Phase 0, with no source implementation: analyze requirements, determine tools/permissions, audit environment, request missing access, explain connection steps, verify actual access, and record results. Only then begin implementation. The objective is a complete, stable, secure and convenient product with minimal owner involvement and no compromise in schedule correctness or privacy.

## Owner amendment — 2026-10-31 visual revision

The owner requested the supplied reference composition: larger subject/room typography, a separate room panel in Medium, and a readable next-subject row with the start time aligned right. Remove the unofficial-student-project label from widgets; provenance remains in About/Privacy. This explicit owner amendment supersedes any requirement to place the independent-project notice on the widget itself. Preserve timetable semantics, uncertainty indicators, settings and privacy.
