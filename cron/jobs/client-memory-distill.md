---
name: Client Memory Distill
time: '23:05'
days: daily
active: 'true'
model: haiku
notify: on_failure
description: 'Promotes explicit client daily-log open threads into each client MEMORY.md'
timeout: 10m
retry: '0'
runner: shell
command: bash scripts/client-memory-maintenance.sh --mode distill --all
---
You are running as a scheduled job for AI-OS.

Task: Keep client-scoped hot memory current without copying client facts into root memory.

This job runs the deterministic client maintenance script:

```bash
bash scripts/client-memory-maintenance.sh --mode distill --all
```

Rules:
- The script must only write under `clients/{slug}/context/`.
- It must never update root `context/MEMORY.md`.
- It promotes explicit `### Open threads` and `### Decisions` bullets from today's client daily logs.
- It skips empty placeholders like `Session in progress.`

