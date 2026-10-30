# TURĪBA NEXT — 1.0.0-rc.4

Independent student timetable widgets for iPhone using Scriptable. **Release candidate: physical-iPhone acceptance is still pending.** This is not an official Turība product and must remain in the private project repository until the owner authorizes public distribution.

## Installation package

The ready-to-import script is `dist/TURIBA NEXT.js`. The install archive is `dist/TURIBA-NEXT-1.0.0-rc.4.zip`. No Node.js, university password, account or additional runtime module is required on the iPhone.

Follow [Russian installation/setup/update instructions](docs/INSTALL_RU.md), [troubleshooting](docs/TROUBLESHOOTING.md), [privacy policy](docs/PRIVACY.md), and the [iPhone acceptance checklist](docs/IPHONE_CHECKLIST.md).

Features: Small/Medium widgets; group entry without code edits; per-widget group parameters; LV/EN/RU UI; system/light/dark themes; current/next lessons; explicit elective/subgroup selection; local cache; manual/best-effort widget refresh; optional main-group local reminders (OFF by default); and Delete My Data.

Runtime data requests go directly to the public timetable at nodarbibas.turiba.lv over HTTPS. Settings use FileManager.local(). No developer server, registration, analytics, external SDK, remote logging or remote code execution is included. Local files are not represented as encrypted. Full installed JavaScript remains readable by recipients.

## Development

With Node.js 20 or later:

```sh
node tools/build.js
node --test tests/*.test.js
node tools/preview-widgets.js
```

The configured bundled Node executable in this workspace is `/Users/danielerglis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`. Standard npm scripts are provided, but npm installation is not required.

Offline tests use captured fixtures and labeled synthetic cases; they do not query the live server. `python3 tools/capture-fixtures.py` explicitly refreshes the bounded evidence. `node tools/live-source-check.js` performs six live source requests and updates its report. These are manual research checks, not background product tasks.

## Evidence and limitations

89 full-suite tests and 14 alternate-host-zone core tests passed. The native API mocks and browser renderer preview do not establish iPhone behavior. See [validation](docs/VALIDATION.md), [source research](docs/SOURCE_RESEARCH.md), [architecture](docs/ARCHITECTURE.md), PROJECT_SPEC.md and PROGRESS.md for exact results and remaining work.

The source returns the same unpublished message for unknown groups, so catalog verification is independent. Empty/unpublished weeks never prove a day off or replace valid cache. Observed negative week links returned the next week; every requested week is checked against returned dates. Sunday is treated specially by the source. Missing rooms and unpublished personal BATIS information remain unknown. No exact refresh, reminder-delivery or Shortcuts automation timing is guaranteed.

The package contains no official university logo or commercial font files. No public release, hosting, App Store publication or paid service has been enabled.
