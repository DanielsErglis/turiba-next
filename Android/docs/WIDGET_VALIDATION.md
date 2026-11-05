# Widget implementation and native rendering evidence

2026-11-04, official AOSP API 36 arm64 emulator r02, emulator 37.2.13, Pixel 7 hardware profile. These are emulator results, not physical Pixel or OEM-launcher acceptance.

Square and rectangle Glance providers use responsive dp size sets. Configuration is required for each instance and stored by appWidgetId; unknown/deleted mappings show setup rather than falling back to the primary group. The configuration activity validates that the ID belongs to this package and returns RESULT_OK with that ID only after validated save; cancellation leaves configuration absent. Clicks open the matching instance screen; refresh opens that screen and starts a generation-checked foreground sync. Delete/remap handlers preserve instance isolation. Restore can reuse a surviving old mapping; if backup exclusions mean no mapping survives, setup is required.

Views consume local snapshots only. Live Glance sessions observe repository revision changes, so theme/locale/selection/deletion does not keep a captured old snapshot throughout the session. Networking and reminder planning are not part of rendering. About/provenance text is absent from widgets per the owner amendment.

## Executed rendering matrix

`WidgetRenderTest` composes actual Glance RemoteViews, applies them to Android native Views, measures/layouts them at the requested dp size and checks native room TextView height, line-layout height and zero ellipsis. 36 combinations cover two layouts × LV/EN/RU × System/Light/Dark × compact/large; six additional state cases cover upcoming/soon/finished/noSchedule/setupRequired/error; eight cover compact layouts at 1.3 and 2.0 font scales, with and without simultaneous uncertainty flags. Total: 50 rendered cases in one instrumented JUnit test. Large System cases also exercise dark device configuration. Data in this UI test is explicitly synthetic; captured-data semantics are verified independently by the core parity suite.

Initial native tests found zero room height at compact square size, then a six-pixel line-height truncation. The layout was corrected by combining the group/status header, reserving room space, reducing compact text rows, changing tight layouts to a side room panel and allocating font sizes based on size and configured scale. The regression checks were retained and passed after the corrections. A first screenshot-save attempt used an unavailable test-context external directory; fixed to app-internal test files before image inspection. No rendering pass was claimed from those failed runs.

## Typography and limitations

Widgets are constrained surfaces. Compact widgets cap effective font growth at 1.1 and larger ones at 1.2; tighter views shorten subject/footer lines and expose the full content on tap. The app itself honors normal system font scaling. Room text is prioritized over long subject text; long official subject names can be ellipsized, without translating or changing the stored name. Header includes lesson start and a date prefix when it is a future day. Offline and stale are separate badges, as are selection and unverified-week warnings. Concurrent lessons have an explicit count and are all listed in the app.

Native View rendering into a software bitmap is stronger evidence than an HTML approximation, but does not establish launcher padding/corner clipping, host resizing interactions, actual click dispatch, OEM background behavior or physical readability. Those checks remain in Phase 5/device acceptance. The current automated no-clipping assertion concerns the tested C216 room code; arbitrary long rooms still need the expanded visual acceptance matrix.

## Inspected images

These PNGs are original emulator/native View render outputs, with no image editing. They are documentation only, not application assets.

- [Rectangle, 360×180dp, dark](previews/rectangle-native-api36.png)
- [Square, 250×250dp, dark](previews/square-native-api36.png)
- [Compact rectangle, RU, font scale 2.0, independent warnings](previews/compact-warnings-native-api36.png)
# Phase 5 extension — 2026-11-04

The rendering test now executes 82 native RemoteViews cases on API 29 and API 37/16 KiB. Added actual source-style room strings A204/1, 35. kab., C214 ITN and ekskursija, a separately synthetic long Liepāja label, and missing-room labels in all three languages at both sizes/layouts. Room height, layout fit and absence of ellipsis are asserted. Compact layouts reduce typography for long room strings and use a short localized missing-room label. No claim of launcher/physical acceptance follows from these View renders.


## RC2 correction - 2026-11-05

SizeMode.Exact now uses the host-reported bounds. The visible card is bounded to square/approximately 2:1 proportions; provider target/legacy minimum and resize metadata separately define occupation. Targets are 2x2/4x2; legacy minimum height is 110dp. Text at 110-149dp uses a compact template with localized status/warning labels and full accessibility descriptions. Long official subject strings can ellipsize; room strings and independent warning visibility are asserted.

The matrix now contains 180 cases: the original 82 plus 96 combinations of minimum size/locale/missing-short-long room/warnings/font scale and two tall-host cases. The tall-host assertions inspect actual native bitmap alpha bounds to prevent stretching. Five additional registered-provider host tests cover size metadata/options, RESULT_OK default-main-group initialization, recreation/cancel, restoration callback and actual system deletion. Protected restoration is invoked as a callback with real bound IDs, not falsely claimed as an instrumentation-originated protected broadcast.

Old-code host regressions reproduced three failures before fixes. Early compact attempts clipped room lines, including the 130dp tall-host case; the typography/spacing/template threshold was corrected and original fit/no-ellipsis checks retained. Representative PNGs were inspected as original software-rendered native Views. They do not establish launcher clipping or physical Redmi grid behavior. The owner's device/model/build/grid are currently unavailable for retest.
