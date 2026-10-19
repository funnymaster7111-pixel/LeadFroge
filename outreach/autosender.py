"""LeadForge automated cold email sender.

Each run (normally once per weekday via GitHub Actions):
  1. Checks the Gmail inbox for replies, "stop" requests and bounces, and ends
     the sequence for anyone who answered.
  2. Sends follow-ups that are due, then first emails to new prospects from
     prospects.csv, up to the day's warm-up cap.
  3. Emails the owner a summary.

In preview mode nothing is sent and nothing is recorded: the emails it would
send are written to previews/YYYY-MM-DD.md instead.

Needs only the Python standard library (3.11+). Live mode reads the Gmail app
password from the GMAIL_APP_PASSWORD environment variable.
"""

import argparse
import csv
import email
import imaplib
import json
import os
import random
import re
import smtplib
import sys
import time
import tomllib
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent

EMAIL_RE = re.compile(r"^[^@\s,;]+@[^@\s,;]+\.[A-Za-z]{2,}$")
STOP_RE = re.compile(
    r"\b(stop|unsubscribe|remove me|take me off|do not (?:email|contact)|don'?t (?:email|contact))\b",
    re.I,
)
AUTO_REPLY_RE = re.compile(r"(out of (the )?office|automatic reply|auto-?reply|away from)", re.I)
# Shared mailbox providers: two prospects on these are different businesses.
FREE_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com",
    "msn.com", "live.com", "me.com", "comcast.net", "att.net", "sbcglobal.net",
    "verizon.net", "bellsouth.net", "charter.net", "cox.net", "ymail.com",
}
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
# Sequences stay open this long after the last email so late replies are caught.
FINISH_AFTER_DAYS = 14


# ---------------------------------------------------------------- loading

def load_config(path):
    with open(path, "rb") as f:
        return tomllib.load(f)


def load_prospects(path):
    """Return (valid prospects, list of problem descriptions)."""
    prospects, problems, seen = [], [], set()
    with open(path, newline="", encoding="utf-8-sig") as f:
        for line_no, row in enumerate(csv.DictReader(f), start=2):
            row = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
            addr = row.get("email", "").lower()
            if not addr:
                continue
            if not EMAIL_RE.match(addr):
                problems.append(f"line {line_no}: invalid email {addr!r}")
                continue
            if addr in seen:
                continue
            seen.add(addr)
            row["email"] = addr
            prospects.append(row)
    return prospects, problems


def load_templates(directory):
    """Return [(subject, body), ...] for email1.txt, email2.txt, ...

    Only the first email needs a subject; follow-ups reply in the same thread.
    """
    templates = []
    for i in range(1, 100):
        path = Path(directory) / f"email{i}.txt"
        if not path.exists():
            break
        text = path.read_text(encoding="utf-8")
        subject = None
        first, _, rest = text.partition("\n")
        if first.lower().startswith("subject:"):
            subject, text = first.split(":", 1)[1].strip(), rest
        templates.append((subject, text.strip("\n")))
    if not templates or not templates[0][0]:
        raise SystemExit("templates/email1.txt must exist and start with a 'Subject:' line")
    return templates


def load_state(path):
    if Path(path).exists():
        return json.loads(Path(path).read_text())
    return {"prospects": {}, "sends_by_day": {}}


def save_state(path, state):
    Path(path).write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")


def load_suppressed(path):
    if not Path(path).exists():
        return set()
    return {
        line.strip().lower()
        for line in Path(path).read_text().splitlines()
        if line.strip() and not line.startswith("#")
    }


def add_suppressed(path, addr):
    with open(path, "a") as f:
        f.write(addr + "\n")


def append_log(path, today, addr, business, event):
    new = not Path(path).exists()
    with open(path, "a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["date", "email", "business", "event"])
        w.writerow([today.isoformat(), addr, business, event])


# ---------------------------------------------------------------- rendering

def render(text, prospect, cfg):
    s = cfg["sender"]
    first = prospect.get("first_name", "")
    fields = {
        "business": prospect.get("business") or "your business",
        "trade": prospect.get("trade") or "trades",
        "city": prospect.get("city") or "your area",
        "first_name": first,
        "first_name_comma": f" {first}," if first else ",",
        "opener": prospect.get("opener", ""),
        "website": prospect.get("website", ""),
        "sender_name": s["name"],
        "phone": s.get("phone", ""),
        "physical_address": s.get("physical_address", ""),
    }
    out = text.format_map(fields)
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip() + "\n"


def build_message(cfg, prospect, record, step, templates):
    """Build email number `step` (0-based) for a prospect."""
    s = cfg["sender"]
    subject_t, body_t = templates[step]
    if step == 0:
        subject = render(subject_t, prospect, cfg).strip()
    else:
        subject = "Re: " + record["subject"]
    msg = EmailMessage()
    msg["From"] = formataddr((s["name"], s["email"]))
    msg["To"] = prospect["email"]
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=s["email"].split("@")[1])
    if step > 0 and record.get("message_ids"):
        msg["In-Reply-To"] = record["message_ids"][-1]
        msg["References"] = " ".join(record["message_ids"])
    msg["List-Unsubscribe"] = f"<mailto:{s['email']}?subject=unsubscribe>"
    msg.set_content(render(body_t, prospect, cfg))
    return msg


# ---------------------------------------------------------------- scheduling

def daily_cap(cfg, today):
    lim = cfg["limits"]
    start = date.fromisoformat(lim["warmup_start_date"])
    days = max(0, (today - start).days)
    return min(lim["daily_max"], lim["warmup_start"] + lim["warmup_increment"] * days)


def domain_of(addr):
    return addr.rsplit("@", 1)[1]


def plan_sends(cfg, prospects, state, suppressed, templates, today):
    """Return [(prospect, step), ...] to send today: due follow-ups first, then new."""
    tracked = state["prospects"]
    by_email = {p["email"]: p for p in prospects}
    delays = cfg["schedule"]["followup_days"]

    followups = []
    for addr, rec in tracked.items():
        if rec["status"] != "active" or rec["step"] >= len(templates) or addr in suppressed:
            continue
        wait = delays[min(rec["step"] - 1, len(delays) - 1)]
        if date.fromisoformat(rec["last_sent"]) + timedelta(days=wait) <= today:
            followups.append((by_email.get(addr) or rec["prospect"], rec["step"]))

    contacted_domains = {
        domain_of(a) for a in tracked if domain_of(a) not in FREE_DOMAINS
    }
    new = []
    for p in prospects:
        addr = p["email"]
        if addr in tracked or addr in suppressed:
            continue
        d = domain_of(addr)
        if d not in FREE_DOMAINS:
            if d in contacted_domains:
                continue
            contacted_domains.add(d)
        new.append((p, 0))

    remaining = daily_cap(cfg, today) - state["sends_by_day"].get(today.isoformat(), 0)
    return (followups + new)[: max(0, remaining)]


def finish_old_sequences(state, templates, today):
    for rec in state["prospects"].values():
        if (
            rec["status"] == "active"
            and rec["step"] >= len(templates)
            and date.fromisoformat(rec["last_sent"]) + timedelta(days=FINISH_AFTER_DAYS) <= today
        ):
            rec["status"] = "finished"


# ---------------------------------------------------------------- Gmail

class GmailInbox:
    def __init__(self, user, password):
        self.imap = imaplib.IMAP4_SSL("imap.gmail.com")
        self.imap.login(user, password)
        self.imap.select("INBOX", readonly=True)

    def _fetch(self, criteria):
        status, data = self.imap.search(None, *criteria)
        if status != "OK":
            return []
        msgs = []
        for num in data[0].split():
            status, parts = self.imap.fetch(num, "(BODY.PEEK[])")
            if status == "OK" and parts and isinstance(parts[0], tuple):
                msgs.append(email.message_from_bytes(parts[0][1]))
        return msgs

    def messages_from(self, addr, since):
        return self._fetch(["FROM", f'"{addr}"', "SINCE", since.strftime("%d-%b-%Y")])

    def bounces(self, since):
        return self._fetch(["FROM", '"mailer-daemon"', "SINCE", since.strftime("%d-%b-%Y")])

    def close(self):
        try:
            self.imap.logout()
        except Exception:
            pass


class GmailSender:
    def __init__(self, user, password):
        self.smtp = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        self.smtp.login(user, password)

    def send(self, msg):
        self.smtp.send_message(msg)

    def close(self):
        try:
            self.smtp.quit()
        except Exception:
            pass


def message_text(msg):
    """Plain-text body of a received email (falls back to stripped HTML)."""
    parts = msg.walk() if msg.is_multipart() else [msg]
    html = ""
    for part in parts:
        ctype = part.get_content_type()
        if ctype not in ("text/plain", "text/html"):
            continue
        payload = part.get_payload(decode=True) or b""
        text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
        if ctype == "text/plain":
            return text
        html = html or re.sub(r"<[^>]+>", " ", text)
    return html


def own_text(body):
    """Drop the quoted original so 'reply stop' in our own footer doesn't count."""
    lines = []
    for line in body.splitlines():
        if line.startswith(">") or re.match(r"^On .+wrote:\s*$", line):
            break
        lines.append(line)
    return "\n".join(lines)


def is_auto_reply(msg):
    if msg.get("Auto-Submitted", "no").lower() != "no":
        return True
    return bool(AUTO_REPLY_RE.search(msg.get("Subject", "")))


def check_inbox(inbox, state, today, paths, summary):
    """Stop sequences for anyone who replied, unsubscribed or bounced."""
    active = {a: r for a, r in state["prospects"].items() if r["status"] == "active"}
    if not active:
        return

    for addr, rec in active.items():
        since = date.fromisoformat(rec["first_sent"])
        replies = [m for m in inbox.messages_from(addr, since) if not is_auto_reply(m)]
        if not replies:
            continue
        text = own_text(message_text(replies[-1]))
        business = rec["prospect"].get("business", "")
        if STOP_RE.search(text):
            rec["status"] = "unsubscribed"
            add_suppressed(paths["suppressed"], addr)
            summary["unsubscribed"].append(f"{business} <{addr}>")
        else:
            rec["status"] = "replied"
            snippet = " ".join(text.split())[:200]
            summary["replied"].append(f"{business} <{addr}>: {snippet}")
        append_log(paths["log"], today, addr, business, rec["status"])

    oldest = min(date.fromisoformat(r["first_sent"]) for r in active.values())
    for msg in inbox.bounces(oldest):
        text = message_text(msg).lower()
        for addr, rec in active.items():
            if rec["status"] == "active" and addr in text:
                rec["status"] = "bounced"
                add_suppressed(paths["suppressed"], addr)
                business = rec["prospect"].get("business", "")
                summary["bounced"].append(f"{business} <{addr}>")
                append_log(paths["log"], today, addr, business, "bounced")


# ---------------------------------------------------------------- run

def run(cfg, paths, today, live, sender=None, inbox=None, sleep=time.sleep):
    templates = load_templates(paths["templates"])
    prospects, problems = load_prospects(paths["prospects"])
    state = load_state(paths["state"])
    summary = {"sent": [], "replied": [], "unsubscribed": [], "bounced": [], "problems": problems}

    if live and inbox:
        check_inbox(inbox, state, today, paths, summary)
        finish_old_sequences(state, templates, today)
        save_state(paths["state"], state)

    suppressed = load_suppressed(paths["suppressed"])
    if DAY_NAMES[today.weekday()] not in cfg["schedule"]["send_days"]:
        return summary

    planned = plan_sends(cfg, prospects, state, suppressed, templates, today)
    previews = []
    sch = cfg["schedule"]
    for i, (prospect, step) in enumerate(planned):
        addr = prospect["email"]
        rec = state["prospects"].get(addr, {})
        msg = build_message(cfg, prospect, rec, step, templates)
        label = f"email {step + 1}"
        if not live:
            previews.append(f"## {prospect.get('business') or addr} ({label})\n\n"
                            f"**To:** {addr}  \n**Subject:** {msg['Subject']}\n\n"
                            f"```\n{msg.get_content().strip()}\n```\n")
            summary["sent"].append(f"{prospect.get('business', '')} <{addr}> ({label})")
            continue

        if i > 0:
            sleep(random.uniform(sch["delay_seconds_min"], sch["delay_seconds_max"]))
        sender.send(msg)
        if step == 0:
            rec = {
                "prospect": prospect, "subject": msg["Subject"], "first_sent": today.isoformat(),
                "message_ids": [], "status": "active", "step": 0,
            }
            state["prospects"][addr] = rec
        rec["message_ids"].append(msg["Message-ID"])
        rec["step"] = step + 1
        rec["last_sent"] = today.isoformat()
        day = today.isoformat()
        state["sends_by_day"][day] = state["sends_by_day"].get(day, 0) + 1
        # Save after every send so a crash mid-run never re-sends anything.
        save_state(paths["state"], state)
        append_log(paths["log"], today, addr, prospect.get("business", ""), f"sent {label}")
        summary["sent"].append(f"{prospect.get('business', '')} <{addr}> ({label})")

    if not live:
        Path(paths["previews"]).mkdir(exist_ok=True)
        header = (f"# Preview for {today.isoformat()}\n\n"
                  f"Preview mode: nothing was sent. In live mode these {len(previews)} "
                  f"emails would go out today (cap {daily_cap(cfg, today)}).\n\n")
        (Path(paths["previews"]) / f"{today.isoformat()}.md").write_text(
            header + ("\n".join(previews) or "_Nothing to send today._\n"))
    return summary


def summary_text(summary, today, live):
    def section(title, items):
        return f"{title} ({len(items)}):\n" + "".join(f"  - {x}\n" for x in items) if items else ""

    head = "LeadForge outreach" + ("" if live else " PREVIEW (nothing sent)")
    body = f"{head} for {today.isoformat()}\n\n"
    body += section("REPLIES, follow up with these yourself", summary["replied"])
    body += section("Sent" if live else "Would send", summary["sent"])
    body += section("Unsubscribed", summary["unsubscribed"])
    body += section("Bounced (bad address)", summary["bounced"])
    body += section("Problems in prospects.csv", summary["problems"])
    return body


def default_paths(root=ROOT):
    return {
        "templates": root / "templates",
        "prospects": root / "prospects.csv",
        "state": root / "state.json",
        "suppressed": root / "suppressed.txt",
        "log": root / "log.csv",
        "previews": root / "previews",
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--preview", action="store_true", help="force preview mode")
    ap.add_argument("--today", help="pretend today is YYYY-MM-DD (testing)")
    args = ap.parse_args(argv)

    cfg = load_config(ROOT / "config.toml")
    live = cfg.get("mode") == "live" and not args.preview
    tz = ZoneInfo(cfg["schedule"]["timezone"])
    today = date.fromisoformat(args.today) if args.today else datetime.now(tz).date()
    paths = default_paths()

    if not live:
        summary = run(cfg, paths, today, live=False)
        print(summary_text(summary, today, live=False))
        return 0

    address = cfg["sender"].get("physical_address", "").strip()
    if not address:
        sys.exit("Live mode needs sender.physical_address in config.toml (required by CAN-SPAM).")
    password = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "")
    if not password:
        sys.exit("Live mode needs the GMAIL_APP_PASSWORD secret.")

    user = cfg["sender"]["email"]
    sender, inbox = GmailSender(user, password), GmailInbox(user, password)
    try:
        summary = run(cfg, paths, today, live=True, sender=sender, inbox=inbox)
        text = summary_text(summary, today, live=True)
        print(text)
        if any(summary[k] for k in ("sent", "replied", "unsubscribed", "bounced", "problems")):
            note = EmailMessage()
            note["From"] = formataddr((cfg["sender"]["name"], user))
            note["To"] = cfg["sender"]["notify_email"]
            subject = f"Outreach {today.isoformat()}: {len(summary['sent'])} sent"
            if summary["replied"]:
                subject += f", {len(summary['replied'])} REPLIED"
            note["Subject"] = subject
            note.set_content(text)
            sender.send(note)
    finally:
        sender.close()
        inbox.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
