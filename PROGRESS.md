# Project Progress

## Current state

Phases 0–4 complete. Current phase: Phase 5 — Testing & Optimization. This is a development checkpoint, not a v1.0 release.

## Completed

- Reviewed the full owner brief and created the normative English PROJECT_SPEC.md and AGENTS.md.
- Verified filesystem, terminal, Git 2.54.0, bundled Node v24.22.1, built-in test runner, public source HTTPS and isolated Playwright/Chrome preview.
- Confirmed DanielsErglis/turiba-next is private and exercised actual connector write/read-back in commit 7ea2f46a01dc6489fc8fcd80038160733864937e. Only that repository was accessed.
- Recorded exact permission evidence and limitations in PHASE_0_AUDIT.md.
- Committed Phase 0 requirements and access completion remotely in a987a72dec21a9bc31686afbb6377db27610cfe2.
- Captured 24 real public HTML responses with URL/time/SHA-256 provenance, including five academic catalogs, multiple groups, four branches, mobile comparison, week/session navigation, unknown and known-unpublished groups, and the currently link-free PIC page.
- Implemented a dependency-free, non-executing HTML tokenizer, catalog/branch parser, source-derived time grids, normalized lesson parser and injectable HTTPS source client.
- Covered electives, subgroup continuation rows, number-only exam categories, actual Saturday differences, long names, missing rooms, blank service rows, source annotations, changed HTML, unknown groups and the observed negative-week anomaly.
- Documented observations, unsupported evidence and safe publication semantics in docs/SOURCE_RESEARCH.md.

## Validation

- Phase 2: 50 automated tests passed, including Riga DST gaps/overlaps, exact status boundaries, calendar/Sunday behavior, choices, cache corruption/write failures and offline/unpublished preservation. A final service change makes forced synchronization refresh the catalog as well; it is included in subsequent full-suite runs.

- Phase 0 built-in Node runner probe: 1 passed, 0 failed.
- Isolated browser smoke check passed; this is not native Scriptable validation.
- Audit commit read-back matched submitted contents exactly.
- Phase 1 command: bundled Node executable with `--test tests/*.test.js`; 37 tests passed, 0 failed, 0 skipped.
- Fixture integrity assertions validated all 24 original byte counts and SHA-256 hashes.
- Python AST validation of tools/capture-fixtures.py succeeded. The expanded refresh script was syntax-checked; captures were obtained through the documented script and targeted sequential capture commands, not a second full refresh.

## Decisions and limitations

- Use dependency-free runtime modules and built-in Node tests where practical.
- Use GitHub connector commits for remote history; Git HTTPS authentication is unavailable. Do not request a broad token.
- Do not execute source-page scripts. Research real markup and link targets before writing the parser.
- iPhone rendering, notification permission/scheduling and Shortcuts require later physical-device evidence. No product completion is claimed.
- Account quota is not exposed; preserve a resumable phase record.
- GitHub connector commits are the actual remote Git history. Direct HTTPS Git authentication is unavailable, and this local directory is not yet a cloned Git checkout. Do not claim local git push or identical local Git history.
- The negative `ned=-1` link returned a future week even after session initialization. Returned dates are authoritative; mismatched expected weeks are rejected. Historical retrieval is not claimed.
- Catalog-known `DKL1V1` and an unknown code received the same unpublished message. Catalog verification is independent; empty/unpublished outcomes must not overwrite a previously published cache or imply a free day.
- PIC contained no group links in the captured response. No unobserved PIC timetable format is claimed as supported.
- Actual consultation rows were not observed; consultation/proposed-session behavior has synthetic tests. No native Scriptable transport, timezone-to-instant conversion, UI, cache or reminders are implemented yet.
- Runtime timeouts/redirect restrictions are a required injected-transport contract; Phase 1 tests verify options and typed transport errors, not actual iOS networking behavior.

## Remaining phases

3. Small/Medium renderer, themes and localization.
4. Setup/settings, electives, manual/optional automated synchronization, optional reminders and deletion.
5. Full automated checks, privacy review and performance improvements.
6. Build, release/user documentation and owner-assisted iPhone acceptance.

## Next action

Build Small/Medium widgets, shared localization and themes in Phase 3. Phase 2 now includes IANA Europe/Riga conversion, lesson/overlap states, per-group explicit choices, validated storage and a conservative synchronization service. Intl.DateTimeFormat.formatToParts support must be verified on the target Scriptable device; unsupported platforms fail explicitly instead of falling back to host time. Runtime storage and networking adapters follow in Phase 4.

## Phase 3 checkpoint

- Added shared LV/EN/RU translations, system language resolution, explicit and dynamic themes, and native Small/Medium renderer code.
- 53 tests passed before final layout adjustment; all supported state/language/theme/size combinations were exercised by renderer mocks.
- Generated and visually inspected a browser approximation of the actual renderer tree; corrected a Medium room clipping issue and inspected the revised screenshot at .tmp/widgets.png. This is not native iOS validation.
- Next action: Scriptable adapters, settings, opt-in reminders, safe group changes and data deletion.

## Phase 4 checkpoint

- Added FileManager.local storage with temporary-file replacement, HTTPS Request adapter with redirect rejection and timeouts, interactive localized setup/settings, explicit choices, group changes, deletion and a noninteractive Shortcuts sync entry point.
- Added opt-in primary-group reminder planning/reconciliation; OFF performs no notification calls in widget runs. Disabling, changing groups and deleting data clean only verified project-owned identifiers. New plans require fresh complete current-week coverage.
- Built dist/TURIBA NEXT.js as a single self-contained JavaScript file; no Node imports, external dependencies or raw research HTML are included.
- Full suite: 67 passed, 0 failed, 0 skipped, including application setup, group switching, deletion scope, notification OFF, secondary groups and generated-bundle execution with Scriptable mocks.
- Native iOS consent, scheduling, file replacement behavior and Shortcuts automation remain unverified until physical-device acceptance. Scriptable exposes scheduling but no separate documented notification authorization-request API; consent is expected on the first actual schedule attempt after opt-in, not via a fake reminder.
- Next action: edge-case review, deterministic packaging, privacy/security verification, user documentation and device acceptance checklist.
