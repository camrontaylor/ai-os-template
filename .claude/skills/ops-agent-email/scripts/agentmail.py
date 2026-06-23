#!/usr/bin/env python3
"""ops-agent-email: the agent's own email inbox (AgentMail).

Lets the agent read its own magic links / one-time codes and send mail, so it can
complete logins to third-party tools headless (no shared human login, no expiry).

Commands:
  address                         print the agent's inbox email address
  list [--limit N]                recent message summaries (subject, from, time)
  read [--from S] [--subject S]   newest matching message: subject, link, code, body (JSON)
  wait-for [--from S] [--subject S] [--timeout SEC] [--interval SEC] [--buffer SEC]
                                  poll until a NEW matching message arrives, then print link/code (JSON)
  send --to X --subject Y --text Z   send an email from the agent inbox

Auth:  AGENTMAIL_API_KEY  (env, else repo-root .env). Inbox: AGENTMAIL_INBOX (env/.env) else default.
Typical login use: trigger the tool to email a magic link, then `wait-for --from <tool>`,
follow the returned link headless (agent-browser), done.
"""
import os, sys, json, re, time, argparse, urllib.request, urllib.error, urllib.parse
from datetime import datetime

API = "https://api.agentmail.to"
DEFAULT_INBOX = "your-agent@agentmail.to"

def repo_root():
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(here, "..", "..", "..", ".."))

def from_env_or_dotenv(name):
    # env wins; otherwise walk UP from this script through parent dirs, reading the first .env that
    # defines the key. This works whether the skill runs from root .claude/skills or a client copy
    # (the AGENTMAIL_API_KEY lives in the repo-root .env, several levels up from a client copy).
    v = os.environ.get(name)
    if v:
        return v
    d = os.path.dirname(os.path.abspath(__file__))
    while True:
        envp = os.path.join(d, ".env")
        if os.path.exists(envp):
            try:
                for line in open(envp):
                    line = line.strip()
                    if line.startswith(name + "="):
                        return line.split("=", 1)[1].strip()
            except Exception:
                pass
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent

API_KEY = from_env_or_dotenv("AGENTMAIL_API_KEY")
INBOX = from_env_or_dotenv("AGENTMAIL_INBOX") or DEFAULT_INBOX

def api(method, path, body=None):
    if not API_KEY:
        sys.exit("ERROR: AGENTMAIL_API_KEY not set (env or repo-root .env)")
    req = urllib.request.Request(
        API + path,
        data=(json.dumps(body).encode() if body is not None else None),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        r = urllib.request.urlopen(req, timeout=30)
        txt = r.read().decode()
        return r.status, (json.loads(txt) if txt.strip() else {})
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()[:400]}

MAGIC_HINT = re.compile(r"(login|magic|verify|sign-?in|confirm|auth|token|activate|account)", re.I)

def extract_link(text):
    urls = re.findall(r"https?://[^\s<>\"')]+", text or "")
    if not urls:
        return None
    for u in urls:
        if MAGIC_HINT.search(u):
            return u
    return urls[0]

def extract_code(text):
    m = re.search(r"\b(\d{6})\b", text or "")
    return m.group(1) if m else None

def parse_ts(s):
    if not s:
        return 0.0
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0

def qinbox():
    return urllib.parse.quote(INBOX)

def list_messages(limit=20):
    _, d = api("GET", f"/inboxes/{qinbox()}/messages?limit={limit}")
    return d.get("messages", []) if isinstance(d, dict) else []

def get_message(mid):
    _, m = api("GET", f"/inboxes/{qinbox()}/messages/{urllib.parse.quote(mid)}")
    return m if isinstance(m, dict) else {}

def matches(msg, frm, subj):
    if frm and frm.lower() not in json.dumps(msg.get("from", "")).lower():
        return False
    if subj and subj.lower() not in (msg.get("subject", "") or "").lower():
        return False
    return True

def msg_result(detail):
    body = detail.get("extracted_text") or detail.get("text") or detail.get("extracted_html") or detail.get("html") or ""
    return {
        "found": True,
        "subject": detail.get("subject"),
        "from": detail.get("from"),
        "link": extract_link(body),
        "code": extract_code(body),
        "message_id": detail.get("message_id"),
        "created_at": detail.get("created_at"),
        "body": body.strip()[:1500],
    }

def cmd_address(a):
    print(INBOX)

def cmd_list(a):
    for m in list_messages(a.limit):
        print(f'{m.get("created_at","")}  {json.dumps(m.get("from",""))[:40]:40}  {m.get("subject","")}')

def cmd_read(a):
    for m in list_messages(20):
        if matches(m, a.frm, a.subject):
            print(json.dumps(msg_result(get_message(m["message_id"]))))
            return
    print(json.dumps({"found": False}))

def cmd_wait_for(a):
    start = time.time() - a.buffer
    deadline = time.time() + a.timeout
    while time.time() < deadline:
        for m in list_messages(20):
            if not matches(m, a.frm, a.subject):
                continue
            if parse_ts(m.get("created_at") or m.get("timestamp")) < start:
                continue
            print(json.dumps(msg_result(get_message(m["message_id"]))))
            return
        time.sleep(a.interval)
    print(json.dumps({"found": False, "timeout": a.timeout}))

def cmd_send(a):
    st, r = api("POST", f"/inboxes/{qinbox()}/messages/send",
                {"to": a.to, "subject": a.subject, "text": a.text})
    print(json.dumps({"status": st, "message_id": r.get("message_id"), "error": r.get("error")}))

def main():
    p = argparse.ArgumentParser(prog="agentmail")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("address").set_defaults(fn=cmd_address)
    pl = sub.add_parser("list"); pl.add_argument("--limit", type=int, default=10); pl.set_defaults(fn=cmd_list)
    pr = sub.add_parser("read"); pr.add_argument("--from", dest="frm"); pr.add_argument("--subject"); pr.set_defaults(fn=cmd_read)
    pw = sub.add_parser("wait-for")
    pw.add_argument("--from", dest="frm"); pw.add_argument("--subject")
    pw.add_argument("--timeout", type=int, default=90); pw.add_argument("--interval", type=int, default=4)
    pw.add_argument("--buffer", type=int, default=20); pw.set_defaults(fn=cmd_wait_for)
    ps = sub.add_parser("send")
    ps.add_argument("--to", required=True); ps.add_argument("--subject", required=True); ps.add_argument("--text", required=True)
    ps.set_defaults(fn=cmd_send)
    args = p.parse_args()
    args.fn(args)

if __name__ == "__main__":
    main()
