# Visual Update Readiness — 1.1.0-rc.1

Date: 2026-10-31 (Europe/Riga). Decision: implementation and independent checks complete; native appearance review pending.

The owner requested the supplied design reference, larger subject/room/next-lesson typography and removal of the unofficial-project widget footer. These changes are implemented; the earlier v1.0 acceptance applies to functionality and is not claimed as native acceptance of this new layout.

Deliverables: dist/TURIBA NEXT.js, dist/TURIBA-NEXT-1.1.0-rc.1.zip, checksums and documentation. Source and history remain in the private repository. No publication or new service is authorized.

91 tests passed. The generated renderer preview was inspected and 26 examples passed browser bounds checks, including a narrow iPhone bucket and source-data edge cases. See DESIGN_UPDATE.md. Actual iPhone typography/stack sizing still needs a short check after replacing code in the existing script. No settings reset or new permissions are required.

The timetable engine, source client, storage, settings schema and reminder planning were not changed by this design update. Documented source/iOS limitations and optional automation caveats remain in effect.
