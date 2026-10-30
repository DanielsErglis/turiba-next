# Troubleshooting

## Setup or group unavailable

Run TURIBA NEXT inside Scriptable first, choose a language and enter an exact code from the current public group catalog. Do not edit JavaScript to select a group. The public source returns HTTP 200 even for invented codes; group validation therefore uses catalog membership separately.

Try Sync now after checking the public timetable in a normal browser. A university login is never required by this script. A genuinely new or unlisted group can be rejected until the public catalog exposes it; do not bypass validation by assuming the echoed heading proves existence.

## Empty/unpublished timetable

An unpublished response or empty unconfirmed table is not proof of no classes. Existing valid cache is retained. Individual courses/subgroups may require a selection, and personal BATIS information cannot be reconstructed from the public source. Check the source and your course selections.

On Sunday the source treats next week as current. A current-week cache may still be used, but a first Sunday install might not establish the current day's coverage. Observed negative week navigation returned a future week, so the script does not claim historical retrieval works.

## Offline, stale data or changed HTML

The widget uses previously verified data and shows a warning when available. If there is no relevant valid cache, it shows an unavailable state. Parser/structure errors do not replace good cache with empty data. Restore connectivity and use Sync now. If the public source layout changed, preserve the cache and report the case to the project owner rather than changing lesson times manually.

## Appearance or refresh

Choose Small or Medium and select the correct script in widget settings. Other families are not supported. Theme changes do not require a schedule download. System mode uses dynamic colors; forced modes take priority. Follow the installation guide for instance-specific group parameters.

iOS may delay widget refresh even after refreshAfterDate. A precise ten-minute status switch is not guaranteed. Open the script to synchronize manually. Date/time labels use Riga, not the device's travel time zone.

Browser previews and API mocks cannot establish native font scaling, text truncation or actual widget layout. Report your iPhone/iOS/Scriptable versions and which size/language/theme was affected. The initial candidate requires real-device confirmation of Intl.DateTimeFormat.formatToParts and native file/network behavior.

## Notifications

OFF is normal and the widget works without notification permission. To receive reminders, choose the main group and your courses, explicitly enable reminders, choose a lead interval, and refresh. No reminder is created for a past trigger, unselected course, proposed session item or an unverified week. The planner considers seven days and at most 32 reminders.

Check iPhone Settings for Scriptable notification permission and preview settings. Focus modes and iOS delivery policy can affect visibility. There is no separate documented Scriptable authorization-request API; the first real scheduling attempt is the consent point. No fake reminder is used if there is no eligible class.

Regular synchronization is necessary. A source failure preserves existing reminders for unverified weeks, so they may become stale. Disable reminders to remove the project's pending items. If removal fails, OFF is still saved and new planning stops; retry disabling or Delete My Data and report the failure. Unrelated Scriptable notifications are never removed globally.

## Corrupted settings or storage failure

The script preserves unreadable settings until you explicitly choose Delete My Data. Check available device storage and retry. Reset removes this project's local data and returns to setup. If reminder cleanup fails, deletion stops so it can be retried without losing the cleanup record.

Do not delete Scriptable's entire documents folder: it may contain unrelated projects. The project uses its own TURIBA-NEXT subdirectory. Script updates should replace code while keeping the script name and existing local files.

## Shortcuts

The shortcut parameter must be the text `sync`. Run it manually before creating time-based personal automations. No automation has been tested on the owner's device yet. Background execution and confirmation requirements depend on iOS. These automations are optional and do not replace checking native widget behavior.
