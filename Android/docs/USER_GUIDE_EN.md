# TURĪBA NEXT — Android private test guide

Independent student project. Candidate 0.1.0-rc.2 requires Android 10+. Physical acceptance remains pending. No Scriptable installation is needed.

1. Obtain the APK directly from the owner and compare its SHA-256 with `RELEASE.json`. Open the file, temporarily allow installation from that source, install, then disable that installation permission. There is no store release.
2. Open the app, choose System/LV/EN/RU, enter your group and select **Validate and save group** while online. Select your electives/subgroups explicitly. Official subject names remain in their source language.
3. Add the square or rectangular TURĪBA NEXT widget from your launcher's widget menu. New instances reuse the saved main group without retyping. Without a main group, setup opens. Reconfigure an instance to choose another group; saved widget groups remain independent. Resize through the launcher. Tapping opens the matching instance; refresh requests a manual sync.
4. Choose System/Light/Dark. Appearance changes use local data. All timetable dates/times and sync timestamps use Europe/Riga.

Reminders start OFF. Explicit ON requests notification permission on Android 13+. Choose 5/10/15/30 minutes. Only selected confirmed lessons in the main group qualify. Android can delay inexact delivery; reminders arriving after lesson start are suppressed. There is no exact-alarm access or permanent foreground service. Denial does not disable timetable use. Reopen the app after force-stop. Do not rely on reminders as your only timekeeping aid.

Offline mode retains the last valid schedule and shows uncertainty. Unpublished weeks do not prove there are no lessons. Check stale/incomplete/selection warnings and last successful sync; missing rooms are explicit. Refresh manually and compare with the university's public source when needed. For redirect/structure errors, report the error code, version and device model to the owner without personal data; do not bypass validation.

Internal app storage holds settings/cache; cloud backup and settings transfer are disabled. No accounts, analytics, ads, developer server or remote logs. App requests go only to nodarbibas.turiba.lv over HTTPS. Local files are not claimed to be encrypted. Confirmed **Delete My Data** clears settings, choices, cache and reminders, cancels owned work and returns widgets to setup, preserving other apps' data.

Update by installing an APK with the same application ID and signing certificate over the existing app. Do not uninstall. Record group/theme before updating and check they survive. A signature mismatch requires the correct APK; uninstalling deletes app data.

Physical gate: Pixel, Samsung and Xiaomi, including an overnight idle interval without opening the app. Record model, OS/OEM build, launcher, APK version and battery restrictions. Check both widgets, independent groups, resize/font scale, locales/themes, offline, reminders OFF/ON/denial, reboot, update and deletion. Measure actual redraw/reminder delays, battery and traffic with `DEVICE_ACCEPTANCE.md`. Emulator results cannot establish these outcomes.

The second test version targets 2×2 and 4×2 launcher cells. Existing instances may retain their old 2×3/4×3 allocation after updating: resize or remove only the home-screen widget and add it again. Do not uninstall the app. Exact geometry depends on the launcher. On the smallest cards, Net/Old/Pick/? abbreviate offline/stale/selection/unverified-week warnings; full descriptions are available in the app and accessibility content.
