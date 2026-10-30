# Release Readiness — 1.0.0-rc.1

Date: 2026-10-30. Decision: **CANDIDATE PACKAGE PREPARED; NATIVE ACCEPTANCE PENDING**.

## Prepared deliverables

| Deliverable | Evidence |
| --- | --- |
| Complete source | src/, tools/, tests/, project specification and architecture records in the private repository. |
| Single Scriptable file | dist/TURIBA NEXT.js; deterministic build and SHA256SUMS. |
| Installation archive | dist/TURIBA-NEXT-1.0.0-rc.1.zip with exact-entry, CRC and byte verification. |
| Widgets/settings | Small/Medium renderer, setup/settings, group/choice selection, themes and localization implemented; mocks passed. |
| Cache and synchronization | Validated per-group/week records, live-source client check and offline-preservation tests. |
| Optional reminders | OFF/ON, exact lead calculations, idempotent scoped reconciliation, denial and cleanup tests passed with mocks. |
| Documentation | INSTALL_RU, TROUBLESHOOTING, PRIVACY, IPHONE_CHECKLIST, VALIDATION, SOURCE_RESEARCH and ARCHITECTURE. |
| Private Git history | DanielsErglis/turiba-next; phase commits created through the connected GitHub integration. Direct Git HTTPS credentials are not configured. |

## Outstanding required evidence

Import/run, native typography/layout, dynamic theme behavior, native Request/local storage/Intl compatibility, real notification consent/delivery, and core functionality must be confirmed on a physical iPhone. Optional Shortcuts automation requires its own on-device checks before relying on it. No device item is marked passed.

The source's publication ambiguity, negative-week anomaly and Sunday behavior are documented and handled conservatively. Individual private BATIS schedules are unavailable. Future HTML changes may require parser maintenance. Refresh and notification delivery timing are controlled by iOS.

The next owner action is the initial smoke-check section of IPHONE_CHECKLIST.md: import the script, select a real group, compare a lesson with the public source and inspect both widget sizes with reminders still OFF. Report device/iOS/Scriptable versions and any discrepancy. Complete the remaining acceptance checks before final v1.0 sign-off.

No public publication, paid service, broad device access or access to unrelated repositories was performed or requested.
