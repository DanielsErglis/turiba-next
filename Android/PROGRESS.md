# Android progress

## Current state — 2026-11-04

Phase 0 audit and architecture prepared. Phase 1 not started. No installable APK, emulator result or physical-device acceptance is claimed. Work is isolated in Android/ and android-development, based on main feebd7e129a3d071e731e14e665df92da00fb0a7.

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

Commit/read back Phase 0 on android-development. Finish SDK provisioning, resolve compatible exact dependencies and begin Phase 1 Data & Core with shared fixture/JS parity. Preserve all iPhone runtime/delivery files and historical records. Phase closure commits and later checks will be recorded as actual outcomes, never anticipated passes.

## Remaining

1. Data & Core.
2. Storage & App.
3. Widgets.
4. Background & Reminders.
5. Verification, including physical Pixel/Samsung/Xiaomi and overnight idle.
6. Signed private-test APK and RU/LV/EN delivery/acceptance.
