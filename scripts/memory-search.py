#!/usr/bin/env python3
"""Sandbox-safe markdown recall for AI-OS memory.

This is the deterministic fallback below MemSearch. It reads the authoritative
markdown sources directly, so it needs no Milvus lock file, no loopback port,
and no Codex escalation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path


SOURCE_RULES = [
    ("context/MEMORY.md", 2.0),
    ("context/learnings.md", 1.5),
    ("brand_context/", 1.3),
    ("context/memory/", 1.0),
    (".memsearch/memory/", 0.9),
    ("context/transcripts/", 0.8),
]

SYSTEM_RECALL_TERMS = {
    "ai-os",
    "aios",
    "codex",
    "fallback",
    "lock",
    "memory",
    "memsearch",
    "milvus",
    "recall",
    "sandbox",
    "semantic",
}

SYSTEM_NOTE_MARKERS = {
    "markdown fallback",
    "memory recall",
    "memsearch",
    "milvus",
    "recall layer",
    "sandbox",
    "semantic search",
    "semantic-only",
}


@dataclass
class Section:
    source: Path
    rel_source: str
    heading: str
    heading_level: int
    start_line: int
    end_line: int
    content: str


@dataclass(frozen=True)
class TermGroup:
    term: str
    variants: tuple[str, ...]


def tokenize(query: str) -> list[str]:
    words = re.findall(r"[a-z0-9][a-z0-9_-]{1,}", query.lower())
    stop = {
        "about",
        "after",
        "again",
        "also",
        "from",
        "have",
        "into",
        "that",
        "their",
        "there",
        "this",
        "what",
        "when",
        "where",
        "which",
        "with",
        "would",
        "your",
    }
    return [word for word in words if word not in stop]


def term_variants(term: str) -> tuple[str, ...]:
    variants = {term}
    if len(term) > 4 and term.endswith("ies"):
        variants.add(term[:-3] + "y")
    if len(term) > 4 and term.endswith("es"):
        variants.add(term[:-2])
    if len(term) > 3 and term.endswith("s"):
        variants.add(term[:-1])
    return tuple(sorted(variants, key=lambda item: (-len(item), item)))


def build_term_groups(query: str) -> list[TermGroup]:
    seen: set[str] = set()
    groups: list[TermGroup] = []
    for term in tokenize(query):
        if term in seen:
            continue
        seen.add(term)
        groups.append(TermGroup(term=term, variants=term_variants(term)))
    return groups


def candidate_files(root: Path) -> list[Path]:
    files: list[Path] = []
    explicit = [
        root / "context" / "MEMORY.md",
        root / "context" / "learnings.md",
    ]
    files.extend(path for path in explicit if path.is_file())

    for rel_dir in [
        "context/memory",
        ".memsearch/memory",
        "brand_context",
        "context/transcripts",
    ]:
        directory = root / rel_dir
        if directory.is_dir():
            files.extend(sorted(directory.rglob("*.md")))

    seen: set[Path] = set()
    unique: list[Path] = []
    for path in files:
        resolved = path.resolve()
        if resolved not in seen:
            seen.add(resolved)
            unique.append(path)
    return unique


def rel_path(root: Path, path: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def split_sections(root: Path, path: Path) -> list[Section]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []

    lines = text.splitlines()
    if not lines:
        return []

    sections: list[Section] = []
    current_start = 1
    current_heading = path.name
    current_level = 0

    heading_re = re.compile(r"^(#{1,6})\s+(.+?)\s*$")

    def emit(end_line: int) -> None:
        if end_line < current_start:
            return
        content_lines = lines[current_start - 1 : end_line]
        content = "\n".join(content_lines).strip()
        if not content:
            return
        sections.append(
            Section(
                source=path.resolve(),
                rel_source=rel_path(root, path),
                heading=current_heading,
                heading_level=current_level,
                start_line=current_start,
                end_line=end_line,
                content=content,
            )
        )

    for idx, line in enumerate(lines, start=1):
        match = heading_re.match(line)
        if not match:
            continue
        if idx > current_start:
            emit(idx - 1)
        current_start = idx
        current_level = len(match.group(1))
        current_heading = match.group(2).strip()

    emit(len(lines))
    return sections


def authority(rel_source: str) -> float:
    best_len = -1
    best_weight = 1.0
    for prefix, weight in SOURCE_RULES:
        if prefix.endswith("/"):
            matches = rel_source.startswith(prefix)
        else:
            matches = rel_source == prefix
        if matches and len(prefix) > best_len:
            best_len = len(prefix)
            best_weight = weight
    return best_weight


def file_date(rel_source: str) -> date | None:
    match = re.search(r"(\d{4}-\d{2}-\d{2})", rel_source)
    if not match:
        return None
    try:
        return datetime.strptime(match.group(1), "%Y-%m-%d").date()
    except ValueError:
        return None


def recency(rel_source: str) -> float:
    found = file_date(rel_source)
    if found is None:
        return 1.0
    age_days = max((date.today() - found).days, 0)
    return 0.7 + 0.3 * math.exp(-age_days / 14)


def query_is_system_recall(groups: list[TermGroup]) -> bool:
    terms = {group.term for group in groups}
    return bool(terms & SYSTEM_RECALL_TERMS)


def source_fit(section: Section, groups: list[TermGroup]) -> float:
    """Prefer the memory source type that matches the query shape."""
    is_system_query = query_is_system_recall(groups)
    fit = 1.0
    if section.rel_source == "context/learnings.md" and not is_system_query:
        fit *= 0.35
    if not is_system_query:
        haystack = section_haystack(section)
        if any(marker in haystack for marker in SYSTEM_NOTE_MARKERS):
            fit *= 0.35
    if (
        len(groups) >= 5
        and (
            section.rel_source.startswith("context/memory/")
            or section.rel_source.startswith(".memsearch/memory/")
        )
    ):
        fit *= 1.15
    return fit


def trim_content(content: str, terms: list[str], max_chars: int = 900) -> str:
    compact = re.sub(r"\n{3,}", "\n\n", content).strip()
    if len(compact) <= max_chars:
        return compact

    lowered = compact.lower()
    hit_positions = [lowered.find(term) for term in terms if term and lowered.find(term) >= 0]
    if hit_positions:
        center = min(hit_positions)
        start = max(0, center - 220)
    else:
        start = 0

    end = min(len(compact), start + max_chars)
    snippet = compact[start:end].strip()
    if start > 0:
        snippet = "..." + snippet
    if end < len(compact):
        snippet = snippet + "..."
    return snippet


def section_haystack(section: Section) -> str:
    return f"{section.heading}\n{section.content}".lower()


def variant_count(haystack: str, group: TermGroup) -> int:
    return sum(haystack.count(variant) for variant in group.variants)


def document_frequency(sections: list[Section], groups: list[TermGroup]) -> dict[str, int]:
    freqs: dict[str, int] = {group.term: 0 for group in groups}
    for section in sections:
        haystack = section_haystack(section)
        for group in groups:
            if variant_count(haystack, group) > 0:
                freqs[group.term] += 1
    return freqs


def idf_weights(section_count: int, freqs: dict[str, int]) -> dict[str, float]:
    return {
        term: math.log((section_count + 1) / (freq + 1)) + 1.0
        for term, freq in freqs.items()
    }


def score_section(section: Section, query: str, groups: list[TermGroup], idf: dict[str, float]) -> float:
    haystack = f"{section.heading}\n{section.content}".lower()
    if not groups and not query.strip():
        return 0.0

    hits: list[tuple[TermGroup, int]] = []
    for group in groups:
        count = variant_count(haystack, group)
        if count > 0:
            hits.append((group, count))

    unique_hits = len(hits)
    phrase_bonus = 2.5 if query.strip().lower() in haystack else 0.0
    heading_bonus = 1.5 if any(
        any(variant in section.heading.lower() for variant in group.variants)
        for group in groups
    ) else 0.0

    if unique_hits == 0 and phrase_bonus == 0:
        return 0.0

    min_hits = max(1, min(4, math.ceil(len(groups) * 0.3)))
    if len(groups) >= 5 and unique_hits < min_hits and phrase_bonus == 0:
        return 0.0

    weighted_unique = sum(idf.get(group.term, 1.0) for group, _ in hits)
    weighted_counts = sum(min(count, 4) * idf.get(group.term, 1.0) * 0.18 for group, count in hits)
    coverage = unique_hits / max(len(groups), 1)
    coverage_bonus = 1.0 + coverage

    word_count = max(len(re.findall(r"\w+", section.content)), 1)
    length_factor = max(0.45, 1.0 / math.sqrt(max(word_count / 160, 1.0)))

    raw = (weighted_unique * 2.0 + weighted_counts + phrase_bonus + heading_bonus) * coverage_bonus
    return raw * authority(section.rel_source) * recency(section.rel_source) * length_factor * source_fit(section, groups)


def search(root: Path, query: str, top_k: int) -> list[dict]:
    groups = build_term_groups(query)
    terms = sorted({variant for group in groups for variant in group.variants}, key=len, reverse=True)
    sections: list[Section] = []
    for path in candidate_files(root):
        sections.extend(split_sections(root, path))

    freqs = document_frequency(sections, groups)
    idf = idf_weights(len(sections), freqs)
    scored: list[tuple[float, Section]] = []
    for section in sections:
        final_score = score_section(section, query, groups, idf)
        if final_score > 0:
            scored.append((final_score, section))

    scored.sort(key=lambda item: item[0], reverse=True)
    results = []
    for final_score, section in scored[:top_k]:
        chunk_id = f"{section.rel_source}:{section.start_line}:{section.end_line}"
        results.append(
            {
                "chunk_hash": hashlib.sha1(chunk_id.encode("utf-8")).hexdigest()[:16],
                "content": trim_content(section.content, terms),
                "source": section.source.as_posix(),
                "heading": section.heading,
                "heading_level": section.heading_level,
                "start_line": section.start_line,
                "end_line": section.end_line,
                "score": round(final_score, 6),
                "final_score": round(final_score, 6),
                "reranked": True,
                "search_mode": "markdown_fallback",
            }
        )
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Search AI-OS memory markdown without MemSearch.")
    parser.add_argument("query")
    parser.add_argument("top_k", nargs="?", default=10, type=int)
    parser.add_argument("--root", default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    if args.top_k < 1:
        print("top_k must be a positive integer", file=sys.stderr)
        return 64

    root = Path(args.root).expanduser().resolve()
    print(json.dumps(search(root, args.query, args.top_k), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
