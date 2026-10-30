# TURĪBA NEXT

Independent student timetable widget for iPhone using Scriptable. The project is under development in a private repository; it is not an installable release yet and has not been verified on a physical iPhone.

## Current implementation

Phase 0 access is complete. Phase 1 provides dependency-free HTML parsing, group/branch catalog discovery, source-derived day/branch time grids, normalized lessons, explicit publication uncertainty, and an injectable HTTPS source client. See PROJECT_SPEC.md for complete requirements, PROGRESS.md for status, and docs/SOURCE_RESEARCH.md for actual evidence and limitations.

No credentials, developer server, telemetry or external runtime dependencies are required. Source scripts are never executed. Research HTML remains static test evidence and will not be included in the product package.

## Development checks

With Node.js 20 or later available:

```sh
node --test tests/*.test.js
```

In this workspace the bundled executable is:

```sh
/Users/danielerglis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.js
```

Tests use captured fixtures and synthetic edge cases; they do not query the live server. `python3 tools/capture-fixtures.py` explicitly refreshes the bounded public-source evidence over HTTPS and is a manual research operation. Refreshing replaces snapshots; review resulting source changes and update assertions only after investigating them.

## Known limitations

Source negative week navigation returned the next week in observed requests; requested week dates must be checked. The source's unpublished message is also returned for unknown groups, so group existence requires catalog verification. Empty tables do not establish a published week with no lessons. Native UI, cache, temporal engine, settings, reminders and installation packaging are later phases.

The project must remain private until the owner authorizes public distribution. No official university logo is included.
