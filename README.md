# TURĪBA NEXT — 1.1.0-rc.2

Independent student timetable widgets for iPhone using Scriptable. **The owner accepted the current design on 2026-10-31; private testing with friends is starting.** The earlier v1.0 functionality was accepted by the owner on 2026-10-30. This is not an official Turība product and the repository remains private. The owner authorized sharing the installation kit privately with friends; public distribution has not been authorized.

## Installation package

**[Open the iPhone installation folder — RU / LV / EN](install/README.md)**

**[Download the phone-only ZIP](https://github.com/DanielsErglis/turiba-next/blob/main/install/TURIBA-NEXT-iPhone.zip?raw=true)**. It contains the ready-made script and complete beginner instructions in Russian, Latvian and English. Extract it in Files and open INSTALL.html to choose a language. No computer, Node.js, university password or additional runtime module is required.

GitHub links require access to this private repository. For friends without access, send the ZIP file itself by messaging or AirDrop. The archive works without repository access and contains no personal settings/cache or development files. The JavaScript remains readable by recipients.

Detailed guides: [Русский](install/INSTALL_RU.md), [Latviešu](install/INSTALL_LV.md), [English](install/INSTALL_EN.md). See also [troubleshooting](docs/TROUBLESHOOTING.md), [privacy](docs/PRIVACY.md), and the [testing checklist](docs/IPHONE_CHECKLIST.md).

The original developer-oriented versioned artifacts remain under dist/. Rebuild the phone kit with `python3 tools/package-iphone.py` after updating the bundled script or guides.

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

92 full-suite tests and 14 alternate-host-zone core tests passed. The native API mocks and browser renderer preview do not establish iPhone behavior. See [validation](docs/VALIDATION.md), [source research](docs/SOURCE_RESEARCH.md), [architecture](docs/ARCHITECTURE.md), PROJECT_SPEC.md and PROGRESS.md for exact results and remaining work.

The source returns the same unpublished message for unknown groups, so catalog verification is independent. Empty/unpublished weeks never prove a day off or replace valid cache. Observed negative week links returned the next week; every requested week is checked against returned dates. Sunday is treated specially by the source. Missing rooms and unpublished personal BATIS information remain unknown. No exact refresh, reminder-delivery or Shortcuts automation timing is guaranteed.

The package contains no official university logo or commercial font files. No public release, hosting, App Store publication or paid service has been enabled.

## Visual update

The 2026-10-31 owner reference is implemented with larger subject/room text, a separate Medium room card, and a next-subject row with a large right-aligned time. The unofficial-project widget footer is removed by owner request. About/Privacy provenance remains. See docs/DESIGN_UPDATE.md for layout decisions and actual preview checks. No schedule, settings schema or reminder logic was changed.
