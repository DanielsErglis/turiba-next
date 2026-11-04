# Live source check — 2026-11-04

A signed release UI smoke check exposed `UNSAFE_REDIRECT` before group setup. A bounded diagnostic probe reproduced HTTP 302 with `Location: mobile.asp` for all five catalog URLs when User-Agent contained `TURIBA-NEXT-Android/0.1`. Redirect following remained disabled. The same root URL with `TURIBA-NEXT/0.1` returned HTTP 200 desktop HTML. The schedule endpoint itself returned 200.

The Android transport now requests `TURIBA-NEXT/0.1` explicitly, avoiding the source's mobile-agent branch while retaining exact-host HTTPS, default TLS and unconditional redirect rejection. A transport regression asserts this actual request header. No mobile parser, redirect exception or source JS execution was introduced.

Seven fresh public HTML captures (five catalogs and TVL2D1 current/next) reside in core/src/test/resources/captured-2026-11-04 with per-file URL, UTC retrieval timestamp, byte count, SHA-256, agent and provenance in manifest.json. They are test evidence only and are excluded from the production APK. The original iPhone fixtures remain unchanged. New captures are point-in-time observations, not invented fixtures or proof of future publication.

The JVM check validates all seven hashes, the 279-group merged catalog and two nonempty published TVL2D1 weeks beginning 2026-11-02/2026-11-09. Earlier shared-JS parity still covers the original 18 schedule cases, 978 state boundaries and 48 reminder plans on both API 29 and API 37. New captures are not falsely described as additional shared-JS golden cases.
