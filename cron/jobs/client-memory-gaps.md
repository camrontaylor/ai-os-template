---
name: Client Memory Gaps
time: '23:26'
days: sun
active: 'true'
model: haiku
notify: on_failure
description: 'Writes per-client memory gap reports before client curation'
timeout: 10m
retry: '0'
runner: shell
command: bash scripts/client-memory-maintenance.sh --mode gaps --all
---
You are running as a scheduled job for AI-OS.

Task: Write client-scoped memory gap reports before weekly client curation.

This job runs:

```bash
bash scripts/client-memory-maintenance.sh --mode gaps --all
```

Rules:
- Write each report under `clients/{slug}/context/memory/`.
- Do not write root memory.
- Do not delete or prune anything.

