# Automated cold email

Sends personalised cold emails to the trades businesses in `prospects.csv`, follows up automatically, and stops as soon as someone replies. It runs on its own every weekday morning on GitHub, so there's no server and no computer to leave on.

## What happens each weekday (~9:30am Chicago)

1. **Checks your inbox.** Anyone who replied is taken out of the sequence and listed in your summary email. Anyone who replies "stop" is never emailed again. Bounced addresses are dropped. Out-of-office replies are ignored.
2. **Sends follow-ups** that are due: email 2 three days after email 1, and email 3 four days after that. Follow-ups reply in the same thread.
3. **Sends first emails** to new prospects, up to the day's limit. The limit starts at 10/day and rises by 2 a day to 40, so Gmail doesn't flag the account. It only emails one address per company website domain, and waits 45–120 seconds between sends.
4. **Emails you a summary** like "Outreach 2026-10-21: 18 sent, 2 REPLIED", with what each person said.

Your only job: **reply to the people who answer.**

## One-time setup (about 10 minutes)

1. **Turn on 2-Step Verification** for the sending Gmail account (`leadforge7@gmail.com`): Google Account → Security → 2-Step Verification.
2. **Create an app password:** Google Account → Security → App passwords (or go to myaccount.google.com/apppasswords). Name it "LeadForge outreach" and copy the 16-character password.
3. **Add it to GitHub:** in this repo go to Settings → Secrets and variables → Actions → New repository secret. Name: `GMAIL_APP_PASSWORD`, value: the app password.
4. **Fill in `config.toml`:** put your mailing address in `physical_address`. US law (CAN-SPAM) requires it in every cold email, and live mode won't run without it. A PO box or virtual mailbox is fine.
5. **Add prospects** to `prospects.csv` (see below).
6. **Merge this into `main`.** GitHub only runs scheduled jobs from the default branch.

It starts in **preview mode**: each run writes the emails it *would* send to `previews/DATE.md` and sends nothing. Check a few, then change `mode = "preview"` to `mode = "live"` in `config.toml`. To run it immediately instead of waiting for the morning, go to the Actions tab → "Cold email outreach" → Run workflow.

## prospects.csv

| column | required | example |
|---|---|---|
| `email` | yes | `mike@acmeroofing.com` |
| `business` | recommended | `Acme Roofing` |
| `first_name` | optional | `Mike`, which gives "Hey Mike," instead of "Hey," |
| `trade` | recommended | `roofing` |
| `city` | recommended | `Naperville` |
| `website` | optional | `acmeroofing.com` |
| `opener` | optional | A personal first line, e.g. `Saw you've got 90+ five-star reviews but no website.` |

Just add rows to the bottom; it picks up new ones on the next run. Rows with bad addresses are skipped and listed in your summary. Only add publicly listed business emails (from their website or Google listing).

## Files

- `config.toml`: settings (mode, sender, schedule, daily limits)
- `templates/email1.txt` to `email3.txt`: the emails. Edit the wording freely; `{business}`, `{trade}`, `{city}`, `{first_name_comma}`, `{opener}`, `{phone}`, `{sender_name}` and `{physical_address}` are filled in automatically. Add `email4.txt` for a 4th touch.
- `log.csv`: every send, reply, unsubscribe and bounce, written by the bot
- `state.json`: where each prospect is in the sequence, written by the bot (don't edit)
- `suppressed.txt`: addresses that must never be emailed. You can add addresses here yourself.

## Deliverability tips

- Free Gmail works to start, but a separate domain (e.g. `getleadforge.com` on Google Workspace) gets into inboxes far more reliably and protects your main address. If you switch, change `sender.email` and the app password.
- Keep emails plain and short, with no links or images in the first email. That's how the templates are written.
- If replies are low or emails land in spam, lower `daily_max` before raising it.
