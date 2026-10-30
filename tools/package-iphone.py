"""Build the phone-only install folder from the existing script and RU/LV/EN guides.

The offline HTML never executes the embedded script. Its readonly text area is a
manual-copy fallback when iOS does not offer a direct Scriptable file import.
"""

from pathlib import Path
import hashlib
import html
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "install"
VERSION = json.loads((ROOT / "package.json").read_text())["version"]
SCRIPT = (ROOT / "dist/TURIBA NEXT.js").read_bytes()
GUIDES = {lang: (OUTPUT / f"INSTALL_{lang.upper()}.md").read_text() for lang in ("ru", "lv", "en")}


def inline(value):
    pattern = r"(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))"
    result = []
    for item in re.split(pattern, value):
        if item.startswith("`") and item.endswith("`"):
            result.append("<code>" + html.escape(item[1:-1]) + "</code>")
        elif item.startswith("**") and item.endswith("**"):
            result.append("<strong>" + inline(item[2:-2]) + "</strong>")
        elif re.fullmatch(r"\[([^\]]+)\]\(([^)]+)\)", item):
            label, href = re.fullmatch(r"\[([^\]]+)\]\(([^)]+)\)", item).groups()
            if not href.startswith("https://"):
                raise ValueError("Unexpected guide link scheme")
            result.append('<a href="' + html.escape(href, quote=True) + '">' + inline(label) + "</a>")
        else:
            result.append(html.escape(item))
    return "".join(result)


def render(markdown, prefix):
    lines = markdown.splitlines()
    blocks, headings = [], []
    index = 0
    heading_count = 0
    while index < len(lines):
        line = lines[index].strip()
        if not line:
            index += 1
            continue
        heading = re.match(r"^(#{1,3}) (.+)$", line)
        if heading:
            level = len(heading[1])
            heading_count += 1
            anchor = prefix + "-section-" + str(heading_count)
            if level == 2:
                headings.append((anchor, heading[2]))
            blocks.append(f'<h{level} id="{anchor}">' + inline(heading[2]) + f"</h{level}>")
            index += 1
            continue
        if line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                row = lines[index].strip().strip("|").split("|")
                if not all(re.fullmatch(r"\s*:?-+:?\s*", cell) for cell in row):
                    rows.append(row)
                index += 1
            table = ['<div class="table-scroll"><table>']
            for number, row in enumerate(rows):
                cell = "th" if number == 0 else "td"
                table.append("<tr>" + "".join(f"<{cell}>" + inline(value.strip()) + f"</{cell}>" for value in row) + "</tr>")
            table.append("</table></div>")
            blocks.append("".join(table))
            continue
        numbered = re.match(r"^(\d+)\. (.+)$", line)
        if numbered or line.startswith("- "):
            ordered = bool(numbered)
            tag = "ol" if ordered else "ul"
            start = ' start="' + numbered[1] + '"' if ordered else ""
            items = []
            while index < len(lines):
                current = lines[index].strip()
                match = re.match(r"^\d+\. (.+)$", current) if ordered else re.match(r"^- (.+)$", current)
                if not match:
                    break
                items.append("<li>" + inline(match[1]) + "</li>")
                index += 1
            blocks.append("<" + tag + start + ">" + "".join(items) + "</" + tag + ">")
            continue
        paragraph = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not re.match(r"^(#{1,3} |\d+\. |- |\|)", lines[index].strip()):
            paragraph.append(lines[index].strip())
            index += 1
        blocks.append("<p>" + inline(" ".join(paragraph)) + "</p>")
    return "\n".join(blocks), headings


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sections = []
    labels = {"ru": "Русский", "lv": "Latviešu", "en": "English"}
    for lang, guide in GUIDES.items():
        # The archive is already downloaded; omit its first download section offline.
        offline = re.sub(r"## [^\n]+\n[\s\S]*?(?=\n## )", "", guide, count=1)
        body, headings = render(offline, lang)
        navigation = "".join('<li><a href="#' + anchor + '">' + html.escape(title) + "</a></li>" for anchor, title in headings)
        sections.append('<section id="' + lang + '" lang="' + lang + '"><article><a href="#languages">RU / LV / EN ↑</a><h2>' + labels[lang] + '</h2><p><a href="#copy-script">Код для копирования / Kopējamais kods / Copy the script</a></p><details class="toc"><summary>Шаги / Soļi / Steps</summary><nav><ol>' + navigation + '</ol></nav></details>' + body + '</article></section>')
    page = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">
<title>TURĪBA NEXT — iPhone · RU / LV / EN</title>
<style>
:root{color-scheme:light;--ink:#123447;--muted:#476575;--blue:#006486;--line:#d7e7ee}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#edf5f9;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:18px;line-height:1.7}
main{max-width:850px;margin:auto;padding:20px 18px 56px}header{background:#062d3e;color:white;border-radius:24px;padding:24px 22px;margin:0 0 22px}header h1{font-size:28px;margin:8px 0 12px;line-height:1.15}header p{color:#c5e0ea;margin:10px 0}header .tag{font-size:13px;font-weight:700;letter-spacing:.07em;color:#42cff5;text-transform:uppercase}.button{display:inline-block;background:#42cff5;color:#062d3e;padding:12px 16px;border-radius:12px;font-weight:700;text-decoration:none;margin-top:8px}
article,details.toc{background:white;border:1px solid var(--line);border-radius:20px;padding:22px;margin-top:18px}h1{font-size:27px;line-height:1.25}h2{font-size:25px;line-height:1.3;border-top:2px solid var(--line);padding-top:28px;margin-top:38px;scroll-margin-top:16px}h3{font-size:20px;line-height:1.4;margin-top:28px}p{margin:16px 0}li{padding-left:4px;margin:14px 0}ol,ul{padding-left:25px}a{color:var(--blue);text-underline-offset:3px;overflow-wrap:anywhere}code{background:#eaf3f7;border-radius:5px;padding:2px 4px;font-size:.89em;overflow-wrap:anywhere}strong{font-weight:750}.table-scroll{overflow-x:auto}table{border-collapse:collapse;font-size:16px;width:100%}th,td{text-align:left;border-bottom:1px solid var(--line);padding:12px 8px;vertical-align:top;overflow-wrap:anywhere}summary{cursor:pointer;font-weight:700;font-size:19px}nav li{margin:9px 0}.copy-box{background:#f0f8fb;border:2px solid #acd9ea;border-radius:16px;padding:18px;margin-top:30px}textarea{display:block;resize:vertical;width:100%;height:280px;border:1px solid #9ab8c7;border-radius:10px;padding:12px;background:white;color:#153a4d;font:14px/1.5 ui-monospace,monospace;margin-top:18px}footer{font-size:14px;color:var(--muted);margin:24px 4px} @media(max-width:360px){main{padding:12px 10px 35px}article,details.toc{padding:17px}h2{font-size:23px}}
</style></head><body><main>
<header id="languages"><div class="tag">iPhone · RU / LV / EN</div><h1>TURĪBA NEXT</h1>
<p lang="ru">Выберите язык. Полная установка без компьютера, с нуля.</p>
<p lang="lv">Izvēlieties valodu. Pilna uzstādīšana bez datora.</p>
<p lang="en">Choose your language. Complete setup without a computer.</p>
<nav aria-label="Language"><a class="button" href="#ru">Русский</a> <a class="button" href="#lv">Latviešu</a> <a class="button" href="#en">English</a></nav>
<p><a style="color:#42cff5" href="https://apps.apple.com/app/id1405459188">Scriptable — App Store</a></p>
<a style="color:#42cff5" href="#copy-script">Код / Kods / Script text ↓</a></header>
''' + "\n".join(sections) + '''
<article><section class="copy-box" id="copy-script"><h2>Код / Kods / Script text</h2>
<p lang="ru">Только для способа 4Б. Откройте блок ниже. Удерживайте текст в поле → «Выбрать всё» → «Скопировать». Вставьте весь код в Scriptable.</p>
<p lang="lv">Tikai 4.B veidam. Atveriet bloku zemāk. Paturiet pirkstu teksta laukā → Select All → Copy. Ielīmējiet visu kodu Scriptable.</p>
<p lang="en">Only for method 4B. Expand below. Hold the text field → Select All → Copy. Paste the entire code into Scriptable.</p>
<details><summary>Показать код / Parādīt kodu / Show code</summary>
<textarea readonly spellcheck="false" aria-label="TURIBA NEXT — full script for copying">''' + html.escape(SCRIPT.decode("utf-8"), quote=False) + '''</textarea></details></section><p><a href="#languages">RU / LV / EN ↑</a></p></article>
<footer>''' + html.escape(VERSION) + ''' · 2026-10-31 · Offline RU / LV / EN. INSTALL_RU.md / INSTALL_LV.md / INSTALL_EN.md are text alternatives. The embedded code is never executed by this page.</footer>
</main></body></html>'''
    (OUTPUT / "INSTALL.html").write_text(page)
    (OUTPUT / "TURIBA NEXT.js").write_bytes(SCRIPT)
    files = {name: (OUTPUT / name).read_bytes() for name in ["TURIBA NEXT.js", "INSTALL.html", "README.md", "INSTALL_RU.md", "INSTALL_LV.md", "INSTALL_EN.md"]}
    archive = OUTPUT / "TURIBA-NEXT-iPhone.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as handle:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 31, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            handle.writestr(entry, data)
    with zipfile.ZipFile(archive) as handle:
        assert handle.testzip() is None
        assert set(handle.namelist()) == set(files)
        for name, data in files.items():
            assert handle.read(name) == data
    report = {
        "version": VERSION, "date": "2026-10-31", "scope": "phone-only kit for owner and friends' private testing",
        "runtimeChanged": False, "files": {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in files.items()},
        "archive": {"path": "install/TURIBA-NEXT-iPhone.zip", "bytes": archive.stat().st_size, "sha256": hashlib.sha256(archive.read_bytes()).hexdigest()},
        "verification": "exact six-entry set, ZIP CRC and byte equality; script copied unchanged from dist"
    }
    (ROOT / "docs/IPHONE_INSTALL_KIT.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"version": VERSION, "entries": len(files), "archiveBytes": archive.stat().st_size, "scriptUnchanged": (OUTPUT / "TURIBA NEXT.js").read_bytes() == SCRIPT}))


if __name__ == "__main__":
    main()
