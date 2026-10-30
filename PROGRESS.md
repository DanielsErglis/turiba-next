# Project Progress

## Current state

Phase 0 complete. Phase 1 starting. No product source implemented yet.

## Completed

- Reviewed the full owner brief and created the normative English PROJECT_SPEC.md and AGENTS.md.
- Verified filesystem, terminal, Git 2.54.0, bundled Node v24.22.1, built-in test runner, public source HTTPS and isolated Playwright/Chrome preview.
- Confirmed DanielsErglis/turiba-next is private and exercised actual connector write/read-back in commit 7ea2f46a01dc6489fc8fcd80038160733864937e. Only that repository was accessed.
- Recorded exact permission evidence and limitations in PHASE_0_AUDIT.md.

## Validation

- Phase 0 built-in Node runner probe: 1 passed, 0 failed.
- Isolated browser smoke check passed; this is not native Scriptable validation.
- Audit commit read-back matched submitted contents exactly.

## Decisions and limitations

- Use dependency-free runtime modules and built-in Node tests where practical.
- Use GitHub connector commits for remote history; Git HTTPS authentication is unavailable. Do not request a broad token.
- Do not execute source-page scripts. Research real markup and link targets before writing the parser.
- iPhone rendering, notification permission/scheduling and Shortcuts require later physical-device evidence. No product completion is claimed.
- Account quota is not exposed; preserve a resumable phase record.

## Remaining phases

1. Research actual HTML, navigation, groups, branches/time grids and publication ambiguity; capture fixtures; implement parser and tests.
2. Schedule engine, Riga time logic, storage/cache and group configuration.
3. Small/Medium renderer, themes and localization.
4. Setup/settings, electives, manual/optional automated synchronization, optional reminders and deletion.
5. Full automated checks, privacy review and performance improvements.
6. Build, release/user documentation and owner-assisted iPhone acceptance.

## Next action

Commit Phase 0 documentation, then research real source pages without executing their scripts. Record evidence and uncertainty explicitly.
