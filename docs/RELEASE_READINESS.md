# Visual Update Readiness — 1.1.0-rc.2

Date: 2026-10-31 (Europe/Riga). Decision: implementation and independent checks complete; native appearance review pending.

The owner requested the supplied design reference, larger subject/room/next-lesson typography and removal of the unofficial-project widget footer. These changes are implemented; the earlier v1.0 acceptance applies to functionality and is not claimed as native acceptance of this new layout.

Deliverables: dist/TURIBA NEXT.js, dist/TURIBA-NEXT-1.1.0-rc.2.zip, checksums and documentation. Source and history remain in the private repository. No publication or new service is authorized.

92 tests passed. The generated renderer preview was inspected and 26 examples passed browser bounds checks, including a narrow iPhone bucket and source-data edge cases. See DESIGN_UPDATE.md. Actual iPhone typography/stack sizing still needs a short check after replacing code in the existing script. No settings reset or new permissions are required.

The timetable engine, source client, storage, settings schema and reminder planning were not changed by this design update. Documented source/iOS limitations and optional automation caveats remain in effect.

## rc.2 native room-fit follow-up

The owner reported Medium truncating C216 to C2… in rc.1 while Small showed it completely. rc.2 removes competing side spacers, gives the text the full room-card content width and permits additional fitting for short codes. The preferred large font is retained. 92 tests passed, including a four-width allocation regression; 26 browser samples had no out-of-bounds elements and the reference preview was inspected. This is not yet confirmation of native rc.2 room fit.
