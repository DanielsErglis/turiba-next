# Android progress

## Current state — 2026-11-04

Phase 0 committed as cf7b40e78a9355433892be6173c5c45a43572cc7 and remotely read back. Phase 1 core implemented and verified; preparing its commit. No installable APK, emulator result or physical-device acceptance is claimed. Work is isolated in Android/ and android-development, based on main feebd7e129a3d071e731e14e665df92da00fb0a7.

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

Commit/read back Phase 1, then implement Phase 2 storage, HTTPS repository, onboarding/settings and Compose app. Preserve all iPhone runtime/delivery files and historical records.

## Phase 1 — Data & Core

- Installed SDK Platform 37.0, build-tools 36.0.0 and platform-tools 37.0.1 through the official CLI with --no-metrics. `adb version` succeeds. JDK/Gradle remain project-local. The owner-authorized SDK license is recorded by the SDK installation.
- Added pure Kotlin/JVM models, strict non-executing tokenizer/catalog/schedule/time-grid parser, explicit Riga gap/overlap handling, selection/state engine, exact-host URL validation and UTF-16 reminder fingerprints. No Android imports/runtime JavaScript engine or new core runtime dependency.
- Offline JS generator uses unchanged original modules and 24 captured fixture bytes. Generated expectations are explicitly labeled; 18 schedule cases, all 279 catalog groups and 978 boundary/selection/state cases compare exactly with Kotlin. State corpus uses gzip-compressed base64 TSV to preserve exact strings without introducing a production JSON dependency.
- `tools/gradle-local.sh :core:test`: 8 JUnit tests passed, 0 failed, including all parity cases, original SHA-256 manifest integrity, malformed/changed HTML, unknown group/week mismatch, Riga DST/alternate host zone, Unicode/JSON keys/reminder hashes and unsafe URLs. The initial run found one-millisecond early SOON due to duration truncation; fixed by comparing exact Instants, and the rerun passed. Generator setup errors were corrected before the successful run; no expected data was weakened.
- Gradle needs approved execution outside the sandbox because its local lock socket is denied inside. This is distinct from the earlier DNS issue. No Android build/device result is implied by JVM success.
- Gradle wrapper generated with the official distribution checksum. Parser/time/state core compiles under Kotlin 2.2.10/JDK 17/Gradle 9.6.0. App dependency compatibility remains to be proved.

## Remaining

1. Data & Core.
2. Storage & App.
3. Widgets.
4. Background & Reminders.
5. Verification, including physical Pixel/Samsung/Xiaomi and overnight idle.
6. Signed private-test APK and RU/LV/EN delivery/acceptance.
