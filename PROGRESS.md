# Project Progress

## Current state

Phases 0–5 development checks complete. Phase 6 installation candidate and documentation prepared. **rc.2 iPhone diagnostics identified move-to-existing-file failure. rc.3 fixes replacement and recovery; awaiting native retest** before v1.0 can be accepted. No public release has been performed.

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
- Actual consultation rows were not observed; consultation/proposed-session behavior has synthetic tests. Native behavior remains unverified until device acceptance.
- Runtime timeouts and redirect rejection are now implemented in the Scriptable adapter and verified with mocks; actual iOS networking behavior is not claimed.

## Remaining phases

6. Build, release/user documentation and owner-assisted iPhone acceptance.

## Next action

Owner: import dist/TURIBA NEXT.js, perform the initial smoke checks in docs/IPHONE_CHECKLIST.md and report iPhone/iOS/Scriptable versions plus actual results. Developer: reproduce/fix any failures, update acceptance evidence and package, then complete remaining native/reminder checks before final sign-off. No additional broad permissions or paid tools are needed. Do not mark final v1.0 accepted until device evidence exists.

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

## Phase 5 checkpoint

- Full suite: 73 passed, 0 failed, 0 skipped. Alternate-host-zone core suite: 14 passed, 0 failed, 0 skipped.
- Fixed partial-week reminder behavior: a verified fresh week can reconcile its own reminders even when another week is unpublished; unverified weeks' pending reminders are preserved. Forced failed refreshes cannot reuse an earlier verification marker.
- Confirmed that native notification rejection cannot break widget rendering and theme-only settings changes cause no timetable download.
- Live SourceClient check succeeded with six HTTPS requests, 279 catalog groups and 14 TVL2D1 lessons for the expected week. This was Node on macOS, not native iOS.
- Deterministic build/checksum and bounded package privacy/security checks passed. See docs/VALIDATION.md and docs/ARCHITECTURE.md for exact evidence, operational limits and remaining gates.

## Phase 6 candidate checkpoint

- Prepared dist/TURIBA NEXT.js and deterministic installation archive dist/TURIBA-NEXT-1.0.0-rc.1.zip, with script/archive checksums and a per-file release manifest.
- Verified the archive CRC, exact nine-entry set and exact extracted bytes against source package inputs. No research HTML, developer test fixtures, credentials or external runtime dependencies are packaged.
- Added installation/setup/update instructions in Russian (permitted user-documentation localization), English privacy/troubleshooting/readiness documents, changelog and a pending-only physical-iPhone checklist.
- Native acceptance has not been performed. Scriptable permission/scheduling, native layout and optional automations remain pending and are not represented as passed.
- All phase changes are being saved through the private GitHub connector; remote read-back and repository privacy are checked at handoff. The remote history is authoritative; no local cloned Git checkout is claimed.

## Verified candidate handoff

- Candidate package commit: 978fc54635084822dd9668206ca18ceee9cc9e34.
- Final repository metadata confirmed visibility private and push permission true for DanielsErglis/turiba-next.
- Exact remote read-back matched local PROGRESS.md, docs/INSTALL_RU.md, the complete built Scriptable file and the complete binary installation archive at the candidate commit.
- Script SHA-256: 1dc2bb5e78fc6fdbbf565cac063618cd8f27f8d6bb333470cb6676d1831fac6f.
- Archive SHA-256: 851775041727c3b1228c4aace92af0fc67b35e4ad4f2f12bff1541d8dce41ded.
- Remaining required work depends on actual iPhone results. No device test, notification delivery or optional automation is marked passed. Continue by reviewing the owner's initial smoke-check report, then fix/retest any native differences and complete the checklist before final acceptance.

## Native startup failure follow-up — 1.0.0-rc.2

- Owner supplied an iPhone screenshot of the generic failure alert and confirmed it appeared immediately after choosing a language. Import/execution and language-selection reachability are evidenced; successful setup is not. Device model/iOS/Scriptable versions remain unknown.
- rc.1 suppressed the underlying exception, so neither a network failure nor a storage/UI failure can be confirmed from the screenshot. Do not describe the underlying cause as diagnosed or the iPhone issue as resolved.
- Added local stage/code/native-cause diagnostics, local-path redaction, a 350 ms native-dialog dismissal grace period, and failure rendering independent of time-zone calculations. No telemetry or new permissions were added.
- Added regressions for a dismissing native controller, native group-form failure after language selection, and storage rejection during language persistence in the actual generated bundle. Full suite: 78 passed, 0 failed.
- Ran a JavaScriptCore setup language-save/group-form probe on macOS using mocked native APIs: passed. This is an additional engine check, not an iPhone UI/storage test.
- Next owner action: replace only the script code with rc.2 and retry setup. Do not delete local data. If it fails, report the displayed Build, Stage, Code, Message and Cause. Continue from that actual exception rather than guessing.

## Confirmed native storage defect — 1.0.0-rc.3

- Owner screenshot IMG_9303.PNG shows Build 1.0.0-rc.2, Stage settings.save, Code STORAGE_WRITE_ERROR, and a native cause stating the temporary settings file cannot be moved because an item with the same name already exists. This establishes the failed overwrite-by-move operation; no network diagnosis is involved.
- Previous native FileManager documentation says move replaces existing destinations, but observed iPhone behavior contradicts it. The old test mock also permitted replacement and missed this behavior. It now rejects existing destinations.
- Implemented verified temporary writes, moving the current file to an absent backup path, installing to an absent target, verifying installed bytes, rollback on failure, and recovery from a retained backup before reads/cache enumeration. All paths remain confined to the local project directory.
- Added six regressions covering repeated language/group saves, install failure rollback, retained backup after recovery failure, interrupted week recovery, truncated temporary data and installed-byte verification failure. Full suite: 84 passed, 0 failed.
- rc.3 code fixes the demonstrated operation under the strict mock; actual native success has not yet been confirmed. Next owner action: replace the script code with rc.3, keep existing data, and retry language/group setup.
