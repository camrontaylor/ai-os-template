#!/usr/bin/env python3
"""
Build context/notion/tags/ and context/notion/_index.md from the item files
already on disk under context/notion/items/.

Use this when a full sync wrote the items/ but did not reach the index step
(for example if it was interrupted). It makes zero Notion API calls; it only
reads the frontmatter of the existing item markdown files. Output format
matches notion_sync.py so a later full sync overwrites it cleanly.
"""
import re
import unicodedata
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2] / "context" / "notion"
ITEMS = ROOT / "items"


def slugify(text, fallback="tag"):
    text = unicodedata.normalize("NFKD", text or "")
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = re.sub(r"-{2,}", "-", text)
    return (text or fallback)[:80]


def parse_frontmatter(path):
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception:
        return None
    if not lines or lines[0].strip() != "---":
        return None
    fm = {"name": "", "url": "", "tags": [], "date": ""}
    in_tags = False
    i = 1
    while i < len(lines) and lines[i].strip() != "---":
        ln = lines[i]
        m_name = re.match(r'^name:\s*"(.*)"\s*$', ln)
        m_url = re.match(r'^url:\s*"(.*)"\s*$', ln)
        m_date = re.match(r'^date:\s*"(.*)"\s*$', ln)
        m_tag = re.match(r'^\s*-\s*"(.*)"\s*$', ln)
        if m_name:
            fm["name"] = m_name.group(1).replace('\\"', '"'); in_tags = False
        elif m_url:
            fm["url"] = m_url.group(1).replace('\\"', '"'); in_tags = False
        elif m_date:
            fm["date"] = m_date.group(1); in_tags = False
        elif ln.strip() == "tags:":
            in_tags = True
        elif ln.strip() == "tags: []":
            in_tags = False
        elif in_tags and m_tag:
            fm["tags"].append(m_tag.group(1).replace('\\"', '"'))
        i += 1
    return fm


def main():
    records = []
    for f in sorted(ITEMS.rglob("*.md")):
        fm = parse_frontmatter(f)
        if not fm:
            continue
        records.append({
            "db": f.parent.name,
            "name": fm["name"] or f.stem,
            "url": fm["url"],
            "tags": fm["tags"],
            "date": fm["date"],
            "path": f.relative_to(ROOT).as_posix(),
        })

    by_tag = {}
    for r in records:
        for t in r["tags"]:
            by_tag.setdefault(t, []).append(r)

    tags_dir = ROOT / "tags"
    tags_dir.mkdir(parents=True, exist_ok=True)
    for tag, items in sorted(by_tag.items()):
        items_sorted = sorted(items, key=lambda r: (r["db"], r["name"].lower()))
        out = ["---", f'tag: "{tag}"', f"count: {len(items_sorted)}", "---", "",
               f"# Tag: {tag}", "", f"{len(items_sorted)} item(s) carry this tag.", ""]
        cur = None
        for r in items_sorted:
            if r["db"] != cur:
                cur = r["db"]; out.append(f"## {cur}"); out.append("")
            suffix = f" ({r['url']})" if r["url"] else ""
            out.append(f"- [{r['name']}](../{r['path']}){suffix}")
        out.append("")
        (tags_dir / f"{slugify(tag)}.md").write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    by_db = {}
    for r in records:
        by_db.setdefault(r["db"], []).append(r)
    out = ["---", f'generated: "{now}"', f"total_items: {len(records)}",
           f"total_tags: {len(by_tag)}", "---", "", "# Notion sync", "",
           "Rebuilt from Notion. This folder is gitignored and fully rebuildable.", "",
           f"Last index: {now}", "", "## Databases", ""]
    for db in sorted(by_db):
        out.append(f"- **{db}**: {len(by_db[db])} item(s) in items/{db}/")
    out += ["", "## Tags", ""]
    for tag in sorted(by_tag):
        out.append(f"- [{tag}](tags/{slugify(tag)}.md): {len(by_tag[tag])} item(s)")
    out.append("")
    (ROOT / "_index.md").write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")

    print(f"Wrote {len(by_tag)} tag indexes and _index.md from {len(records)} items.")


if __name__ == "__main__":
    main()
