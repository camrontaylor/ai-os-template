---
name: Nightly Memory Backup
time: '23:45'
days: daily
active: 'true'
model: haiku
notify: on_failure
description: 'Branch-independent backup of the gitignored live memory layer to ~/.ai-os-memory-backup'
timeout: 5m
retry: '1'
---
You are running as a scheduled job for AI-OS.

Task: Take a branch-independent backup of the live (gitignored) memory layer so it
is recoverable if a branch switch, stash, or disk loss takes the working copies.

Background (do not re-derive): `context/MEMORY.md`, `context/learnings.md`,
`context/memory/`, and the same files under each `clients/*/context/` are
deliberately gitignored (the ".gitignore" "Live operational memory" block), so git
is not their backup. `scripts/backup-memory.sh` mirrors them to
`~/.ai-os-memory-backup/` as append-only, hardlinked, dated snapshots that never
delete anything.

Steps:

1. Run `bash scripts/backup-memory.sh` from the workspace root.

2. Output the one-line summary the script prints, e.g.
   `Nightly memory backup: snapshot 2026-06-22_234500 - 16 files. Store: 96K.`

Notes:
- Runs after daily-memory-distill (23:00) and nightly-memsearch-index (23:30), so
  the snapshot includes the night's freshly distilled MEMORY.md.
- The script is pure shell - no files are added to git, so the no-fork guarantee
  on the memory layer stays intact.
- On failure, retries once (retry: 1) and notifies.
