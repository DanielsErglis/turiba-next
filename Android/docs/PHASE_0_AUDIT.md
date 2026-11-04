# Phase 0 audit — 2026-11-04

## Verified baseline

The owner's Android assignment was explicitly adopted after clarifying that Android/ is for native development, not a duplicate Scriptable distribution. Read the complete attachment, root AGENTS.md/PROJECT_SPEC.md/PROGRESS.md/package.json/README.md, source architecture/research, parser/tokenizer/source client, time/state/choice rules, cache/synchronization and reminder implementation. Existing release is iPhone 1.1.0-rc.2, following accepted v1.0. No Android source existed; Android/ was empty.

Authenticated GitHub connector returned default branch main at `feebd7e129a3d071e731e14e665df92da00fb0a7`, tree `ea072b63e4ff2b3edefc7163da722686bed2f4fd`. Current head message: Prepare private iPhone installation kit with complete RU, LV and EN guides. Retrieved package metadata, parser, state engine, generated script and progress at that exact commit. Their Git blob SHAs match local bytes. This is a selected-file identity check, not a full remote/local tree comparison.

GitHub reported visibility PUBLIC, contradicting historical private claims. The owner explicitly amended the requirement to use the public repository on 2026-11-04. No visibility change was performed. Created android-development from the verified main SHA. Only the authorized repository was accessed for project work. No main changes or merge. Public source authorization is distinct from private APK testing/store distribution.

The workspace has no .git and `git status --short` fails with not a git repository. The authenticated connector provides remote commits; do not claim local commits or git push. docs/IPHONE_BASELINE.json records original file SHA-256 values so subsequent checks can prove preservation without altering iPhone records.

## Executed checks

`/Users/danielerglis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.js`: 92 passed, 0 failed, 0 skipped. This includes 24 captured-fixture integrity checks, source behavior, time/choices/cache/reminders, application mocks, widget variants and deterministic bundle verification. Test names/results distinguish real captured and synthetic coverage. This is the JS baseline, not Kotlin/emulator/device evidence.

Tool inventory: macOS arm64; approximately 150 GiB available. No Android Studio under /Applications; gradle/adb not on PATH; no SDK at ~/Library/Android/sdk or other standard probed locations; no ~/.gradle; only Oracle Java 8 found initially by java_home. This is a bounded inventory, not proof that no other installation exists anywhere.

Project-local Temurin JDK 17.0.21+9 was downloaded from the official Adoptium distribution metadata and SHA-256 checked. `java -version` succeeded. Gradle 9.6.0 downloaded from services.gradle.org and official SHA-256 checked; `gradle --version` succeeded on that JDK. Android command-line-tools arm64 package downloaded from the official SDK catalog with matching SHA-1 (the publisher's provided digest); extracted CLI help succeeded. No global installation or shell profile edit. Exact download SHA-256 values are in ENVIRONMENT.json. The initial Python tar extractor did not support the filter argument; extraction was retried using system tar after digest validation and succeeded.

Sandbox curl initially failed DNS for dl.google.com; the same bounded check through approved escalated execution returned HTTP 200. Official SDK catalog retrieved locally. Android CLI bootstrap required project-local XDG_CACHE_HOME to avoid writing its default external cache. Its first network attempt in the sandbox failed; approved execution succeeded. Subsequent CLI commands use --no-metrics. No CLI authentication, cloud device service or developer account was configured.

Owner explicitly authorized Android SDK license acceptance on 2026-11-04 after receiving the official terms link and local license text. Installation of API 37.0, build-tools 36.0.0 and platform-tools has been started; its final result must be recorded separately before claiming SDK availability. Android Studio is optional for CLI builds, and was not installed. No emulator/device was started in Phase 0. No APK exists yet.

## Architecture and acceptance

docs/ARCHITECTURE.md records the concrete requested Kotlin/Compose/Glance/Room/DataStore/WorkManager design, pure-core separation, source uncertainty rules, explicit DST, responsive widgets, opt-in alarms, coalescing, deletion-generation barrier and backup policy. docs/ACCEPTANCE.md maps phases and device families to evidence. minSdk 29 remains technically appropriate; intended compile/target API 37 uses the verified stable catalog and official documentation, pending actual build resolution. AGP 9.4.0/Gradle 9.6.0/JDK 17 compatibility is documented officially; AGP's fetched POM specifies Kotlin plugin 2.2.10. All library versions must still be resolved/compiled together before final pinning.

Key source limitations persist: catalog/heading distinction; known and unknown unpublished responses are indistinguishable without catalog; empty body is not confirmed free week; exact returned dates control week identity; Sunday server advances; negative navigation anomaly; actual branch/Saturday grids; PIC unsupported without new evidence; no observed consultation sample; private BATIS data remains inaccessible. Reuse existing captured evidence without extra source traffic during audit.

## Phase result and next action

Requirements, access review, architecture, compatibility/acceptance plan and JS baseline are complete. Android toolchain provisioning remains an explicitly tracked follow-up, not a successful build claim. Commit this audit on android-development before Phase 1 implementation; keep main/iPhone bytes unchanged. Then finish SDK provisioning, pin verified dependencies, port strict parser/time/selection/state core, generate common JS expectations and run Kotlin parity tests. Physical Pixel/Samsung/Xiaomi acceptance remains a later indispensable owner/tester action.
