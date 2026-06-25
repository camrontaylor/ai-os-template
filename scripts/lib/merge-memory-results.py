#!/usr/bin/env python3
"""Merge semantic MemSearch and markdown recall results.

The two engines use different score scales, so this uses reciprocal-rank fusion
instead of comparing raw scores. Markdown gets a small weight bump because exact
rare-term hits often rescue queries where semantic search returns broad context.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def load_json(path: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:
        return []
    return data if isinstance(data, list) else []


def result_key(item: dict[str, Any]) -> str:
    source = str(item.get("source") or item.get("source_path") or item.get("path") or "")
    start = item.get("start_line", "")
    end = item.get("end_line", "")
    if source and start != "":
        return f"{source}:{start}:{end}"
    return str(item.get("chunk_hash") or json.dumps(item, sort_keys=True))


def merge(semantic: list[dict[str, Any]], markdown: list[dict[str, Any]], top_k: int) -> list[dict[str, Any]]:
    fused: dict[str, dict[str, Any]] = {}
    modes: dict[str, set[str]] = {}
    rrf_k = 60.0

    streams = [
        ("semantic", semantic, 1.0),
        ("markdown_fallback", markdown, 1.35),
    ]

    for mode, results, weight in streams:
        for rank, item in enumerate(results, start=1):
            key = result_key(item)
            if key not in fused:
                fused[key] = dict(item)
                fused[key]["original_final_score"] = item.get("final_score", item.get("score"))
                fused[key]["fusion_score"] = 0.0
                modes[key] = set()

            modes[key].add(str(item.get("search_mode") or mode))
            fused[key]["fusion_score"] += weight / (rrf_k + rank)

            if mode == "semantic":
                fused[key]["semantic_rank"] = rank
            else:
                fused[key]["markdown_rank"] = rank

    merged = []
    for key, item in fused.items():
        item_modes = sorted(modes[key])
        item["search_modes"] = item_modes
        item["search_mode"] = "hybrid" if len(item_modes) > 1 else item_modes[0]
        item["final_score"] = round(float(item["fusion_score"]), 6)
        item["reranked"] = True
        merged.append(item)

    merged.sort(key=lambda item: item.get("fusion_score", 0.0), reverse=True)
    return merged[:top_k]


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: merge-memory-results.py SEMANTIC_JSON MARKDOWN_JSON TOP_K", file=sys.stderr)
        return 64

    semantic = load_json(sys.argv[1])
    markdown = load_json(sys.argv[2])
    top_k = int(sys.argv[3])
    print(json.dumps(merge(semantic, markdown, top_k), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
