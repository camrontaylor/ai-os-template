---
name: Weekly Memsearch Rebuild
time: '23:33'
days: sun
active: 'true'
model: haiku
notify: on_failure
description: 'Weekly full force-rebuild of the canonical memsearch index (all sources)'
timeout: 2h
retry: '0'
runner: shell
command: bash scripts/memsearch-reindex.sh --force
---
You are running as a scheduled job for AI-OS.

Task: Once a week, force a full re-embed of EVERY memory source into the canonical collection, to clear any drift the nightly incremental index might miss. This runs the same shared script as the nightly job, with `--force`, so both list the identical complete source set and can never erase each other's work.

Steps:

1. Verify memsearch is installed (`memsearch --version`); if it fails, output "memsearch not installed - rebuild skipped." and stop.

2. Run the full force-rebuild (trims empty plugin stubs first, then re-embeds every source into the canonical collection):
   - Run `bash scripts/memsearch-reindex.sh --force`
   - Output the final `Result:` line it prints (the chunk count).

Notes:
- Same script and same complete source set as the nightly job (`scripts/memsearch-reindex.sh`); the only difference is `--force` (re-embed everything vs skip-unchanged). Listing the full set in one run is what prevents the destructive-sync clobber that the split nightly/weekly design used to cause.
- The source set includes `context/transcripts/` and `.memsearch/memory/`; the script only indexes paths that exist.
- Runs Sunday night (23:33) inside the nightly wake batch. The daemon runs one job at a time, so this never overlaps the nightly index (23:30) on the single-process Milvus Lite store. With --force this can take a while, hence the 2h timeout.
