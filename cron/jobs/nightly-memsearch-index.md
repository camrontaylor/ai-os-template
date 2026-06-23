---
name: Nightly Memsearch Index
time: '23:30'
days: daily
active: 'true'
model: haiku
notify: on_failure
description: 'Re-indexes the small daily-changing AI-OS memory sources'
timeout: 20m
retry: '1'
---
You are running as a scheduled job for AI-OS.

Task: Keep semantic recall (Tier 1) current by re-indexing only the small, daily-changing memory sources. memsearch re-embeds whatever paths it is given (it is not file-incremental), and ONNX embedding is slow on CPU, so a full reindex of every source would take over an hour and time out. The large static sources (transcripts, operator, brand_context) are handled by the weekly full rebuild, so this nightly job stays fast.

Steps:

1. Verify memsearch is installed:
   - Run `memsearch --version`
   - If it fails, output "memsearch not installed - index skipped." and stop.

2. Re-index the daily-volatile sources only, quieting the harmless gRPC keepalive log noise:
   - Run `GLOG_minloglevel=3 GRPC_VERBOSITY=NONE memsearch index context/memory/ context/notion/ context/learnings.md`
   - This is the single NIGHTLY owner of the index. The weekly rebuild owns the full set and runs at a different time, so there is never a concurrent write to the single-process Milvus Lite store.

3. Check the result:
   - Run `GLOG_minloglevel=3 memsearch stats`
   - Output: `Index complete: {chunk_count} chunks indexed.`

Notes:
- Runs 30 minutes after daily-memory-distill (23:00) so newly distilled content is picked up.
- The full rebuild (all sources incl. transcripts) is the weekly-memsearch-rebuild job.
- The `too_many_pings` gRPC warnings from Milvus Lite are non-fatal; the GLOG env var above suppresses them.
- On failure, retries once (retry: 1).
