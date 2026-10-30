# Project Progress

## Current state

Phases 0 and 1 complete. Next phase: Phase 2 — Core Engine. This is a development checkpoint, not a v1.0 release.

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

2. Schedule engine, Riga time logic, storage/cache and group configuration.
3. Small/Medium renderer, themes and localization.
4. Setup/settings, electives, manual/optional automated synchronization, optional reminders and deletion.
5. Full automated checks, privacy review and performance improvements.
6. Build, release/user documentation and owner-assisted iPhone acceptance.

## Next action

Start Phase 2 with Europe/Riga wall-time/instant conversion and DST tests, then lesson-state boundaries, group/elective selection and conservative local-cache policy. Reuse the tested parser and preserve explicit publication uncertainty. Keep notifications OFF by default when runtime settings are introduced. Obtain real iPhone acceptance only after independent checks and package preparation.
