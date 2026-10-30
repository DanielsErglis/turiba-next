# Public Timetable Source Research — Phase 1

Research date: 2026-10-30 (Europe/Riga). Evidence consists of 24 captured HTTP 200 responses in `tests/fixtures/raw/`; `tests/fixtures/manifest.json` records exact URLs, retrieval times, byte counts, SHA-256 hashes and provenance. Tests run offline against these bytes. Synthetic transformations in tests are explicitly labeled; they are not claimed as captured source examples.

## Endpoints and group discovery

The [public homepage](https://nodarbibas.turiba.lv/) contains an HTML form targeting `pub_nod.asp` with an input named `grupa`. Group links use `pub_nod.asp?Grupa=CODE`. The observed academic catalogs are the default bachelor's page, `?lim=1` (short cycle), `?lim=3` (master's), `?lim=4` (doctoral), and `?lim=5` (branches). Their union contained 279 unique groups. Catalog links and labels identify group existence; the schedule heading alone does not.

Group branch is derived from catalog evidence, not a guessed suffix convention. Main catalog cells contain a branch paragraph followed by group links; a cell can switch from Rīga to Liepāja midway. The branch-only catalog labels columns Talsi, Cēsis and Liepāja. The parser preserves this ordering rather than assuming it matches numeric time-grid IDs.

The linked [PIC page](https://nodarbibas.turiba.lv/pic/?lim=6) was checked and captured. It contained no group timetable links at retrieval time and includes malformed markup. It is not treated as an additional academic group catalog. Lecturer links are not study groups. If PIC later exposes a different timetable format, it requires fresh evidence and an adapter; no support for an unobserved format is claimed.

Runtime catalog requests will be cached in the later storage layer rather than repeated on every widget refresh. Phase 1 SourceClient makes only the five known catalog requests, sequentially, and accepts only HTTPS responses from the approved university origin.

## Encoding and markup

Responses identify HTML; group pages declare UTF-8 with a Content-Type meta tag. The captured bytes decode correctly with Latvian diacritics. Headers alone may provide `text/html` without a charset. Source HTML includes scripts, including analytics/challenge code on some pages. These are evidence bytes only: the parser discards script/style blocks and never runs them, loads resources or creates a browser. Raw research fixtures are not product runtime assets and must not be bundled into the user package.

The group/week heading appears in an `h2` as `Grupa CODE no DD.MM.YYYY līdz DD.MM.YYYY`. The lesson table is inside `.classes_table`, uses a `tr.head2` column header and `tbody.content2` for lessons. Columns are date, lesson information (two logical columns), source group, and room.

Observed row variants:

- Four physical cells: the subject cell has `colspan="2"`, contains `N. Subject`, then group and room.
- Five physical cells: numbered category, actual subject, group and room. This covers electives and subgroup alternatives.
- Subgroup continuation rows leave the numbered category blank. They inherit the period/category within the current date, while preserving their own subject, group and room.
- Number-only categories such as `3.` are valid split rows for real exams (`KFL1S5`). The subject comes from the next cell.
- Blank service rows have an empty merged `.color_2` cell and repeated group/room. They do not represent a lesson. Other unexpectedly blank subjects are errors.
- The date appears on a day's first row and is blank on continuation rows. Reset period/category at every explicit date. Do not carry state across days.

Missing rooms occur in real Liepāja examples and self-study rows. Preserve `null`; do not invent a room. Locations include normal room codes, `A204/1`, `35. kab.`, `C214 ITN`, and `ekskursija`; preserve source text. Repeated subject periods are separate lessons, not duplicates to discard. Long official subject names remain unchanged.

## Branch- and day-specific times

Actual times are embedded in hidden HTML sections `laiks_1` through `laiks_4`; the corresponding `fil_1` through `fil_4` links label the branches. No JavaScript execution is necessary. A day-label block precedes each period list. Riga provides weekday and Saturday lists. The other branches provide Saturday lists in captured pages.

| Branch/day | Period 1 | Period 3 | Period 4 |
| --- | --- | --- | --- |
| Rīga weekdays | 09:00–10:30 | 12:55–14:25 | 14:40–16:10 |
| Rīga Saturday | 09:00–10:30 | 12:45–14:15 | 14:30–16:00 |
| Cēsis Saturday | 09:00–10:30 | 13:00–14:30 | 14:45–16:15 |
| Liepāja Saturday | 10:00–11:30 | 13:45–15:15 | 15:30–17:00 |
| Talsi Saturday | 09:00–10:30 | 12:35–14:05 | 14:10–15:40 |

Riga weekday period 6 is actually shown as 17:55–18:15; preserve source data rather than replacing it with an assumed 90-minute period. The parser extracts every list from the response, selects the branch established by the catalog and uses the actual lesson date's weekday. Unsupported branch/day/period combinations fail with TIME_GRID_MISSING. There is no automatic Riga/Sunday fallback.

Normalized Phase 1 times are local `HH:mm` strings plus ISO calendar date and `Europe/Riga`. Conversion to instants, DST and widget time states belong to Phase 2; no host-time-zone conversion is performed by the parser.

## Weeks, sessions and a source anomaly

The [sample group's current response](https://nodarbibas.turiba.lv/pub_nod.asp?Grupa=TVL2D1) covered 2026-10-26 through 2026-11-01. Navigation links omit the group (`?ned=-1`, `pub_nod.asp`, `?ned=1`) and rely on a server session. Keep group explicit when constructing requests, so separate widget groups cannot contaminate one another.

Observed requests and returned headings:

| Request variant | Returned week start |
| --- | --- |
| Group with no ned | 2026-10-26 |
| Group with ned=0 | 2026-10-26 |
| Group with ned=1 | 2026-11-02 |
| Group with ned=2 | 2026-11-09 |
| Group with ned=-1 | 2026-11-02 (unexpected) |
| Session initialized with the group, then literal previous link ned=-1 | 2026-11-02 (unexpected) |

The negative-offset result was reproduced with a temporary cookie jar, not merely an uninitialized session. Do not claim historical-week retrieval is working. The parser returns the actual heading dates and rejects a mismatched expectedWeekStart. The source client never relabels a future week as historical. Cookies used for research were temporary and were not saved to the repository.

The page explicitly warns that Sunday considers the following week current. Phase 2 must account for the returned heading rather than assuming the server's current week always contains today's date. Request parameters are not evidence that the expected week was delivered.

## Electives, subgroups and lesson annotations

`TVL2D1` has split `Izvēles studiju kursi*` rows such as Pakalpojumu mārketings with source group `TVL2D_IB01`. `CSA1D1` has `Study Courses by choice*` alternatives, language subgroups and continuation rows. Preserve the exact source group as subgroup when it differs from the selected group, and mark electives/subgroups as requiring user selection. The parser does not choose alternatives on the student's behalf.

Real `KFL1S5` rows explicitly contain `(eksāmens)` and normalize as exam. Self-dependent studies in `CSA1D1` normalize as selfStudy, preserving missing rooms and red source-change markup. Consultation recognition is tested using a clearly labeled synthetic modification; no actual consultation row was observed in the bounded sample. Do not claim live consultation coverage.

The source footnotes distinguish: one star for individual schedules, two for a proposed session exam/pre-exam consultation awaiting review, and three for delivery-mode information available from the teacher in BATIS. Preserve separate flags; do not interpret three stars as a proposed exam or infer online/in-person delivery. No BATIS access or individual private schedule is available.

## Publication ambiguity and safe outcomes

The known, catalog-listed `DKL1V1` and the deliberately nonexistent `NONEXISTENTPHASE0` both return HTTP 200 with a heading echoing the group and the same `nav_public` message: the schedule is not published this week. Therefore neither HTTP 200 nor the echoed group proves existence.

Use catalog membership separately. Unknown catalog codes yield UNKNOWN_GROUP before schedule fetching in SourceClient. A known group with the observed message yields `unpublished`, with PUBLICATION_REASON_UNVERIFIED; it never means a confirmed day off. A direct parse without catalog evidence yields `unverifiedGroup`. A structurally valid but empty lesson body yields `emptyUnconfirmed`; the source provides no observed authoritative marker that proves a genuinely empty published week. Do not overwrite good cache or assert “no classes” on these ambiguous outcomes. A day with no selected lessons within an otherwise published verified week can be handled separately by the engine.

Other typed errors distinguish invalid input, network failure, timeout, HTTP failure, invalid response, HTML parse error, changed structure, group/week mismatch and absent time grid. Missing room is a valid lesson with a warning. Challenge-only or truncated HTML is an error, never an empty timetable.

## Desktop/mobile comparison and remaining evidence gaps

The current TVL2D1 page was fetched with curl's default user agent and an iPhone user agent. Normalized content matched exactly. This is a bounded source-response comparison, not proof of native widget rendering or every possible device-dependent response.

No source guarantee exists for future HTML stability, past-week retrieval, publication semantics of empty tables, completeness of individual choices, or Sunday time grids. These limitations remain explicit. Keep the last verified cache on failures and display uncertainty in later UI phases. Native Scriptable Request redirects/timeouts, Unicode/Intl support if used later, and all actual iPhone widget behavior still require runtime integration and device verification.
