# Privacy Policy — TURĪBA NEXT 1.1.0-rc.1

Effective date: 2026-10-30. This is an independent student project, not an official service of Biznesa augstskola Turība.

## Data and requests

TURĪBA NEXT has no developer backend, account registration, analytics, advertising tracker, remote logging or telemetry. It does not request BATIS/university credentials, Apple ID, contacts, photos or location.

To obtain public schedules, the script sends the study group code and week selection directly to `https://nodarbibas.turiba.lv/`. Like any website request, the university and its hosting/network providers can see normal connection metadata, including IP address and requested group/week. Zero developer telemetry does not mean the university website has no server logs. The script does not execute analytics or other scripts embedded in received HTML. HTTPS redirects are rejected and certificate checks are not disabled.

Language, appearance, elective selections and reminder settings are not sent to the university or another server. There is no separate API provider or paid cloud dependency.

## Local storage and reminders

FileManager.local() stores group preferences, selections, theme/language/reminder settings, public catalog and schedule cache, synchronization timestamps and service metadata in Scriptable's local TURIBA-NEXT folder. Reminder identifiers and project metadata also exist in iOS's local notification system when enabled. Configuration does not use FileManager.iCloud by default. iOS/Scriptable backup and device-security policies are outside this project's control; local files are not claimed to be cryptographically encrypted by the script.

Reminders are optional and OFF by default. Enabling may cause iOS to request notification authorization on the first actual schedule attempt. Denial does not disable the widget. Lock Screen notification text may reveal subject, room and time according to your iPhone notification-preview settings.

Delete My Data removes the project's local files and pending project-owned reminders, leaving other scripts' files and notifications alone. It does not erase university server logs, past OS backups, already delivered notifications or the script's own JavaScript file. No remote deletion request is necessary because there is no developer-held dataset.

## Code and distribution

The distributed JavaScript is readable by recipients. No embedded secret or obfuscation-based security is used. Development history is held in the owner's private repository. This package has not been publicly published and includes no official university logo or commercial font file.

For project questions, contact the owner who supplied your installation package. The owner confirmed native acceptance on 2026-10-30; the documented iOS limitations still apply.
