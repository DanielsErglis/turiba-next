# Development Rules

## Authority and workflow

- Follow PROJECT_SPEC.md, translated from the owner's complete TURĪBA NEXT v1.0 brief dated 2026-10-30. Owner instructions take precedence. Preserve requirements rather than silently reducing scope.
- Phase 0 is complete; evidence is in PHASE_0_AUDIT.md. Work through Phases 1–6 in order, proceeding autonomously within authorized scope.
- Communicate with the owner in Russian. Use English for internal documentation, comments, identifiers, technical diagnostics, work records, and commit messages. Localized UI, source subject names, and multilingual fixtures are permitted exceptions.
- After each completed phase, run appropriate checks, update PROGRESS.md with actual results, limitations and next action, and commit the work. Never claim unperformed checks.
- The only authorized remote repository is DanielsErglis/turiba-next; keep it private. Use the authenticated GitHub connector when direct Git transport is unavailable. Inspect current remote state before updates and do not overwrite owner changes.
- Ask only for missing permissions, material requirement/architecture changes, paid services, physical iPhone checks, or otherwise indispensable information. No new paid services or public distribution without authorization.

## Engineering and privacy

- Target Scriptable JavaScript on iPhone. Node.js is for development, tests and bundling only. Keep runtime modules independently testable and avoid unnecessary dependencies.
- Use Europe/Riga for all schedule dates and times, including DST and date/week boundaries. Never infer a universal timetable from lesson numbers.
- Base parsing on captured public HTML evidence. Reject malformed or changed structure; never invent lessons, rooms or times. Keep last valid cache on fetch/parse failure.
- Distinguish empty, unpublished/unknown publication state, unknown group, transport failure, parse failure and structure change to the extent supported by evidence. Document source ambiguity explicitly.
- Electives and subgroup alternatives require user selection; never automatically treat all as required.
- Runtime networking must use HTTPS to nodarbibas.turiba.lv. No telemetry, own server, accounts, trackers, remote logging, remote code execution or credentials.
- Store settings and cache with FileManager.local(), not iCloud by default. Do not describe local files as encrypted.
- Notifications are OFF by default. OFF must neither request consent nor schedule notifications. Touch only project-owned notification identifiers; only the main group owns reminders.
- Include Delete My Data and preserve unrelated Scriptable data.
- No official university logos or commercial font files. Use system fonts and an independent student project notice.

## Verification and delivery

- Record fixture URLs, retrieval dates, hashes, provenance and observed limitations. Clearly label synthetic fixtures separately from captured source.
- Cover real multiple-group/week data, Saturday/branch time grids, electives, exams, missing rooms, duplicate periods, malformed HTML, network/cache failures, Riga DST, states, languages/themes/sizes, notification OFF/ON and data deletion.
- Browser previews and Scriptable mocks do not establish native iOS correctness. Real iPhone acceptance is required before marking v1.0 complete.
- Save progress before quota exhaustion; do not promise automatic resumption unless configured.
- Bundled Node path: /Users/danielerglis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node. No global installation is required.
