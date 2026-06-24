#!/usr/bin/env node
// Stop hook (non-blocking, observability only).
// Records replies that shipped WITHOUT a Next Actions footer, per the AGENTS.md
// "Next Actions Footer" rule. It NEVER blocks the session: it always exits 0.
//
// Why log-only and not hard-enforce: the rule has legitimate carve-outs
// (clarifying-only replies, safety refusals, the meta-wrap-up Session Summary)
// that correctly have no footer, and a Stop hook cannot reliably tell those
// apart from a genuine miss. So this surfaces misses for human review instead
// of forcing a continuation that could loop or nag on exempt replies.
//
// Output: appends one JSON line per miss to .claude/hooks_info/footer-misses.log
// (gitignored). Review with: tail .claude/hooks_info/footer-misses.log

const fs = require("fs");
const path = require("path");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const msg = (data.last_assistant_message || "").trim();
    if (!msg) return; // nothing to check

    // Footer markers: a "**Next Actions**" heading anywhere, or a trailing
    // "Next:" line in the tail of the message.
    const hasBlock = /(^|\n)\s*\*\*Next Actions\*\*/.test(msg);
    const tail = msg.split("\n").slice(-12).join("\n");
    const hasLine = /(^|\n)\s*Next:\s+\S/.test(tail);
    if (hasBlock || hasLine) return; // footer present, nothing to record

    const dir = path.join(__dirname, "..", "hooks_info");
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
    const rec = {
      ts: new Date().toISOString(),
      session: data.session_id || null,
      chars: msg.length,
      head: msg.slice(0, 80).replace(/\s+/g, " "),
      tail: msg.slice(-80).replace(/\s+/g, " "),
    };
    fs.appendFileSync(
      path.join(dir, "footer-misses.log"),
      JSON.stringify(rec) + "\n",
    );
  } catch {
    // Never throw from a hook.
  }
});
