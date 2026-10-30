# Release Readiness — 1.0.0

Date: 2026-10-30 (Europe/Riga). Decision: **ACCEPTED BY OWNER; FINAL PRIVATE PACKAGE PREPARED**.

The owner confirmed that all requested iPhone checks worked after rc.4. Native evidence is owner-reported; the developer did not operate the phone. Device/iOS/Scriptable versions and detailed per-case results were not supplied. See IPHONE_CHECKLIST.md for the exact scope and provenance.

## Delivered

- Full source, tests, research evidence and phase history in the private DanielsErglis/turiba-next repository.
- dist/TURIBA NEXT.js: one self-contained Scriptable file; no Node.js or extra runtime modules on the phone.
- dist/TURIBA-NEXT-1.0.0.zip, script/archive checksums and a per-file release manifest.
- Small/Medium, LV/EN/RU, system/light/dark themes, settings, per-widget groups, explicit choices, conservative local cache, synchronization, opt-in scoped reminders and data deletion.
- Installation/update instructions, troubleshooting, privacy policy, architecture, source research and validation documents.

Final v1.0 promotes the accepted rc.4 runtime without changing functional source modules. Version/acceptance metadata and documentation are updated; the final build and archive are checked independently.

## Retained limitations

Source publication ambiguity, negative-week navigation and Sunday behavior are handled conservatively. Private individual BATIS data is unavailable. Future source HTML changes may require maintenance. iOS controls refresh and notification delivery timing. Optional scheduled Shortcuts runs have no separately itemized acceptance evidence and should be checked on the owner's device before relying on them. No universal device/version certification is claimed.

The repository remains private. No public GitHub release, App Store submission, hosting, new service or public distribution was performed. Direct Git HTTPS credentials remain unconfigured; repository changes are saved through the connected GitHub integration.
