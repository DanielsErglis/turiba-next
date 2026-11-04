# TURĪBA NEXT for Android

Native Android port of the existing Scriptable timetable product. This directory is the Android project root; the iPhone implementation remains in the repository root. Android development starts on 2026-11-04 from iPhone 1.1.0-rc.2.

This is an independent student project, not an official university application. The owner authorized the public repository on 2026-11-04; store publication remains unauthorized.

Private-test candidate: **0.1.0-rc.1**, Android 10+ (min 29, target 37). The signed APK stays local in ignored `delivery/`; it is not published in this public source repository. Hash/certificate: [release metadata](docs/RELEASE.json). Physical Pixel/Samsung/Xiaomi and overnight acceptance remain mandatory and pending; this is not a completed v1.0 release.

Install and use: [Русский](docs/USER_GUIDE_RU.md), [Latviešu](docs/USER_GUIDE_LV.md), [English](docs/USER_GUIDE_EN.md). [Build/signing and key backup](docs/BUILD_AND_SIGNING.md). [Physical acceptance form](docs/DEVICE_ACCEPTANCE.md).

Actual automated results: API 29 and API 37/16 KiB each pass 22 native tests, including 82 widget View cases; 12 core and four transport JVM tests pass. These are emulator/native View checks, not physical OEM or launcher acceptance. See [results](docs/PHASE_5_RESULTS.json), [progress](PROGRESS.md), [requirements](PROJECT_SPEC.md), [audit](docs/PHASE_0_AUDIT.md), [architecture](docs/ARCHITECTURE.md) and [acceptance plan](docs/ACCEPTANCE.md).

All runtime timetable traffic must go directly to https://nodarbibas.turiba.lv/ over HTTPS. No accounts, analytics, advertisements, developer server, remote logging or university credentials. Local app storage is not described as encrypted.
