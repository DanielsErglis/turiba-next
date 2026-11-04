# Acceptance matrix

Current automated evidence is in PHASE_5_RESULTS.json and PROGRESS.md. Physical Pixel/Samsung/Xiaomi and overnight acceptance remain pending. The phase gate table preserves the required scope; passing automated checks does not close physical gates.

| Phase | Required evidence before closure |
| --- | --- |
| 0 | Current remote/head/privacy authorization, source/build review, unchanged-iPhone hashes, actual tooling/network probes, architecture and requirements/compatibility/acceptance records |
| 1 | Kotlin compilation; byte-hash validation of all 24 captured fixtures; JS/Kotlin normalized results for actual groups/weeks/branches/Saturdays/exams/missing rooms/duplicate periods/choices; malformed/changed/unpublished/unknown outcomes; DST/state/overlap/Unicode/JSON/identity parity |
| 2 | Room/DataStore integration, safe corruption/failure/cache preservation, source host/TLS/redirect/timeouts, sync coalescing, cancellation/deletion races, onboarding/settings/locales/themes, no fetch on theme change; app builds and appropriate instrumented checks |
| 3 | Both widgets: size/font/long-text/locale/theme/state matrix, separate groups and choices, add/cancel/reconfigure/delete/restore, matching taps/manual sync, uncertainty visibility; launcher emulator and physical visual evidence distinguished |
| 4 | OFF executes no consent/planner/alarm calls, ON each lead/selected fresh main-group only, denial/revocation/dedup/update, owned cancellation; reboot/package/time changes/force-stop, Doze/inexact timing, no foreground-service dependency |
| 5 | Unit/integration/UI/instrumented tests, lint, debug and release builds, privacy/dependency/artifact review; deletion under in-flight work; update preserves data; overnight idle timing/network/resource measurements; actual Pixel/Samsung/Xiaomi acceptance |
| 6 | Signed private-test release APK with retained private signing key/update identity, documented rebuild environment, SHA-256 and signature verification, RU/LV/EN install/update/privacy/troubleshooting guides, actual evidence/limits and owner private acceptance |

## Planned device matrix

| Device / OS | Intended support | Emulator evidence | Physical evidence |
| --- | --- | --- | --- |
| Android 10 API 29 baseline | Yes | AOSP arm64, 22 native tests / 82 widget renders passed | Pending |
| Pixel / AOSP API 35–37 | Yes | API 36: 17 tests / 50 renders; API 37 16 KiB: 22 tests / 82 renders | Mandatory, pending |
| Samsung One UI Android 10+ | Yes, by model/version | An AOSP image cannot validate One UI | Mandatory, pending |
| Xiaomi/Redmi/POCO HyperOS; relevant MIUI Android 10+ | Yes, by model/version | An AOSP image cannot validate OEM restrictions | Mandatory, pending |
| OnePlus OxygenOS | Planned | Not OEM proof | Pending available device |
| OPPO ColorOS / realme UI / vivo | Planned, individually verified | Not OEM proof | Pending available device |
| Huawei / Honor | Assess specific model/Android compatibility | Not assumed | Pending model/OS evidence |
| HarmonyOS NEXT | Separate platform, no Android support claim | Not applicable | Separate evaluation required |

Check font scales 1.0/1.3/2.0, density and launcher resizing; LV diacritics, RU text and long room/subject; light/dark/system changes; primary and secondary widgets. Measure actual reminder and redraw delays across an overnight idle interval and report observed elapsed times without turning them into universal guarantees. Record model, OS/build, launcher and battery restrictions for every physical result. Never substitute screenshots or Scriptable mocks for these gates.
