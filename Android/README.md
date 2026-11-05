# TURĪBA NEXT for Android

Native Android port of the existing Scriptable timetable product. This directory is the Android project root; the iPhone implementation remains in the repository root. Android development starts on 2026-11-04 from iPhone 1.1.0-rc.2.

This is an independent student project, not an official university application. The owner authorized the public repository on 2026-11-04; store publication remains unauthorized.

Current candidate: **0.1.0-rc.2**, Android 10+ (min 29, target 37). **Second test version:** [download APK](builds/second-test-version/TURIBA-NEXT-Android-0.1.0-rc.2.apk), [changes and installation](builds/second-test-version/README.md), [SHA-256/certificate](docs/RELEASE.json). The [first test version](builds/first-test-version/README.md) remains unchanged.

The Redmi corrections target 2x2 / 4x2 launcher cells, reuse the saved primary group for new widgets, preserve independent groups and fix deletion/restoration/background cleanup. Install over version 1 with the same signing certificate. Existing home-screen instances can retain old spans: resize or remove only the widget and add it again. Exact HyperOS geometry still needs a physical retest on the owner's device.

Install/use: [Russian](docs/USER_GUIDE_RU.md), [Latvian](docs/USER_GUIDE_LV.md), [English](docs/USER_GUIDE_EN.md). [Build/signing and key backup](docs/BUILD_AND_SIGNING.md). [Physical acceptance](docs/DEVICE_ACCEPTANCE.md).

Executed checks and limitations: [RC2 results](docs/RC2_RESULTS.json), [Redmi audit](docs/REDMI_AUDIT_2026-11-05.md), [progress](PROGRESS.md). Native render/host tests and a same-key signed upgrade do not establish physical OEM or overnight acceptance. Full v1.0 completion remains pending.

See [requirements](PROJECT_SPEC.md), [audit](docs/PHASE_0_AUDIT.md), [architecture](docs/ARCHITECTURE.md) and [acceptance plan](docs/ACCEPTANCE.md).

All runtime timetable traffic must go directly to https://nodarbibas.turiba.lv/ over HTTPS. No accounts, analytics, advertisements, developer server, remote logging or university credentials. Local app storage is not described as encrypted.
