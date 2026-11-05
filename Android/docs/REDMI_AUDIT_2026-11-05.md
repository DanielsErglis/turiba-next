# Redmi / HyperOS widget audit and proposed correction plan

Date: 2026-11-05, Europe/Riga. Status: **owner approved implementation and second-test publication on 2026-11-05**. The findings below preserve the pre-fix audit; executed results are recorded separately in RC2_RESULTS.json.

Reviewed source: android-development commit `680adca8eda071220f22fa1312ecb99430dd0ee6`. The eight relevant local source/provider files match that GitHub tree by Git blob identity. Reviewed release: 0.1.0-rc.1, code 1, published APK SHA-256 `129bb7dd642ebf271d15c3af7e9df2d38a70a64da7c0a1141f7d4d7a11a5b77b`.

## Evidence and limits

The owner reports successful installation, device security checks and main-group validation/persistence on a physical Redmi with HyperOS. IMG_9322.HEIC visibly identifies 0.1.0-rc.1 and successful device scanner checks. This is a useful physical observation, not a complete independent security certification or complete OEM acceptance.

The widget-picker screenshot visibly offers 2×3 and 4×3 widgets. Home-screen images show a tall small widget and an almost square wide widget, with substantial unused vertical space. The iPhone screenshot is a visual reference: approximately square small and approximately 2:1 wide cards. Its displayed clock/state are not used as authoritative timetable or Android timing evidence.

The owner cannot currently access the device. Exact Redmi model, Android/HyperOS build, launcher version, density, display/font scale and home-screen grid remain unknown. The exact OEM rounding path cannot be established from screenshots alone. Do not infer an Android API from the HyperOS label. No photos have been uploaded to GitHub by this audit. HEIC was converted to a temporary PNG for inspection only.

## Findings

### W1 — P1: provider sizing is not robust across launcher grids

Observed on the physical device: picker spans 2×3 / 4×3 rather than the intended compact counterparts.

Code evidence: all four provider XML resources use `minHeight="150dp"`; base widths are 150/280dp. Only xml-v31 adds target cells 2×2 / 4×2. No explicit minimum resize dimensions or maximum resize dimensions are supplied. The minimum Glance layouts are 150×150 and 280×150dp (`widget/Widgets.kt:39`). The code therefore relies on the launcher's interpretation of these constraints, and has no layout below that height.

The metadata and physical outcome are confirmed; attributing a specific rounding calculation to this unknown HyperOS version is an inference. Android documentation distinguishes API-31 target cells from legacy dp dimensions and states that cell dimensions/margins vary by device. A target cell hint alone does not demonstrate the footprint on an OEM host.

Proposed fix: coordinate base/API-31 provider metadata, conservative legacy minimums, explicit resize ranges and layouts for the actual host sizes. Target small 2×2 and wide 4×2 occupation, with a visually square/approximately 2:1 card where the host permits. Keep card geometry and reserved launcher cells separate in validation: shrinking artwork inside a large reserved rectangle does not fix occupation. Exact cross-platform pixel equality cannot be guaranteed across arbitrary Android grids. Choose final dp thresholds from host measurements/probes, not an invented Redmi density.

### W2 — P1: new widgets discard the already configured main-group context

Owner-reported behavior is explained directly by the code. `WidgetConfigurationActivity` simply subclasses MainActivity (`Widgets.kt:144`). MainActivity supplies appWidgetId to AppScreen. `Repository.snapshotLocked` resolves widget IDs only from the widget mapping table; a new ID has no mapping and deliberately returns setup. AppScreen starts group input empty (`MainActivity.kt:51`) and forces `validateGroup` before setting a mapping (`MainActivity.kt:133–140`). There is no explicit new-widget initialization using the already confirmed main group.

Proposed fix: a dedicated, minimal configuration path. On a genuine new-add configuration request, reuse the saved main group and existing choices/cache, persist an independent instance mapping, update the widget and complete the launcher result without asking the owner to retype or waiting for a new network validation. If there is no configured main group, show group setup. Existing instances retain their own groups and have an explicit change-group action. Keep configuration cancellation, validation and completion transactional.

Do **not** solve this by making every missing mapping fall back to the primary group: that would undermine independent instances and Delete My Data protections. Do not blindly add configuration_optional without establishing a reliable new-instance initialization path. Android 10/11 and launchers which still invoke configuration must behave correctly as well.

### W3 — P1: content stretches vertically instead of retaining the intended visual proportions

Confirmed code and screenshot match. The root uses fillMaxSize; the central row takes defaultWeight, and the room panel uses fillMaxHeight (`Widgets.kt:89–104`). Host height beyond the intended presets becomes an empty middle region and an elongated room panel. The width and height are not used to preserve card proportions or choose a sufficiently compact hierarchy.

Proposed fix: adapt composition to supported actual size/aspect ranges; rebalance subject, status, room and footer spacing. Validate compact two-row layouts before reducing provider height. Preserve official subject strings, readable room, uncertainty/overlap flags, refresh and matching tap behavior. Cosmetic shrinking alone must not be counted as W1 fixed.

### W4 — P1: duplicate broadcast async ownership during widget deletion/restore

Static control-flow defect, independently inspected in the resolved Glance 1.2.0 bytecode; not claimed as a new device reproduction.

`ScheduleReceiver.onDeleted` calls `super.onDeleted` and then calls `goAsync()` again, later unconditionally invoking `pending.finish()` (`Widgets.kt:127–130`). In Glance's normal non-vivo/default path, super.onDeleted already invokes the framework goAsync. The framework clears its pending result on that first call; a second call can return null. Our cleanup then lacks its own valid broadcast lifetime and can end in a null dereference. NextApplication's coroutine handler can turn that into BACKGROUND_ERROR; no whole-process crash is asserted here.

Restore requires the same audit: framework AppWidgetProvider.onReceive calls onRestored and then onUpdate in one broadcast. Our onRestored takes goAsync, while Glance onUpdate can take it again. Mapping transfer also performs separate set/remove operations and can overlap deletion; preserve generation checks and serialize the transfer.

Proposed fix: one owner of broadcast completion, integrate cleanup with the supported Glance lifecycle/owned durable work, and test real receiver dispatch rather than repository-only removal. Verify mapping cleanup, restoration ordering and Delete My Data races without competing PendingResult use.

### W5 — P2: orphan periodic work survives removal of the last widget-only group

Confirmed static path. If no main group exists, but a configured widget created periodic work, deleting the last widget makes configured groups empty. `Background.recurring()` simply returns at line 46; it does not cancel the existing unique periodic request. SyncWorker returns success for empty groups, so it makes no timetable request but remains eligible for future hourly executions. Delete My Data does explicitly cancel work; ordinary last-widget removal does not.

Proposed fix: cancel only project-owned periodic/boundary work when no configured group remains, preserving unrelated jobs. Do not cancel shared work if another widget or the main group still needs it.

### W6 — P2: temporary group input does not survive Activity recreation

Code-confirmed state lifetime issue, not physically reproduced during this audit. Input and busy state use remember, not saved state or a retained operation model (`MainActivity.kt:45–53`). A recreated Activity loses an unfinished group entry; UI-scoped validation can be cancelled while shared fetch work continues.

Proposed fix: retain the draft and configuration identity appropriately across recreation, expose one durable validation result, and prevent cancelled/stale configuration from installing a mapping after deletion. Do not persist personal draft state into an unrelated widget instance.

### W7 — P2: widget picker lacks meaningful previews

Confirmed provider resources contain neither previewImage nor previewLayout. The picker screenshot shows the same N icon for both choices. Add previews and short distinguishable labels for small/wide variants, with synthetic preview data clearly separated from live schedules. This is a usability defect, not a schedule-parser failure.

## Items requiring reproduction rather than a bug claim

- The app screenshot uses Russian while widgets show Upcoming. Different locale settings or capture steps could explain this; no single cause is established. Add System/RU/LV/EN and process-restart/locale-change cases to host tests.
- Actual alarm timing, state-boundary redraw under HyperOS idle, reboot and overnight battery/network behavior remain unverified. The screenshots alone do not demonstrate a state-engine timing defect.
- A review of storage/source/time/reminder paths is not proof that no other defects exist. This report prioritizes evidenced widget integration failures and related lifecycle risks.

## Why the previous test suite missed this

The 82-case native rendering test composes a test RenderWidget with SizeMode.Exact into fixed-size FrameLayouts (WidgetRenderTest.kt:74–90). It checks native content and room clipping. It does not ask the installed provider for a real launcher placement, open configuration through the launcher, or dispatch real add/delete/restore broadcasts. Storage tests verify independent mappings and deletion but never assert the desired default-main-group add flow. These checks remain useful; a host integration layer was missing.

Audit command: `tools/gradle-local.sh :core:test :app:testDebugUnitTest` succeeded. Four transport tests actually reran and passed on 2026-11-05. The 12 core tests were UP-TO-DATE, reusing their earlier passing results; they are not described as newly executed. No new emulator/native/HyperOS test was performed in this analysis turn.

## Proposed implementation sequence after approval

1. Add real provider/host configuration and receiver regressions reproducing the old behavior: add after onboarding without typing/network; no primary group; independent secondary group; reconfigure/cancel/recreate; delete/restore; Delete My Data without implicit resurrection.
2. Fix explicit new-instance initialization and minimal configuration completion, retaining independent mapping and choice semantics.
3. Correct provider size/resize constraints and compact/adaptive card layouts; provide distinguishable native previews. Verify both requested footprint and visual proportions, not just TextView fit.
4. Fix broadcast lifecycle ownership, transactional/generation-safe restoration, last-group work cancellation and configuration saved state. Add targeted regressions.
5. Run JVM/native tests on API 29 and 37/16 KiB, lint and release build. Exercise an actual launcher/host with provider metadata, resize, taps, locales/themes, font scales and deletion. Record AOSP evidence separately from HyperOS.
6. Prepare 0.1.0-rc.2/versionCode 2 with the same owner key. Check upgrade from the published code 1 retains settings, choices/cache and existing widget IDs/groups. Keep the first public APK immutable. Publish a separately labeled second test APK, metadata and SHA-256 to Android/ on android-development after verifying the remote head; do not merge main.
7. When the physical Redmi is available, record its model/build/launcher/grid and repeat add/resize/setup/idle acceptance. An update may not force an existing host instance into a new footprint; determine whether re-adding is required and document it without resetting app data.

Completion criteria: adding either widget after onboarding requires no group re-entry; both variants fit the agreed compact footprint on the measured Redmi grid; no vertical stretching/clipping at supported sizes; independent groups persist; deletion/restore have no async ownership errors; no work remains with zero configured groups; same-key update and data deletion remain safe.

## Official references consulted

- [Widget sizing/layouts](https://developer.android.com/develop/ui/views/appwidgets/layouts): provider target cells, legacy dimensions and launcher-dependent geometry.
- [AppWidgetProviderInfo](https://developer.android.com/reference/android/appwidget/AppWidgetProviderInfo): target/min/max resize attributes and fallback icon when no preview is provided.
- [Widget configuration](https://developer.android.com/develop/ui/views/appwidgets/configuration): configuration Activity lifecycle and default setup options.
- [AOSP BroadcastReceiver](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/java/android/content/BroadcastReceiver.java): goAsync transfers and clears pending result.
- [AOSP AppWidgetProvider](https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/master/core/java/android/appwidget/AppWidgetProvider.java): restored broadcast dispatches onRestored then onUpdate.

Application source, existing APKs and GitHub refs were not modified by this audit. This document is a local review artifact pending approval.
