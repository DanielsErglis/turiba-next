"""Create and verify a deterministic installation archive without private research fixtures."""

from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
ACCEPTANCE = ("physical-iPhone verification pending" if "-" in VERSION else
              "owner-confirmed iPhone acceptance on 2026-10-30; detailed device metadata not supplied")
OUTPUT = ROOT / "dist"
FILES = {
    "TURIBA NEXT.js": (OUTPUT / "TURIBA NEXT.js").read_bytes(),
    "SHA256SUMS": (OUTPUT / "SHA256SUMS").read_bytes(),
    "README.md": (
        "# TURIBA NEXT " + VERSION + "\n\n"
        "Independent student project. Acceptance: " + ACCEPTANCE + ".\n\n"
        "Import TURIBA NEXT.js into Scriptable. No Node.js or extra modules are needed on the phone. "
        "Read docs/INSTALL_RU.md for setup and updates, docs/PRIVACY.md for privacy, "
        "docs/TROUBLESHOOTING.md for help, and docs/IPHONE_CHECKLIST.md for required native checks.\n\n"
        "Development source and history: https://github.com/DanielsErglis/turiba-next (private). "
        "No public distribution is authorized.\n"
    ).encode("utf-8"),
}
for name in ["INSTALL_RU.md", "PRIVACY.md", "TROUBLESHOOTING.md", "IPHONE_CHECKLIST.md", "VALIDATION.md"]:
    FILES["docs/" + name] = (ROOT / "docs" / name).read_bytes()
manifest = {"version": VERSION, "acceptance": ACCEPTANCE,
            "files": {name: hashlib.sha256(data).hexdigest() for name, data in sorted(FILES.items())}}
manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
FILES["RELEASE_MANIFEST.json"] = manifest_bytes
(OUTPUT / "RELEASE_MANIFEST.json").write_bytes(manifest_bytes)
archive = OUTPUT / ("TURIBA-NEXT-" + VERSION + ".zip")
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as handle:
    for name, data in sorted(FILES.items()):
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 30, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        handle.writestr(info, data)
with zipfile.ZipFile(archive) as handle:
    assert handle.testzip() is None
    assert set(handle.namelist()) == set(FILES)
    for name, data in FILES.items():
        assert handle.read(name) == data, name
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(OUTPUT / (archive.name + ".sha256")).write_text(digest + "  " + archive.name + "\n")
print("Verified", archive.name, archive.stat().st_size, "bytes;", len(FILES), "entries; SHA-256", digest)
