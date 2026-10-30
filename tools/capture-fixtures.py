"""Capture public timetable evidence without executing page scripts.

Run manually only. Tests never access the live university website.
"""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "tests/fixtures/raw"
ORIGIN = "https://nodarbibas.turiba.lv/"
CAPTURES = [
    ("home", "", None),
    ("branches", "?lim=5", None),
    ("tvl2d1-current", "pub_nod.asp?Grupa=TVL2D1", None),
    ("tvl2d1-previous", "pub_nod.asp?Grupa=TVL2D1&ned=-1", None),
    ("tvl2d1-next", "pub_nod.asp?Grupa=TVL2D1&ned=1", None),
    ("tvl2d1-mobile", "pub_nod.asp?Grupa=TVL2D1", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"),
    ("bll2s1-current", "pub_nod.asp?Grupa=BLL2S1", None),
    ("csa1d1-current", "pub_nod.asp?Grupa=CSA1D1", None),
    ("tbl1s5-current", "pub_nod.asp?Grupa=TBL1S5", None),
    ("unknown-group", "pub_nod.asp?Grupa=NONEXISTENTPHASE0", None),
    ("tvl2d1-zero", "pub_nod.asp?Grupa=TVL2D1&ned=0", None),
    ("tvl2d1-two", "pub_nod.asp?Grupa=TVL2D1&ned=2", None),
    ("kfl1s3-current", "pub_nod.asp?Grupa=KFL1S3", None),
    ("kfl1s6-current", "pub_nod.asp?Grupa=KFL1S6", None),
    ("kfl1s5-current", "pub_nod.asp?Grupa=KFL1S5", None),
    ("tvl2d1-session-start", "pub_nod.asp?Grupa=TVL2D1", None),
    ("tvl2d1-session-previous", "pub_nod.asp?ned=-1", None),
    ("tvl2d1-session-next", "pub_nod.asp?ned=1", None),
    ("college", "?lim=1", None),
    ("masters", "?lim=3", None),
    ("doctoral", "?lim=4", None),
    ("dkl1v1-current", "pub_nod.asp?Grupa=DKL1V1", None),
    ("bml1v1-current", "pub_nod.asp?Grupa=BML1V1", None),
    ("pic", "pic/?lim=6", None),
]


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    with tempfile.TemporaryDirectory(prefix="turiba-capture-") as temporary:
        cookie_path = Path(temporary) / "session-cookies.txt"
        for name, relative, agent in CAPTURES:
            path = OUTPUT / (name + ".html")
            headers_path = Path(temporary) / "headers.txt"
            command = ["curl", "--fail", "--silent", "--show-error", "--max-time", "25",
                       "--proto", "=https", "--dump-header", str(headers_path),
                       "--output", str(path), "--write-out", "%{http_code}", ORIGIN + relative]
            if agent:
                command.extend(["--user-agent", agent])
            if "-session-" in name:
                command.extend(["--cookie", str(cookie_path), "--cookie-jar", str(cookie_path)])
            status = subprocess.check_output(command, text=True).strip()
            headers = headers_path.read_text()
            data = path.read_bytes()
            content_type = next((line.split(":", 1)[1].strip() for line in headers.splitlines()
                                 if line.lower().startswith("content-type:")), None)
            entry = dict(file=str(path.relative_to(ROOT)), url=ORIGIN + relative,
                         retrievedAt=datetime.now(timezone.utc).isoformat(), status=int(status),
                         contentType=content_type, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                         provenance="captured", userAgent=agent or "curl (default)")
            if "-session-" in name:
                entry["sessionSequence"] = name
            manifest.append(entry)
            print(name, status, len(data))
            time.sleep(0.25)
    (ROOT / "tests/fixtures/manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
