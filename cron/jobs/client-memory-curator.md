---
name: Client Memory Curator
time: '23:27'
days: sun
active: 'true'
model: haiku
notify: on_failure
description: 'Prunes resolved client MEMORY.md lines before semantic reindex'
timeout: 10m
retry: '0'
runner: shell
command: bash scripts/client-memory-maintenance.sh --mode curate --all
---
You are running as a scheduled job for AI-OS.

Task: Keep each client `context/MEMORY.md` from filling with clearly resolved lines.

This job runs:

```bash
bash scripts/client-memory-maintenance.sh --mode curate --all
```

Rules:
- Only write under `clients/{slug}/context/MEMORY.md`.
- Do not write root `context/MEMORY.md`.
- Remove only lines with clear resolved markers such as `done`, `shipped`, `closed`, or `resolved`.

