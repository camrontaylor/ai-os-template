#!/usr/bin/env node
// AI-OS Authority Guard - PreToolUse hook.
//
// Codex/global defaults may not outrank AI-OS. This hook blocks mutating Codex
// actions when the session is in a non-primary worktree, the primary checkout
// is off main, or Codex tries to create new worktrees without explicit opt-in.

const { execFileSync } = require('child_process');
const fs = require('fs');

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

const input = readInput();
const tool = input.tool_name || '';
const toolInput = input.tool_input || {};

const cwd = input.cwd || process.env.PWD || process.cwd();
const git = (...args) => {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const commonDir = git('rev-parse', '--path-format=absolute', '--git-common-dir');
const topLevel = git('rev-parse', '--show-toplevel');
if (!commonDir || !topLevel) process.exit(0);

const primary = commonDir.replace(/\/\.git$/, '');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD') || 'unknown';
const inWorktree = primary !== topLevel;
const allowWorktree = process.env.AI_OS_ALLOW_CODEX_WORKTREE === '1';
const allowOffMain = process.env.AI_OS_ALLOW_OFF_MAIN === '1';
const allowNewWorktree = process.env.AI_OS_ALLOW_NEW_WORKTREE === '1';
const allowDirectSkillsAdd = process.env.AI_OS_ALLOW_DIRECT_SKILLS_ADD === '1';

if (attemptsDangerFullAccessOverride(tool, toolInput)) {
  deny(
    `AI-OS hard-authority guard: do not persist sandbox_mode = ` +
      `"danger-full-access" into .codex/config.toml. Use per-command tool ` +
      `approval for temporary elevation instead of weakening tracked AI-OS ` +
      `Codex adapter config.`
  );
}

if (tool === 'Bash' && runsDirectSkillsAdd(toolInput) && !allowDirectSkillsAdd) {
  deny(
    `AI-OS hard-authority guard: do not run 'skills add' or 'npx skills add' ` +
      `directly from Codex in this repository. AI-OS skill intake is ` +
      `backlog-first: vendor candidate material into skills-library/backlog/, ` +
      `trial with 'skills use' when appropriate, then promote one curated ` +
      `capability into .claude/skills/ through the AI-OS registration flow. ` +
      `Set AI_OS_ALLOW_DIRECT_SKILLS_ADD=1 only for an explicit, one-off ` +
      `maintenance override followed by reconciliation.`
  );
}

if (tool === 'Bash' && runsRawMemsearchCommand(toolInput)) {
  deny(
    `AI-OS memory guard: do not run raw 'memsearch search/index/expand/stats' ` +
      `from Codex. Raw MemSearch uses Milvus Lite directly, which can hit the ` +
      `~/.memsearch LOCK file or 127.0.0.1 port before the AI-OS fallback layer ` +
      `can help. Use 'bash scripts/memsearch-search.sh "query" 10' for recall; ` +
      `it tries semantic MemSearch and automatically falls back to sandbox-safe ` +
      `markdown recall. Use 'bash scripts/memsearch-reindex.sh' for indexing.`
  );
}

if (tool === 'Bash' && createsWorktree(toolInput) && !allowNewWorktree) {
  deny(
    `AI-OS hard-authority guard: Codex may not create new git worktrees by ` +
      `default. Use the primary checkout on main, or explicitly opt into new ` +
      `worktree creation for this session with AI_OS_ALLOW_NEW_WORKTREE=1.`
  );
}

if (tool === 'Bash' && ((inWorktree && !allowWorktree) || (!inWorktree && branch !== 'main' && !allowOffMain))) {
  if (isObviouslyReadOnlyBash(toolInput)) process.exit(0);
  deny(
    `AI-OS hard-authority guard: this Codex session is in a restricted checkout ` +
      `(${inWorktree ? `worktree ${topLevel}` : `primary branch '${branch}'`}). ` +
      `Only read-only inspection commands are allowed here by default. Restart ` +
      `Codex in ${primary} on main, or explicitly opt in with ` +
      `${inWorktree ? 'AI_OS_ALLOW_CODEX_WORKTREE=1' : 'AI_OS_ALLOW_OFF_MAIN=1'}.`
  );
}

if (!isMutatingTool(tool, toolInput)) process.exit(0);

if (inWorktree && !allowWorktree) {
  deny(
    `AI-OS hard-authority guard: this Codex session is running in a non-primary ` +
      `worktree (${topLevel}). AI-OS source of truth requires Codex to mutate ` +
      `the primary checkout on main by default. Restart Codex in ${primary}, or ` +
      `explicitly opt into isolated worktree mutation with AI_OS_ALLOW_CODEX_WORKTREE=1.`
  );
}

if (!inWorktree && branch !== 'main' && !allowOffMain) {
  deny(
    `AI-OS hard-authority guard: the primary checkout is on '${branch}', not main. ` +
      `Codex may not preserve work onto a side branch by default. Switch the ` +
      `primary checkout back to main, or explicitly opt into this branch with ` +
      `AI_OS_ALLOW_OFF_MAIN=1.`
  );
}

process.exit(0);

function isMutatingTool(toolName, ti) {
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') {
    return true;
  }

  if (toolName !== 'Bash') return false;
  const cmd = String(ti.command || '');
  if (!cmd.trim()) return false;

  const mutatingPatterns = [
    /\bgit\s+(add|am|apply|bisect|branch\s+(-d|-D|--delete)|checkout|cherry-pick|clean|commit|merge|mv|pull|push|rebase|reset|restore|revert|rm|stash|switch|tag\s+(-d|--delete)|worktree\s+(add|move|prune|remove|repair))\b/,
    /\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update|dedupe)\b/,
    /\b(rm|mv|cp|mkdir|touch|chmod|chown)\b/,
    /(^|[^<])>{1,2}[^>]/,
  ];

  return mutatingPatterns.some((pattern) => pattern.test(cmd));
}

function createsWorktree(ti) {
  const cmd = String(ti.command || '').trim();
  if (!cmd) return false;
  const worktreeCreatePatterns = [
    /\bgit\s+worktree\s+add\b/,
    /(^|\s)(bash\s+)?(\.\/)?scripts\/worktree-new\.sh\b/,
    /(^|\s)(bash\s+)?(\.\/)?worktree-new\.sh\b/,
  ];
  return worktreeCreatePatterns.some((pattern) => pattern.test(cmd));
}

function runsDirectSkillsAdd(ti) {
  const cmd = String(ti.command || '').trim();
  if (!cmd) return false;

  const directSkillsAddPatterns = [
    /(^|[;&|]\s*|\s)skills(@[^\s]+)?\s+add\b/,
    /(^|[;&|]\s*|\s)(npx|bunx)\s+(--yes\s+|-y\s+)?skills\s+add\b/,
    /(^|[;&|]\s*|\s)pnpm\s+dlx\s+skills\s+add\b/,
    /(^|[;&|]\s*|\s)(\.\/)?node_modules\/\.bin\/skills\s+add\b/,
  ];

  return directSkillsAddPatterns.some((pattern) => pattern.test(cmd));
}

function runsRawMemsearchCommand(ti) {
  const cmd = String(ti.command || '').trim();
  if (!cmd) return false;

  // Allow the AI-OS wrappers. They own canonical collection resolution,
  // markdown fallback, and index lock handling.
  const allowedWrapperPatterns = [
    /(^|[;&|]\s*)bash\s+(\.\/)?scripts\/memsearch-search\.sh\b/,
    /(^|[;&|]\s*)bash\s+(\.\/)?scripts\/memory-search\.sh\b/,
    /(^|[;&|]\s*)bash\s+(\.\/)?scripts\/memsearch-reindex\.sh\b/,
  ];
  if (allowedWrapperPatterns.some((pattern) => pattern.test(cmd))) return false;

  const envPrefix = String.raw`(?:(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s;&|]+))\s+)*`;
  const rawPatterns = [
    new RegExp(String.raw`(^|[;&|]\s*)${envPrefix}memsearch\s+(search|expand|index|stats)\b`),
    new RegExp(String.raw`(^|[;&|]\s*)${envPrefix}uvx\s+memsearch\s+(search|expand|index|stats)\b`),
    new RegExp(String.raw`(^|[;&|]\s*)${envPrefix}python3?\s+-m\s+memsearch\s+(search|expand|index|stats)\b`),
  ];
  return rawPatterns.some((pattern) => pattern.test(cmd));
}

function attemptsDangerFullAccessOverride(toolName, ti) {
  const serialized = JSON.stringify(ti || {});
  const mentionsDangerFullAccess =
    /danger-full-access/.test(serialized) ||
    /sandbox_mode\s*=\s*["']danger-full-access["']/.test(serialized);

  if (!mentionsDangerFullAccess) return false;

  if (toolName === 'Bash') {
    const cmd = String(ti.command || '');
    return /\.codex\/config\.toml/.test(cmd);
  }

  const filePath = String(ti.file_path || ti.path || '').replace(/\\/g, '/');
  return filePath.endsWith('/.codex/config.toml') || filePath === '.codex/config.toml';
}

function isObviouslyReadOnlyBash(ti) {
  const cmd = String(ti.command || '').trim();
  if (!cmd) return true;

  // In a restricted checkout, keep shell parsing deliberately narrow. Pipes,
  // redirects, substitutions, and command separators make a "read-only" claim
  // hard to prove from the hook boundary.
  if (/[;&|`<>]/.test(cmd) || /\$\(/.test(cmd)) return false;
  if (/\bsed\s+(-[^ ]*i|--in-place)\b/.test(cmd)) return false;
  if (/^git\b.*\s--output(=|\s)/.test(cmd)) return false;
  if (/^git\s+branch\b.*\s(-d|-D|--delete|-m|-M|-c|-C|--move|--copy|--set-upstream-to|--unset-upstream)\b/.test(cmd)) return false;

  const readOnlyPatterns = [
    /^git\s+status(\s|$)/,
    /^git\s+diff(\s|$)/,
    /^git\s+log(\s|$)/,
    /^git\s+show(\s|$)/,
    /^git\s+branch(\s+(--show-current|--list|-a|-r|-v|-vv|--contains|--merged|--no-merged))*\s*$/,
    /^git\s+worktree\s+list(\s|$)/,
    /^git\s+(rev-parse|rev-list|for-each-ref|ls-files|show-ref)\b/,
    /^(pwd|ls|rg|grep|sed|cat|nl|wc|head|tail|date)\b/,
    /^bash\s+\.claude\/skills\/meta-worktree\/scripts\/audit\.sh\b/,
    /^bash\s+scripts\/codex-worktree-reconcile\.sh\s+--dry-run\b/,
  ];

  return readOnlyPatterns.some((pattern) => pattern.test(cmd));
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}
