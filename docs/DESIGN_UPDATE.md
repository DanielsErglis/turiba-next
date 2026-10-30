# Widget Design Update — 2026-10-31

Version: 1.1.0-rc.2. Authority: the owner's supplied visual reference and explicit request to remove the unofficial-project widget label and improve readability. This supersedes the original on-widget provenance requirement; About/Privacy still identify the independent project.

## Layout

Small follows the reference hierarchy: brand marker, state, prominent subject, large room code and start time, then a cyan baseline. Compact room codes are approximately 34–38 points in common layouts, compared with 23 previously. Subject text is 20 points for short titles and 17 for long titles, with conservative adjustments on the smallest device bucket. Long locations and missing rooms retain their source meaning and avoid fabricated room codes.

Medium uses a brand/group header, main lesson column and contrasting rounded room card. Typical subject sizes are 20–24 points, and compact room codes are around 34–36 points in the common width bucket, compared with 17/22 previously. The next-lesson footer gives the actual subject its own 13-point line and the start time a separate 17-point right-aligned field. The small next label may include the date when the lesson is on another day, preserving chronology without cluttering today's times.

The dark background is deep teal-blue with a lighter room card, white primary type and cyan accents. Light and dynamic system modes remain available. The cyan line is decorative branding, not a progress or synchronization indicator. Offline/staleness/coverage and selection notices take priority over the decorative baseline.

## Native sizing and evidence

Use only documented WidgetStack.size/cornerRadius/layout APIs and Size. Conservative portrait iPhone width buckets reserve explicit room and lesson-column space; the smallest bucket reduces sizes enough to preserve both fields. They are implementation heuristics, not a guarantee for every future device or iPad. Long subjects retain their original strings and may truncate visually within two lines.

The developer generated previews directly from the actual native renderer tree, inspected the reference pair plus language/theme/edge cases, corrected room clipping and narrow-height overflow, and checked element bounds in all 26 final samples. Browser previews do not reproduce native WidgetKit typography or layout exactly. The owner should inspect both sizes on the target iPhone.

92 automated tests passed, including the existing full runtime suite and additional presentation assertions. There were no functional changes to source retrieval, normalization, time calculations, storage, user settings schema or reminder planning. The build now supplies the documented Size API to the renderer.

Official references: [WidgetStack](https://docs.scriptable.app/widgetstack/), [WidgetText](https://docs.scriptable.app/widgettext/). Preview data is synthetic and is not live university timetable evidence. Development preview artifacts: `.tmp/widgets-redesign.png` and `.tmp/widgets-design-matrix.png`; regenerate HTML with `node tools/preview-widgets.js`.

## rc.2 native room-fit follow-up

The owner reported Medium truncating C216 to C2… in rc.1 while Small showed it completely. rc.2 removes competing side spacers, gives the text the full room-card content width and permits additional fitting for short codes. The preferred large font is retained. 92 tests passed, including a four-width allocation regression; 26 browser samples had no out-of-bounds elements and the reference preview was inspected. This is not yet confirmation of native rc.2 room fit.
