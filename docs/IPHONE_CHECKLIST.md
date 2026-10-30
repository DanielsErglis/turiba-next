# Visual update acceptance — 1.1.0-rc.1

The accepted v1.0 behavior is preserved below as historical evidence. The 2026-10-31 layout update has not yet been confirmed on a physical iPhone. Check Small/Medium readability, room-card fit, next-subject/time placement and Light/Dark/System appearance after updating the script without deleting data. Do not transfer v1.0 visual acceptance automatically to the new layout.

# Physical iPhone Acceptance — Owner Confirmed

Accepted for v1.0 on 2026-10-30 (Europe/Riga). Tested candidate: 1.0.0-rc.4. Evidence: after the developer listed the native acceptance areas, the owner replied that everything had been checked and worked (English translation of the owner's Russian confirmation). The developer did not operate the device and does not claim independent native verification.

Device model, iOS version, Scriptable version and item-by-item measurements were not supplied. The previously entered group was TVL2D1; the owner did not separately enumerate all groups used during acceptance. Do not invent device metadata or individual test outcomes.

## Acceptance scope

The immediately preceding checklist covered:

1. Small and Medium widgets: subject, room and time.
2. Languages, themes, electives and additional groups.
3. Offline use and settings persistence.
4. Enabling, delivery and disabling of reminders.
5. Data deletion; Shortcuts if needed.

These areas are recorded as accepted through the owner's overall confirmation, not as independently observed per-case passes. Specific denied-permission, other-script coexistence, edge-date and native timing observations were not itemized. Automated regression tests provide separate code-level evidence for those paths. Optional Shortcuts runs and the exact 07:00/12:00/20:00 automation times are not individually attested and are not claimed as independently verified.

## Decision and final promotion

**ACCEPTED BY OWNER for v1.0.** Promote rc.4 without functional runtime changes. Only version/acceptance metadata, documentation and packaging change. The source's publication ambiguity and iOS refresh/delivery limitations remain documented. No public distribution, repository visibility change or paid service is authorized by this acceptance.

The following sections preserve the earlier troubleshooting record. Statements about pending retests describe their historical candidate state and are superseded by the owner confirmation above.

## Owner report — rc.1

On 2026-10-30 the owner supplied an iPhone screenshot of the generic error alert and confirmed it appears immediately after language selection. This confirms import/execution and reaching language selection, but setup did not complete. The exact underlying exception was hidden by rc.1. Device/iOS/Scriptable versions are not yet known. rc.2 exposes local diagnostic stage/code/cause and adds a native dismissal grace period; the cause and fix on the actual phone remain unconfirmed.

## rc.3 confirmed storage fix

Owner screenshot IMG_9303.PNG of rc.2 establishes a settings.save STORAGE_WRITE_ERROR caused by move refusing an existing destination. rc.3 removes that assumption and adds verified backup/install/rollback/recovery. The stricter native filesystem mock and six new regressions pass; the full suite has 84 passes and zero failures. Earlier statements that the cause was unknown describe the earlier rc.1/rc.2 investigation only. Native rc.3 setup success is still pending.

## rc.4 input capture retest

Owner IMG_9304.PNG shows a non-string native text result during group validation despite entering valid TVL2D1. rc.4 captures before the dismissal timer, awaits asynchronous results and can read the retained TextField.text reference. Five regressions pass; the suite has 89 passes and zero failures. Which native mechanism caused the non-string result is not established. Real-device group setup remains unaccepted until retested.
