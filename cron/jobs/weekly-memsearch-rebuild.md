---
name: Weekly Memsearch Rebuild
time: '23:33'
days: sun
active: 'true'
model: haiku
notify: on_failure
description: 'Weekly reindex of the semi-static memory sources (operator, notion, brand_context, private)'
timeout: 30m
retry: '0'
---
You are running as a scheduled job for AI-OS.

Task: Re-index the semi-static memory sources that the nightly job does not cover, so changes to the operator profile, Notion sync, brand context, and private layer are picked up weekly. The transcripts folder is static (ingested once) and is intentionally NOT re-embedded here, to keep this job bounded and fast.

Steps:

1. Verify memsearch is installed (`memsearch --version`); if it fails, output "memsearch not installed - rebuild skipped." and stop.

2. Re-index the semi-static sources, quieting the harmless gRPC keepalive noise:
   - Run `GLOG_minloglevel=3 GRPC_VERBOSITY=NONE memsearch index context/operator/ context/_private/ context/notion/ brand_context/ .memsearch/memory/`

3. Confirm: `GLOG_minloglevel=3 memsearch stats` and output `Rebuild complete: {chunk_count} chunks indexed.`

Notes:
- Runs Sunday night (23:33) inside the nightly wake batch. The daemon runs one job at a time, so this never overlaps the nightly index (23:30) even though both touch the single-process Milvus Lite store.
- Transcripts (context/transcripts/) are indexed once at ingest and are static, so they are not re-embedded here. If the whole index is ever reset, run a one-time `GLOG_minloglevel=3 memsearch index context/transcripts/` to re-add them.
