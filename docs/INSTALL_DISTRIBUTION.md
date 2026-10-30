# Private iPhone installation distribution

Date: 2026-10-31. Software: 1.1.0-rc.2 (unchanged runtime).

The owner accepted the current design and requested a phone-only kit for private testing with friends. Keep DanielsErglis/turiba-next private. No public release, public hosting, visibility change or invitation was requested or performed.

## Handoff

Use install/README.md as the GitHub entry point. Download install/TURIBA-NEXT-iPhone.zip using the raw-download link or GitHub's Download raw file action. Repository authentication is required. A 404 for an unauthenticated friend is expected, not an installation failure.

Send the actual ZIP to friends by messaging or AirDrop; do not send personal settings/cache or give repository access merely for installation. Recipients save it in Files, tap to extract, open INSTALL.html and choose RU/LV/EN. The six-entry archive includes only TURIBA NEXT.js, INSTALL.html, README.md and the three full language guides. Each guide covers download/extraction, conditional native import, complete-text copy fallback, first launch, group/elective setup, Small/Medium widget selection, reminders, updates and troubleshooting.

The script is deliberately readable and unchanged from dist/TURIBA NEXT.js. The offline HTML has no executable JavaScript or external assets. Its readonly textarea contains the exact script for manual transfer. Markdown guides are alternatives if a phone limits local HTML preview. Share/import and text-selection interfaces vary; the owner/friends still need to exercise their actual native installation paths.

## Rebuild and verification

After building the script and updating all three guides, run `python3 tools/package-iphone.py`. It creates the folder copies, deterministic ZIP and docs/IPHONE_INSTALL_KIT.json with hashes, CRC and exact-byte checks. Browser verification also confirmed three substantial language sections, correct anchors, script equality, no executed code and no page overflow at 320px/390px; mobile screenshots were visually inspected. This does not establish all iPhone installation routes.

No software version bump, runtime changes, new permissions, data reset or new service was needed. The original versioned developer archive remains available under dist/.
