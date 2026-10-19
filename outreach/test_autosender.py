"""Tests for autosender.py. Run: python3 -m unittest outreach/test_autosender.py"""

import shutil
import tempfile
import unittest
from datetime import date
from email.message import EmailMessage
from pathlib import Path

import autosender

HERE = Path(__file__).resolve().parent

PROSPECTS = """email,business,first_name,trade,city,website,opener
mike@acmeroofing.com,Acme Roofing,Mike,roofing,Naperville,,Nice reviews.
office@acmeroofing.com,Acme Office,,roofing,Naperville,,
joe@gmail.com,Joe HVAC,,HVAC,Elgin,,
sue@gmail.com,Sue Plumbing,Sue,plumbing,Aurora,,
not-an-email,Broken,,,,,
"""


class FakeSender:
    def __init__(self):
        self.sent = []

    def send(self, msg):
        self.sent.append(msg)


class FakeInbox:
    def __init__(self):
        self.replies = {}
        self.bounce_msgs = []

    def messages_from(self, addr, since):
        return self.replies.get(addr, [])

    def bounces(self, since):
        return self.bounce_msgs


def mail(body, subject="Re: hi", **headers):
    m = EmailMessage()
    m["Subject"] = subject
    for k, v in headers.items():
        m[k.replace("_", "-")] = v
    m.set_content(body)
    return m


class AutosenderTest(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        shutil.copytree(HERE / "templates", self.dir / "templates")
        (self.dir / "prospects.csv").write_text(PROSPECTS)
        self.paths = autosender.default_paths(self.dir)
        self.cfg = autosender.load_config(HERE / "config.toml")
        self.cfg["sender"]["physical_address"] = "123 Main St, Chicago IL"
        self.cfg["limits"].update(warmup_start_date="2026-10-19", warmup_start=10, daily_max=40)
        self.sender, self.inbox = FakeSender(), FakeInbox()

    def tearDown(self):
        shutil.rmtree(self.dir)

    def live(self, day):
        return autosender.run(self.cfg, self.paths, date.fromisoformat(day), live=True,
                              sender=self.sender, inbox=self.inbox, sleep=lambda s: None)

    def state(self):
        return autosender.load_state(self.paths["state"])["prospects"]

    def test_preview_sends_nothing_and_records_nothing(self):
        summary = autosender.run(self.cfg, self.paths, date(2026, 10, 20), live=False)
        self.assertEqual(len(summary["sent"]), 3)
        self.assertFalse(self.paths["state"].exists())
        self.assertTrue((self.paths["previews"] / "2026-10-20.md").exists())

    def test_first_emails_skip_invalid_and_same_company_domain(self):
        summary = self.live("2026-10-20")
        to = [m["To"] for m in self.sender.sent]
        self.assertEqual(to, ["mike@acmeroofing.com", "joe@gmail.com", "sue@gmail.com"])
        self.assertEqual(len(summary["problems"]), 1)
        body = self.sender.sent[0].get_content()
        self.assertIn("Hey Mike,", body)
        self.assertIn("Nice reviews.", body)
        self.assertIn("123 Main St", body)
        self.assertNotIn("{", body)

    def test_followups_thread_and_respect_timing(self):
        self.live("2026-10-20")
        first = self.sender.sent[0]
        self.sender.sent.clear()
        self.live("2026-10-22")  # only 2 days later: nothing due
        self.assertEqual(self.sender.sent, [])
        self.live("2026-10-23")  # 3 days: email 2
        self.assertEqual(len(self.sender.sent), 3)
        followup = next(m for m in self.sender.sent if m["To"] == first["To"])
        self.assertEqual(followup["Subject"], "Re: " + first["Subject"])
        self.assertEqual(followup["In-Reply-To"], first["Message-ID"])
        self.sender.sent.clear()
        self.live("2026-10-27")  # 4 days after email 2: email 3
        self.assertEqual(len(self.sender.sent), 3)
        self.sender.sent.clear()
        self.live("2026-11-05")  # sequence complete: nothing more
        self.assertEqual(self.sender.sent, [])

    def test_reply_stops_sequence_and_is_reported(self):
        self.live("2026-10-20")
        self.inbox.replies["joe@gmail.com"] = [mail("Sure, call me Thursday.\n\nOn Mon Joe wrote:\n> Reply \"stop\"")]
        self.sender.sent.clear()
        summary = self.live("2026-10-23")
        self.assertNotIn("joe@gmail.com", [m["To"] for m in self.sender.sent])
        self.assertEqual(self.state()["joe@gmail.com"]["status"], "replied")
        self.assertIn("call me Thursday", summary["replied"][0])

    def test_stop_reply_unsubscribes_permanently(self):
        self.live("2026-10-20")
        self.inbox.replies["sue@gmail.com"] = [mail("STOP")]
        self.live("2026-10-23")
        self.assertEqual(self.state()["sue@gmail.com"]["status"], "unsubscribed")
        self.assertIn("sue@gmail.com", autosender.load_suppressed(self.paths["suppressed"]))

    def test_out_of_office_is_ignored(self):
        self.live("2026-10-20")
        self.inbox.replies["joe@gmail.com"] = [mail("Back Monday", subject="Out of Office")]
        self.sender.sent.clear()
        self.live("2026-10-23")
        self.assertIn("joe@gmail.com", [m["To"] for m in self.sender.sent])

    def test_bounce_stops_sequence(self):
        self.live("2026-10-20")
        self.inbox.bounce_msgs = [mail("Address not found: sue@gmail.com does not exist")]
        self.live("2026-10-23")
        self.assertEqual(self.state()["sue@gmail.com"]["status"], "bounced")

    def test_daily_cap_and_no_weekend_sends(self):
        self.cfg["limits"]["warmup_start"] = 2
        self.live("2026-10-19")
        self.assertEqual(len(self.sender.sent), 2)
        self.live("2026-10-19")  # second run same day: cap already used
        self.assertEqual(len(self.sender.sent), 2)
        self.live("2026-10-24")  # Saturday
        self.assertEqual(len(self.sender.sent), 2)

    def test_warmup_ramp(self):
        self.assertEqual(autosender.daily_cap(self.cfg, date(2026, 10, 19)), 10)
        self.assertEqual(autosender.daily_cap(self.cfg, date(2026, 10, 24)), 20)
        self.assertEqual(autosender.daily_cap(self.cfg, date(2027, 1, 1)), 40)


if __name__ == "__main__":
    unittest.main()
