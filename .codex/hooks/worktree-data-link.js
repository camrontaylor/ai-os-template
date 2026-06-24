#!/usr/bin/env node
// SessionStart hook - Worktree Brain Link (AI-OS).
//
// AI-OS keeps its live memory, secrets, and runtime state gitignored so they never
// fork across branches. But git worktrees do not carry gitignored files, so a
// worktree session would otherwise start with EMPTY memory and drift from every
// other session. This hook detects when the session is running in a worktree (not
// the primary checkout) and runs scripts/worktree-link.sh to (re)create the symlinks
// BEFORE memory is loaded, so every session shares the same brain.
//
// No-op in the primary checkout. Safe + fire-and-forget: it only creates symlinks
// via the script (which never clobbers real files). It never blocks session start.
// Wired to run FIRST in SessionStart, ahead of load-memory-snapshot.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try { run(); } catch { /* never block session start */ }
  process.exit(0);
});
// Safety net if stdin never closes.
setTimeout(() => process.exit(0), 5000);

function run() {
  let data = {};
  try { data = JSON.parse(input); } catch { /* fall back to env/cwd */ }
  const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  const git = (args) => {
    try { return execSync(`git ${args}`, { cwd, encoding: 'utf8', timeout: 4000 }).trim(); }
    catch { return ''; }
  };

  const commonDir = git('rev-parse --path-format=absolute --git-common-dir');
  const topLevel = git('rev-parse --show-toplevel');
  if (!commonDir || !topLevel) return;

  const base = path.dirname(commonDir);            // primary checkout root
  if (path.resolve(base) === path.resolve(topLevel)) return; // in primary -> nothing to do

  const linker = path.join(base, 'scripts', 'worktree-link.sh');
  if (!fs.existsSync(linker)) return;

  let out = '';
  try {
    out = execSync(`bash "${linker}" "${topLevel}"`, { cwd: topLevel, encoding: 'utf8', timeout: 8000 }).trim();
  } catch {
    return;
  }

  const msg =
    `# Worktree brain linked\n\n` +
    `This session runs in an isolated git worktree. Its memory, secrets, and runtime ` +
    `state are symlinked to the primary AI-OS checkout, so you share the same brain as ` +
    `every other session - nothing is forked. ${out ? '`' + out + '`' : ''}`;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg },
  }));
}
