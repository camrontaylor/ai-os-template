---
name: Nightly Memsearch Index
time: '23:30'
days: daily
active: 'true'
model: haiku
notify: on_failure
description: 'Re-indexes ALL AI-OS memory sources into the canonical collection'
timeout: 2h
retry: '0'
runner: shell
command: bash scripts/memsearch-reindex.sh
---
You are running as a scheduled job for AI-OS.

Task: Keep semantic recall (Tier 1) current by re-indexing the COMPLETE memory source set into the AI-OS canonical collection. This MUST list every source in one run, because `memsearch index` is a destructive sync: it deletes any source not in the paths it was given. The old design split sources across this job and the weekly job, so they erased each other every night. The shared script `scripts/memsearch-reindex.sh` lists every source in one pass; it stays fast because memsearch skips unchanged files (transcripts, notion, etc.) when not forced.

Steps:

1. Verify memsearch is installed:
   - Run `memsearch --version`
   - If it fails, output "memsearch not installed - index skipped." and stop.

2. Run the single complete reindex (it trims empty plugin stubs first, then indexes every source into the canonical collection):
   - Run `bash scripts/memsearch-reindex.sh`
   - Output the final `Result:` line it prints (the chunk count).

Notes:
- This is the single complete nightly indexer. The weekly job runs the same script with `--force` for a full re-embed; both list the identical source set, so they never erase each other.
- The canonical collection (from `scripts/lib/memsearch-collection.sh`, suffixed `_aios`) is deliberately separate from the memsearch plugin's own collection, so the plugin's per-session shadow indexing can never clobber this index.
- `scripts/memsearch-reindex.sh` first runs `scripts/trim-memsearch-stubs.sh` to strip empty `## Session HH:MM` plugin stubs (no hard delete; backed up to Trash) before indexing.
- Runs 30 minutes after daily-memory-distill (23:00) so newly distilled content is picked up.
- The `too_many_pings` gRPC warnings from Milvus Lite are non-fatal and are suppressed inside the script.
- Immediate retry is disabled (`retry: 0`) because an instant retry can collide with an in-flight Milvus Lite index lock; the next scheduled run handles it.
