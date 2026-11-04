# Android progress

## Current state — 2026-11-04

Phase 0 committed as cf7b40e78a9355433892be6173c5c45a43572cc7 and remotely read back. Phase 1 committed as 6d94f4307a6de580ff5de60ae17c287e4d4e6f6d. Phase 2 app/storage implemented with debug build, lint, JVM and AOSP-emulator storage checks passing. Preparing the Phase 2 commit. No physical-device acceptance or signed private-test release is claimed. Work is isolated in Android/ and android-development, based on main feebd7e129a3d071e731e14e665df92da00fb0a7.

## Owner decisions

- Native Android development requested, rather than copying the iPhone project.
- Existing PUBLIC DanielsErglis/turiba-next repository explicitly authorized on 2026-11-04. Keep Android in its own directory. No change to visibility; no store/public-hosted APK distribution authorized.
- Android SDK license acceptance explicitly authorized on 2026-11-04 for project-local tooling.

## Phase 0 results

- Reviewed complete brief, current requirements/progress/architecture/research/source/tests and iPhone build.
- Authenticated GitHub reads confirmed main/head and exact selected-file Git blob matches; android-development created from that head. Local directory is not a Git checkout; connector history will be authoritative.
- Existing JS suite rerun: 92 passed, 0 failed, 0 skipped using bundled Node and `--test tests/*.test.js`. This does not validate Kotlin/Android.
- Recorded original iPhone file hashes, environment/download evidence, architecture and phase/device acceptance matrix.
- Project-local verified JDK 17.0.21+9 and Gradle 9.6.0 execute successfully. Android CLI help executes. SDK platform/build-tools/adb installation started; not yet verified. Android Studio absent at probed path; no emulator/physical checks.
- Sandbox network failed DNS; approved escalated access to official tool distributions works. Toolchain stays in ignored .toolchain; subsequent Android CLI commands disable metrics.

## Next action

Commit Phase 2, then implement responsive Glance widgets and per-instance configuration in Phase 3. Preserve all iPhone runtime/delivery files and historical records.

## Phase 1 — Data & Core

- Installed SDK Platform 37.0, build-tools 36.0.0 and platform-tools 37.0.1 through the official CLI with --no-metrics. `adb version` succeeds. JDK/Gradle remain project-local. The owner-authorized SDK license is recorded by the SDK installation.
- Added pure Kotlin/JVM models, strict non-executing tokenizer/catalog/schedule/time-grid parser, explicit Riga gap/overlap handling, selection/state engine, exact-host URL validation and UTF-16 reminder fingerprints. No Android imports/runtime JavaScript engine or new core runtime dependency.
- Offline JS generator uses unchanged original modules and 24 captured fixture bytes. Generated expectations are explicitly labeled; 18 schedule cases, all 279 catalog groups and 978 boundary/selection/state cases compare exactly with Kotlin. State corpus uses gzip-compressed base64 TSV to preserve exact strings without introducing a production JSON dependency.
- `tools/gradle-local.sh :core:test`: 8 JUnit tests passed, 0 failed, including all parity cases, original SHA-256 manifest integrity, malformed/changed HTML, unknown group/week mismatch, Riga DST/alternate host zone, Unicode/JSON keys/reminder hashes and unsafe URLs. The initial run found one-millisecond early SOON due to duration truncation; fixed by comparing exact Instants, and the rerun passed. Generator setup errors were corrected before the successful run; no expected data was weakened.
- Gradle needs approved execution outside the sandbox because its local lock socket is denied inside. This is distinct from the earlier DNS issue. No Android build/device result is implied by JVM success.
- Gradle wrapper generated with the official distribution checksum. Parser/time/state core compiles under Kotlin 2.2.10/JDK 17/Gradle 9.6.0. App dependency compatibility remains to be proved.

## Remaining

3. Widgets.
4. Background & Reminders.
5. Verification, including physical Pixel/Samsung/Xiaomi and overnight idle.
6. Signed private-test APK and RU/LV/EN delivery/acceptance.

## Phase 2 — Storage & App

- Added typed Room week/lesson/catalog/sync/widget/generation tables, exported schema v1, DataStore settings/explicit choices, app-internal storage and explicit backup/cloud/device-transfer exclusions. Cache reads check week/date/time/row count; failed or unpublished parsing never replaces a valid published week.
- Added bounded exact-host HTTPS adapter: redirects rejected, platform TLS unchanged, content-type/body-size validation, connection/read/total-read budgets. Coalesced per-group requests, shared catalog cache and finite throttling. Cancellation/deletion generation rejects stale in-flight writes. UI settings changes recalculate locally without network.
- Added Compose onboarding, validated group input, explicit alternatives, current/next/concurrent lessons and independent uncertainty flags, last successful sync, System/LV/EN/RU, System/Light/Dark, About/Privacy and confirmed deletion.
- Actual resolved stack: AGP 9.4.0, Gradle 9.6.0, Kotlin/Compose compiler 2.3.21, KSP 2.3.13, Compose BOM 2026.09.00, Activity 1.13.0, Lifecycle 2.11.0, Room 2.8.5, DataStore 1.3.0, WorkManager 2.12.0, Glance 1.2.0. API 37 compiles/targets, minSdk 29. AGP built-in Kotlin resolves the explicitly upgraded shared Kotlin plugin; no legacy Android Kotlin plugin applied.
- `tools/gradle-local.sh :core:test`: 9 JUnit tests pass, including all earlier 978 state cases plus synthetic diacritic collation. Used explicit US collation to match observed JS ordering; does not claim universal locale-provider equivalence for untested scripts.
- `tools/gradle-local.sh :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug`: successful. Four transport unit tests pass, including unsafe host before connection, redirects/HTTP/non-HTML/body limits, timeout budgets and UTF-8. Lint final report: No issues found. An initial lint error about non-observable Configuration access was fixed using LocalConfiguration; locale split/icon warnings were fixed rather than suppressed.
- Installed official emulator 37.2.13 and AOSP default arm64 API 36 image r02, with Pixel 7 hardware profile in project-local AVD directories. Standardized cmdline-tools/latest placement after the first avdmanager invocation warned about inferred SDK root. First instrumented attempt saw the device offline during first boot; after sys.boot_completed=1, `tools/gradle-local.sh :app:connectedDebugAndroidTest` succeeded with five storage tests: defaults/no theme fetch; network/parse cache preservation; coalescing/unknown group; deletion during in-flight network; incomplete-cache rejection.
- These are AOSP API 36 emulator results, not physical Pixel, Samsung, Xiaomi or target-API-37 device acceptance. Debug and test APKs are developer artifacts under ignored app/build/; raw fixtures occur only in the test APK assets, not the application APK. UI visual/accessibility/launcher validation continues in later phases.
