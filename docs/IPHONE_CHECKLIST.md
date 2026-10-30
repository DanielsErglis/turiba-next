# Physical iPhone Acceptance — Pending

Version: 1.0.0-rc.1. **No item below has been performed on a real iPhone by the developer.** Fill Actual result and Pass/Fail only after observing the device. Do not infer success from automated mocks or browser previews.

Device: pending. iOS version: pending. Scriptable version: pending. Test date/time (Europe/Riga): pending. Group: pending.

## Initial smoke check

| Check | Expected | Actual result / Pass-Fail |
| --- | --- | --- |
| Import and run | One script installs and runs without Node or extra modules. | Pending |
| First setup | Language selection and real group validation work; group needs no code edit. | Pending |
| Default OFF | No notification permission prompt or reminders; normal widget still works. | Pending |
| Source comparison | Compare date, period start/end, subject and room with the public source for the same group/week. | Pending |
| Small and Medium | Both display readable current/next information; long names and room fit. | Pending |
| Basic runtime | Riga date/time conversion, native HTTPS and local settings/cache work on this Scriptable version. | Pending |

## Presentation and timetable checks

| Check | Expected | Actual result / Pass-Fail |
| --- | --- | --- |
| Language matrix | LV/EN/RU labels, setup, errors and settings display correctly; official subjects stay unchanged. | Pending |
| Theme matrix | System mode follows iPhone light/dark; explicit Light/Dark override it in both sizes. | Pending |
| Long/missing text | Long official names and missing-room message are readable with Latvian/Russian characters. | Pending |
| Active/break/finished | Current lesson remains through its end; break/next and finished states match actual Riga time. Status refresh timing is best effort. | Pending |
| Electives/subgroups | Only selected alternatives appear and can be changed in settings. | Pending |
| Additional widget group | Widget parameter isolates another group without changing the primary group or its reminders. | Pending |
| Offline/relaunch | After a successful sync, Airplane Mode retains relevant last valid data with a warning; settings survive reopening. | Pending |
| Unsupported/unknown group | Clear localized failure; no invented lessons or silent cache replacement. | Pending |

## Reminders, deletion and optional automation

Use a real future selected lesson with enough time before its trigger. Do not invent timetable entries for delivery testing. Scheduling/actual delivery may need separate observations.

| Check | Expected | Actual result / Pass-Fail |
| --- | --- | --- |
| Enable reminders | Explicit opt-in and lead selection; iOS consent when actual scheduling requires it. No permission prompt when OFF. | Pending |
| Deny permission | Localized interactive feedback; widget continues to work. | Pending |
| Reminder content/delivery | Real selected lesson, correct Riga-based trigger, subject, room and selected UI language. Verify delivery separately. | Pending |
| Change lead/room/source | Next successful verified refresh updates relevant pending reminders without duplicates. | Pending |
| Disable/change group | Old main-group pending project reminders removed; widget remains usable. | Pending |
| Other scripts | Unrelated pending notifications and files survive cleanup. | Pending |
| Delete My Data | Settings/cache/primary group and pending project reminders removed; returns to setup. | Pending |
| Manual sync shortcut (optional) | Parameter sync refreshes without menu and reports result. | Pending |
| 07:00/12:00/20:00 automations (optional) | Each configured automation tested independently; no exact background guarantee claimed. | Pending |

## Acceptance decision

Current decision: **PENDING**. Owner-confirmed basic device evidence is needed first; remaining failures must be fixed and retested before final v1.0 acceptance. Record any skipped optional automation separately. No public release is authorized by completing this checklist alone.
