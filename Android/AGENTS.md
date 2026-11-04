# Android development rules

The owner explicitly adopted the attached Android brief on 2026-11-04. Within this directory, Kotlin/Android requirements supersede the root's Scriptable-only implementation requirements. Preserve the working iPhone files outside this directory. All other correctness and privacy rules remain applicable.

- Work through Android Phases 0–6 in order. Read PROJECT_SPEC.md, docs/ARCHITECTURE.md and PROGRESS.md before implementation.
- Communicate with the owner in Russian; keep code, comments and engineering records in English.
- Owner amendment on 2026-11-04 explicitly authorizes the existing PUBLIC DanielsErglis/turiba-next repository. Do not change visibility. Use android-development; do not merge into main without approval. The owner additionally authorized publishing the first test APK under Android/ on GitHub on 2026-11-04. This does not authorize store publication or unrelated artifacts.
- Keep all Android implementation, build configuration, documentation and delivery artifacts here. Reuse ../tests/fixtures without changing original evidence. Never include raw fixtures in application assets.
- Use Kotlin, Compose, Glance, Room, DataStore and WorkManager. Keep pure schedule logic independent of Android. No embedded JavaScript engine, Flutter, React Native or WebView.
- Runtime networking: HTTPS to the exact nodarbibas.turiba.lv host only, with normal certificate validation and rejected redirects. No telemetry, accounts, advertisements, credentials or remote code.
- Use Europe/Riga explicitly; reject DST gaps and unresolved overlaps. Derive period times from captured source grids. Preserve publication ambiguity and valid cached data.
- Alternatives require explicit selection. Reminders default OFF, with no permission request or planning while OFF; only the main group owns reminders.
- Disable cloud backup/transfer of settings/cache. Use app internal storage. Delete My Data must prevent in-flight work from restoring deleted data.
- Project-local toolchain and caches belong in ignored .toolchain/.gradle directories. Signing keys/passwords must never enter Git, chat or logs.
- Record actual checks and limitations after every phase and commit through the authenticated GitHub connector if Git transport is unavailable. Do not claim emulator or device results without execution. Physical Pixel, Samsung and Xiaomi acceptance is required before full completion.
- Android SDK license acceptance was explicitly authorized by the owner on 2026-11-04 for this project.
