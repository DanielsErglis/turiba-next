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
