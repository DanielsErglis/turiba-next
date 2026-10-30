# Changelog

## 1.0.0-rc.3 — 2026-10-30

- Owner screenshot of rc.2 identified settings.save / STORAGE_WRITE_ERROR: native move refuses an existing destination. The previous overwrite assumption and permissive filesystem mock were incorrect.
- Added verified temporary writes, backup-before-install, absent-destination moves, rollback and interrupted-write recovery. No settings reset or new permission is required.
- Changed the application filesystem mock to reject existing destinations and added six focused replacement/recovery regressions. Full suite: 84 passed, 0 failed.
- The code-level failure is reproduced and corrected under the stricter model. Successful native iPhone retest remains pending.

## 1.0.0-rc.2 — 2026-10-30

- Investigated owner-reported rc.1 failure immediately after language selection. The screenshot did not expose the underlying exception; no root cause is claimed.
- Added on-device stage/code/cause diagnostics without remote logging, preserving native local-storage failure details and redacting local paths.
- Added a native-dialog dismissal grace period before the next controller, plus regression tests for a still-dismissing controller, group-form failure and language-save failure.
- Removed the misleading generic claim that a valid timetable necessarily existed on first setup. Error rendering no longer depends on a functioning time-zone provider.
- 78 automated tests passed. A setup language-save/group-form probe also passed in macOS JavaScriptCore with mocked Scriptable APIs; real iPhone retest remains required.

## 1.0.0-rc.1 — 2026-10-30

- Completed access verification and private repository read/write proof before implementation.
- Added evidence-based public timetable parsing, five-section group catalog and four branch/day time grids.
- Added Riga-aware lesson states, explicit course/subgroup selection, conservative local caching and validated settings.
- Added localized Small/Medium widgets with system/manual themes.
- Added Scriptable setup/settings, manual sync, optional Shortcuts sync, project-scoped data deletion and opt-in reminders.
- Added deterministic single-script build, installation archive, privacy/user documentation and a physical-device checklist.
- Development validation: 73 automated tests passed, 14 core tests passed under an alternate host time zone, live source client check passed, browser renderer preview inspected and archive contents verified.
- Physical iPhone behavior, real notification consent/delivery and optional Shortcuts automations remain pending. This is a release candidate, not final v1.0 acceptance. No public release was performed.
