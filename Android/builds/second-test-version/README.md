# Second test version — Redmi widget fixes

**Вторая тестовая версия — 0.1.0-rc.2**, versionCode **2**, 2026-11-05.

[Download APK](TURIBA-NEXT-Android-0.1.0-rc.2.apk?raw=true) · [SHA-256 and certificate](RELEASE.json) · [Русская инструкция](../../docs/USER_GUIDE_RU.md) · [Latviešu](../../docs/USER_GUIDE_LV.md) · [English](../../docs/USER_GUIDE_EN.md)

Changes:

- Small/wide provider targets 2×2 / 4×2, lower legacy minimum height and explicit resize ranges. Visible cards retain square/approximately 2:1 proportions inside tall host areas.
- New widgets reuse the already configured primary group and choices without retyping or a blocking download. Reconfiguration preserves independent groups.
- Dedicated configuration screen retains drafts/operations across Activity recreation and checks deletion generation before committing.
- Widget deletion uses Glance's suspend callback; restoration has one broadcast completion owner and an atomic mapping transfer.
- Last-widget-only removal cancels unneeded owned periodic work. Added native previews and shorter distinct picker labels.

Install over the first version: application ID and signing certificate are unchanged. **Do not uninstall the app.** The first test APK remains available unchanged in [first-test-version](../first-test-version/README.md).

**For existing home-screen widgets:** launchers may retain the previous 2×3/4×3 allocation after an APK update. Resize the widget or remove only that home-screen widget and add it again. This preserves app settings. New placement targets 2×2/4×2; the exact physical geometry depends on the launcher's grid.

The owner's Redmi is currently unavailable for a second physical test. Exact model/HyperOS/Android/grid and post-fix physical results remain pending. This is a test candidate, not a claim of completed v1.0/OEM/overnight acceptance. Executed checks and limitations are recorded in [RC2 results](../../docs/RC2_RESULTS.json).
