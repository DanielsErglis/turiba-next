# Android progress

## Current state — 2026-11-04

Phases 0–4 committed through 0a3be64027cd850862d126d6370569b1ed672fc1. Phase 5 automated verification and private candidate preparation are recorded below; mandatory physical Pixel/Samsung/Xiaomi and overnight acceptance are still pending. Phase 6 final acceptance is not complete. Android work stays in Android/ and android-development, based on unchanged main feebd7e129a3d071e731e14e665df92da00fb0a7.

## Owner decisions

- Native Android development requested, rather than copying the iPhone project.
- Existing PUBLIC DanielsErglis/turiba-next repository explicitly authorized on 2026-11-04. Keep Android in its own directory. No change to visibility; no store/public-hosted APK distribution authorized.
- Android SDK license acceptance explicitly authorized on 2026-11-04 for project-local tooling. The owner separately authorized android-sdk-arm-dbt-license and API 37 verification.

## Phase 0 results

- Reviewed complete brief, current requirements/progress/architecture/research/source/tests and iPhone build.
- Authenticated GitHub reads confirmed main/head and exact selected-file Git blob matches; android-development created from that head. Local directory is not a Git checkout; connector history will be authoritative.
- Existing JS suite rerun: 92 passed, 0 failed, 0 skipped using bundled Node and `--test tests/*.test.js`. This does not validate Kotlin/Android.
- Recorded original iPhone file hashes, environment/download evidence, architecture and phase/device acceptance matrix.
- Project-local verified JDK 17.0.21+9 and Gradle 9.6.0 execute successfully. Android CLI help executes. SDK platform/build-tools/adb installation started; not yet verified. Android Studio absent at probed path; no emulator/physical checks.
- Sandbox network failed DNS; approved escalated access to official tool distributions works. Toolchain stays in ignored .toolchain; subsequent Android CLI commands disable metrics.

## Next action

Hand the signed local private candidate and RU/LV/EN guides to the owner for the mandatory physical checks in docs/DEVICE_ACCEPTANCE.md. Record actual OEM/overnight results, fix observed failures and only then close Phase 5 and final Phase 6 delivery. No automatic continuation is configured. Do not merge into main or publish the APK.

## Phase 1 — Data & Core

- Installed SDK Platform 37.0, build-tools 36.0.0 and platform-tools 37.0.1 through the official CLI with --no-metrics. `adb version` succeeds. JDK/Gradle remain project-local. The owner-authorized SDK license is recorded by the SDK installation.
- Added pure Kotlin/JVM models, strict non-executing tokenizer/catalog/schedule/time-grid parser, explicit Riga gap/overlap handling, selection/state engine, exact-host URL validation and UTF-16 reminder fingerprints. No Android imports/runtime JavaScript engine or new core runtime dependency.
- Offline JS generator uses unchanged original modules and 24 captured fixture bytes. Generated expectations are explicitly labeled; 18 schedule cases, all 279 catalog groups and 978 boundary/selection/state cases compare exactly with Kotlin. State corpus uses gzip-compressed base64 TSV to preserve exact strings without introducing a production JSON dependency.
- `tools/gradle-local.sh :core:test`: 8 JUnit tests passed, 0 failed, including all parity cases, original SHA-256 manifest integrity, malformed/changed HTML, unknown group/week mismatch, Riga DST/alternate host zone, Unicode/JSON keys/reminder hashes and unsafe URLs. The initial run found one-millisecond early SOON due to duration truncation; fixed by comparing exact Instants, and the rerun passed. Generator setup errors were corrected before the successful run; no expected data was weakened.
- Gradle needs approved execution outside the sandbox because its local lock socket is denied inside. This is distinct from the earlier DNS issue. No Android build/device result is implied by JVM success.
- Gradle wrapper generated with the official distribution checksum. Parser/time/state core compiles under Kotlin 2.2.10/JDK 17/Gradle 9.6.0. App dependency compatibility remains to be proved.

## Remaining

5. Verification, including physical Pixel/Samsung/Xiaomi and overnight idle.
6. Signed private-test APK and RU/LV/EN delivery/acceptance.

## Phase 4 — Background & Reminders

- Added pure reminder planning with exact compact JSON/UTF-16 identities and a generated 48-case corpus comparing every lead/language/selection combination to unchanged JS. Core suite now has 11 tests; all passed after matching the existing English missing-room label. Earlier initial compiler inference errors were fixed with explicit lazy-property types.
- Added Room schema v2 reminder registry plus explicit 1→2 migration, owned immutable PendingIntents, inexact AlarmManager delivery and independent POST_NOTIFICATIONS opt-in. No exact-alarm permission is declared. OFF short-circuits before permission/registry/planner/platform calls; explicit disable/delete can clean owned records.
- Added hourly unique constrained sync work, bounded transient retries, local-only state-boundary work and generation checks. Restore re-arms confirmed future reminders, and system boot/package/time events re-establish configured work. No permanent foreground service is used. OS delays and post-start suppression are explained in UI.
- Serialized notification reconciliation/posting with deletion, preventing a simultaneous delivery from surviving completed Delete My Data. Added fake-platform native tests for OFF/ON, idempotence, re-arm, denial, choices/main-group changes, duplicate/late delivery and delete/post race; tests compiled but have not run yet at this checkpoint.
- Added a test-only application/runner that disables automatic background restore, keeping fixture-based native tests offline. It is excluded from the production app. Migration and scoped WorkManager cancellation tests are being added. API 29 AOSP arm64 image r08 is installed, but no API 29 boot/test is claimed yet.
- Final combined command `:app:connectedDebugAndroidTest :app:lintDebug :core:test :app:testDebugUnitTest` succeeded. API 36: 17 instrumented tests passed, zero failures/skips (2 migration/work, 6 reminder, 8 storage/concurrency/deletion, 1 native rendering test containing 50 variants). Core: 11 tests/48 reminder plan cases pass; transport: four pass. Lint: zero errors, one informational newer-version notice; BOM 1.8.1 is intentionally pinned to align Room migration tests with the app's existing serialization runtime.
- Real native failures fixed: incompatible serialization core/json versions in Room MigrationTestHelper; clean-install Long generation default falsely invalidating reminders. Kept regression checks and verified delivery/rearm/delete/post behavior with the controlled platform. Added typed delivery outcomes, manual-force-versus-throttle race coverage, non-cancellable confirmed deletion and in-memory background error reporting.
- docs/BACKGROUND_AND_REMINDERS.md records actual cadence, ownership, confirmation semantics, no-exact-alarm choice and remaining real OS/OEM/physical gates. No real AlarmManager timing, physical notification, reboot or overnight pass is claimed from controlled-platform tests.

## Phase 3 — Widgets

- Added square/rectangle responsive Glance providers, per-appWidgetId validated configuration, matching app/refresh intents, deletion/restoration mapping and live local snapshot observation. Missing mapping returns setup, never the primary group implicitly.
- Added localized widget labels, separate rectangular room panel, next-subject/time footer, explicit date/start header, independent offline/stale/choice/coverage flags, overlap count and accessible refresh description. No provenance disclaimer on widgets.
- Initial native tests exposed zero room height, then a six-pixel clipped room line on compact square. Fixed allocations rather than weakening the checks. `adb shell am instrument -w -e class lv.turiba.next.WidgetRenderTest lv.turiba.next.test/androidx.test.runner.AndroidJUnitRunner`: OK (1 test), covering 50 actual RemoteViews/native View cases and C216 no-clipping assertions.
- Visually inspected original native outputs for rectangle/square, compact warning layout and font scale 2.0. Saved representative PNGs in docs/previews; details and unverified host/long-room cases in docs/WIDGET_VALIDATION.md. These are emulator/native View renders, not physical-device or launcher acceptance.
- Added a sixth storage test for independent widget groups and deletion without primary fallback. Final `tools/gradle-local.sh :app:connectedDebugAndroidTest :app:lintDebug :app:testDebugUnitTest :core:test` succeeded: seven instrumented tests (six storage plus the 50-case native render test), four transport unit tests and nine core tests, zero failures. JVM checks already up to date were not falsely described as freshly executed. Native tests and changed application compilation ran. See actual Gradle/XML reports for timings.
- The combined run reported seven nonfatal lint warnings. Moved API-31-only widget cell metadata into xml-v31 resources, extracted the loading brand string and adopted toUri. The sole targeted Overdraw suppression documents a launcher-hosted RemoteViews surface, which has no activity window background. Subsequent `:app:assembleDebug :app:lintDebug` succeeded with No issues found. Native rendering was not rerun for these metadata/KTX/loading-label-only corrections.

## Phase 2 — Storage & App

- Added typed Room week/lesson/catalog/sync/widget/generation tables, exported schema v1, DataStore settings/explicit choices, app-internal storage and explicit backup/cloud/device-transfer exclusions. Cache reads check week/date/time/row count; failed or unpublished parsing never replaces a valid published week.
- Added bounded exact-host HTTPS adapter: redirects rejected, platform TLS unchanged, content-type/body-size validation, connection/read/total-read budgets. Coalesced per-group requests, shared catalog cache and finite throttling. Cancellation/deletion generation rejects stale in-flight writes. UI settings changes recalculate locally without network.
- Added Compose onboarding, validated group input, explicit alternatives, current/next/concurrent lessons and independent uncertainty flags, last successful sync, System/LV/EN/RU, System/Light/Dark, About/Privacy and confirmed deletion.
- Actual resolved stack: AGP 9.4.0, Gradle 9.6.0, Kotlin/Compose compiler 2.3.21, KSP 2.3.13, Compose BOM 2026.09.00, Activity 1.13.0, Lifecycle 2.11.0, Room 2.8.5, DataStore 1.3.0, WorkManager 2.12.0, Glance 1.2.0. API 37 compiles/targets, minSdk 29. AGP built-in Kotlin resolves the explicitly upgraded shared Kotlin plugin; no legacy Android Kotlin plugin applied.
- `tools/gradle-local.sh :core:test`: 9 JUnit tests pass, including all earlier 978 state cases plus synthetic diacritic collation. Used explicit US collation to match observed JS ordering; does not claim universal locale-provider equivalence for untested scripts.
- `tools/gradle-local.sh :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug`: successful. Four transport unit tests pass, including unsafe host before connection, redirects/HTTP/non-HTML/body limits, timeout budgets and UTF-8. Lint final report: No issues found. An initial lint error about non-observable Configuration access was fixed using LocalConfiguration; locale split/icon warnings were fixed rather than suppressed.
- Installed official emulator 37.2.13 and AOSP default arm64 API 36 image r02, with Pixel 7 hardware profile in project-local AVD directories. Standardized cmdline-tools/latest placement after the first avdmanager invocation warned about inferred SDK root. First instrumented attempt saw the device offline during first boot; after sys.boot_completed=1, `tools/gradle-local.sh :app:connectedDebugAndroidTest` succeeded with five storage tests: defaults/no theme fetch; network/parse cache preservation; coalescing/unknown group; deletion during in-flight network; incomplete-cache rejection.
- These are AOSP API 36 emulator results, not physical Pixel, Samsung, Xiaomi or target-API-37 device acceptance. Debug and test APKs are developer artifacts under ignored app/build/; raw fixtures occur only in the test APK assets, not the application APK. UI visual/accessibility/launcher validation continues in later phases.

## Phase 5 — Automated verification and physical-test candidate

- API 29 AOSP arm64: 22 instrumented tests passed, zero failures/errors/skips. API 37 Google APIs ARM 16-KiB image: 22 passed, including the final post-transport/manifest rerun. Confirmed API 37 and PAGESIZE 16384 through adb; API 29 page size was not separately measured. API 36 Phase 4 evidence remains 17 tests/50 renders, not falsely upgraded to this later suite.
- The native suite includes 279 catalog groups, 18 captured schedules, 978 shared-JS state cases, 48 reminder plans, explicit Riga DST/Unicode/collation, migration, cache/error/deletion/concurrency, OFF/ON/denial/ownership/races, and 82 native widget rendering cases. Actual AlarmManager PendingIntent creation and owned notification posting/cancellation pass; alarm timing is not established by that test.
- Expanded long/missing-room rendering, strict UTF-8 rejection and cached date/time validation. Cached immutable regex patterns eliminate repeated compilation without changing the shared golden outputs. AAPT expands .gz test assets and strips the suffix: fixed the test reader after the first native parity run failed to find those files. Actual corpus assertions remain unchanged. Notification framework assertions wait for asynchronous NMS updates; permission is not revoked inside instrumentation because Android may kill its UID.
- Final JVM checks: 12 core tests and four transport tests, all pass. Seven fresh captured desktop HTML pages have independent URL/date/hash/agent provenance and test-only packaging. The live signed-APK check exposed mobile User-Agent routing to mobile.asp; changed the identifier to TURIBA-NEXT/0.1 after bounded 200-vs-302 evidence, retained unconditional redirect rejection and added a request-header regression. New captures verify current/next published TVL2D1 weeks beginning November 2/9.
- Release build and release lint pass: zero errors, one informational newer-version warning for the intentionally aligned serialization BOM. Dependency locks are committed. Final merged manifest removes WorkManager's unused foreground-service permission/service; retains INTERNET, ACCESS_NETWORK_STATE, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, WorkManager WAKE_LOCK and the generated signature-scoped dynamic-receiver permission. No exact-alarm permission.
- Signed release UI on API 37 successfully validates/saves TVL2D1 from the live official source, shows Loģistika as the next lesson and requires explicit course selection. Explicit ON shows the actual Android permission dialog; denial keeps reminders OFF and the schedule usable. A same-certificate code 1→2 private probe retains group, RU language, dark theme, selected Pakalpojumu mārketings and cached timetable. No widget mapping existed in that release UI check; mapping migration is independently tested. Confirmed Delete My Data returns to setup/reset language. Found and corrected dialog localization using the chosen resources rather than the Dialog's base context.
- A native rerun attempted while the differently signed release was installed failed at APK installation; AGP still printed BUILD SUCCESSFUL. This was not counted as a test pass. Removed only the disposable emulator installation, reran and verified the actual XML: 22 tests, zero failures/errors/skips.
- Original iPhone suite rerun: 92 passed. All 113 baseline SHA-256 values still match. No iPhone runtime, fixtures, deliverables or historical records edited.
- Private candidate is code 1/version 0.1.0-rc.1 in ignored delivery/. Owner key/password remain only in ignored .signing/ with restricted file modes. APK signature/16-KiB ZIP alignment and absence of fixture/key paths checked. Signing initially supplied the same password file twice; apksigner reads successive lines, so the helper now correctly reuses the keystore password for PKCS12. Public certificate/hash metadata is in docs/RELEASE.json. No private-key external backup or public APK upload performed.
- RU/LV/EN installation/update/privacy/troubleshooting guidance, rebuild/signing instructions and physical-device form are prepared. Physical launcher interaction/restore, Pixel/Samsung/Xiaomi, real alarm timing, reboot/idle and overnight battery/network measurements remain unperformed. These are mandatory outstanding gates, not waived limitations. Full v1.0 readiness is not claimed.

## First public test build — owner amendment, 2026-11-04

- The owner explicitly requested adding the test APK to the GitHub Android directory and labeling it the first version. This authorizes this APK's public repository distribution; it does not authorize stores, keys or unrelated files.
- Publish the unchanged signed 0.1.0-rc.1/versionCode 1 artifact under builds/first-test-version, with a first-test-version label, SHA-256, certificate metadata and pending physical gates. Do not relabel it as stable v1.0.
- Rechecked local APK SHA-256 against release metadata before upload. No application source or version change is needed; no new test run is claimed for this packaging/documentation update. Remote publication is verified by blob identity/size and branch readback.
