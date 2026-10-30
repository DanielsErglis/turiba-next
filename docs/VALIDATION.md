# Validation Report — 1.0.0-rc.4

Date: 2026-10-30. Environment: macOS with bundled Node.js v24.22.1. These are actual completed development checks, not claims of physical-iPhone verification.

## Automated results

- Full suite after rebuilding the single-file package: **89 passed, 0 failed, 0 skipped**.
- Core suite repeated with `TZ=America/Los_Angeles`: **14 passed, 0 failed, 0 skipped**. Riga results are independent of the host zone.
- Coverage includes real fixture integrity, multiple groups/weeks/branches, Saturdays, elective/subgroup continuation rows, exams, missing rooms, source changes, publication ambiguity, network/HTTP/timeout errors, DST gaps/overlaps, exact lesson-state boundaries, corrupted cache/settings, write errors, offline preservation, default OFF/ON reminder behavior, reconciliation, denial handling, secondary groups, setup, settings, deletion scope and generated-bundle execution with native API mocks.
- Renderer combinations: three languages × three theme modes × two widget sizes × seven primary temporal/setup/error states. Saved-data and coverage warnings have additional checks. This verifies code paths and content, not native typography/layout.
- Security checks on the built package: one approved HTTPS origin, no eval/new Function, no Node require calls, no iCloud settings, no global notification removal, no analytics strings, no research probe data and no matching common secret/private-key patterns. This is a bounded code review and automated scan, not an external security certification.
- A second build produced identical bytes; SHA256SUMS matched the actual script.
- Capture tooling syntax validated through Python AST parsing.

Commands used (the bundled absolute Node executable was used in this workspace):

```sh
node tools/build.js
node --test --test-reporter=spec tests/*.test.js
TZ=America/Los_Angeles node --test --test-reporter=spec tests/core.test.js
```

## Live source check

The real SourceClient ran with a development Node HTTPS adapter against the approved public university origin. Six requests retrieved five catalog sections and TVL2D1's current week. It returned 279 groups and 14 lessons for the expected 2026-10-26 week. Exact time/results are in LIVE_SOURCE_CHECK.json. This does not test Scriptable's native Request implementation or future website availability.

## Visual review

A browser approximation generated from the renderer tree was captured in isolated headless Chrome and visually inspected. A Medium layout issue that clipped room text was corrected and the revised screenshot inspected. The final preview is `.tmp/widgets.png`; it is a development artifact outside the installation package. Real iPhone type scaling, sizes, native stack layout and light/dark transitions remain unverified.

## Remaining acceptance gates

- Import and execute the script on the owner's actual iPhone/Scriptable version.
- Confirm Intl support, native HTTPS behavior, local-file replacement, all principal widget functions and layout, system/manual themes and languages.
- Confirm OFF does not prompt, explicit ON consent/denial behavior, exact scheduled-reminder content, disable cleanup, and coexistence with another Scriptable project's data/notifications.
- Confirm widget parameter isolation, offline behavior and Delete My Data.
- If using Shortcuts, test the sync shortcut and each configured automation on-device. No successful scheduled automation is claimed.
- Native refresh timing and notification delivery remain controlled by iOS. No final v1.0 acceptance until device results are recorded in IPHONE_CHECKLIST.md.

## rc.2 startup report follow-up

The owner reported rc.1 failing immediately after language selection. The underlying exception was not exposed, so the cause remains unconfirmed. rc.2 adds local diagnostics and a native dismissal grace period. New regressions cover still-dismissing controllers, group-form failure and language-save failures in the generated bundle. A macOS JavaScriptCore language-save/group-form probe passed with mocked Scriptable APIs. The actual iPhone has not passed the retry yet.

## rc.3 confirmed storage fix

Owner screenshot IMG_9303.PNG of rc.2 establishes a settings.save STORAGE_WRITE_ERROR caused by move refusing an existing destination. rc.3 removes that assumption and adds verified backup/install/rollback/recovery. The stricter native filesystem mock and six new regressions pass; the full suite has 84 passes and zero failures. Earlier statements that the cause was unknown describe the earlier rc.1/rc.2 investigation only. Native rc.3 setup success is still pending.

## rc.4 input capture retest

Owner IMG_9304.PNG shows a non-string native text result during group validation despite entering valid TVL2D1. rc.4 captures before the dismissal timer, awaits asynchronous results and can read the retained TextField.text reference. Five regressions pass; the suite has 89 passes and zero failures. Which native mechanism caused the non-string result is not established. Real-device group setup remains unaccepted until retested.
