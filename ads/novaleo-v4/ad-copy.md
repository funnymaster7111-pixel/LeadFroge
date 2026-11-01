# Novaleo Weight & Wellness: ad copy v4

Katie Long, NP-C (Board-Certified NP) · 20+ years · 5.0 on Google · Telehealth across all of Michigan & Wisconsin.
Audience: women 35-55 (Meta minimum is 18+ for weight-loss ads; set age 35-55, women, MI + WI).
Objective: Leads, with a Meta Instant Form (below). Button on every ad: **Book Now**.

Rules followed:
- Katie's real photos on every ad. No stock people.
- Every image shows the service (root-cause weight loss), the offer (FREE assessment call) and social proof (Board-Certified NP · 20+ years · ★★★★★ 5.0 on Google).
- Primary text opens with the offer, then spells out the exact next step.
- Katie is never called a doctor. No price (the $3,995 program price stays off). No patient quotes, no before/after or scale imagery.
- Google rating: 5.0 from 9 reviews on Google Maps (Nov 2026; screenshot in `photos/google-rating-proof-2026-11.png`). If it changes, update `GOOGLE_RATING` in `build/render.js` and re-render.

## Ad 1A / 1B · Weight Loss Stalled? (A/B photo test)
Same copy, same layout; only the photo changes, so the test isolates the photo.
- **1A** `novaleo-v4-ad1a-stalled-*`: black top at the table (`katie-black-table`)
- **1B** `novaleo-v4-ad1b-stalled-*`: blue shirt (`katie-blue-shirt`)

Run both in one ad set with the same budget, and judge on cost per lead after ~50 leads each (or 7 days).

- **Headline:** Weight Loss Stalled? Find Out Why
- **Description:** Free assessment call · Telehealth MI & WI
- **Primary text:**
  FREE Root Cause Assessment Call with Katie Long, NP-C. Find out why your weight loss stalled. 🔎

  Doing everything right, and the scale still won't move? There's usually a reason: hormones, thyroid, metabolism, sleep, stress. Katie is a board-certified nurse practitioner with 20+ years of experience, and she looks for the root cause instead of handing you another diet.

  ✔️ Root-cause care for women 35-55
  ✔️ Virtual visits from home, anywhere in Michigan or Wisconsin
  ⭐ 5.0 on Google

  How to book: Tap "Book Now" → fill out the quick form → you'll be prompted to pick a time for your free assessment call.

## Ad 2 · Meet Katie (`novaleo-v4-ad2-meet-katie-*`)
Photo: blue shirt (`katie-blue-shirt`), her warmest smile.

- **Headline:** Meet Katie, Your Weight Loss NP
- **Description:** Free assessment call · 20+ years
- **Primary text:**
  FREE Root Cause Assessment Call with Katie, your weight loss nurse practitioner. 👋

  Katie Long, NP-C, is a board-certified nurse practitioner with 20+ years of experience. She works with women whose weight won't budge even when they're doing "everything right," and she starts by finding out WHY.

  ✔️ Root-cause care, not another diet
  ✔️ Virtual visits from home, anywhere in Michigan & Wisconsin
  ⭐ 5.0 on Google

  How to book: Tap "Book Now" → fill out the quick form → you'll be prompted to pick a time for your free assessment call.

## Ad 3 · Only 4 spots (`novaleo-v4-ad3-program-*`)
Photo: couch (`katie-couch`), cropped below her hands.

- **Headline:** Only 4 Spots: Free Assessment Call
- **Description:** Root Cause Restoration Program · 6 months
- **Primary text:**
  FREE Root Cause Assessment Call: the first step into Katie's Root Cause Restoration Program. Only 4 spots open. ✨

  A 6-month program with Katie Long, NP-C (board-certified, 20+ years), for women 35-55 who are ready to find out what's really holding their weight in place, and fix it.

  ✔️ Labs + metabolic tracking
  ✔️ Monthly data reviews
  ✔️ Nutrition & supplement guidance
  ✔️ Provider visits with Katie, from home

  Katie works with only 4 clients at a time, so every plan gets her full attention. Telehealth across all of Michigan & Wisconsin. ⭐ 5.0 on Google.

  How to book: Tap "Book Now" → fill out the quick form → you'll be prompted to pick a time for your free assessment call.

## Instant Form (Meta Lead Form, "Higher intent" type)

- **Form name:** Novaleo · Free Root Cause Assessment Call
- **Headline:** Claim your FREE Root Cause Assessment Call
- **Intro text:** Fill out this quick form to claim your free Root Cause Assessment Call. Then you'll be able to pick a time that works for you.
- **Fields (prefilled where Meta allows):**
  1. First name
  2. Last name
  3. Email
  4. Phone number
- **Text-message consent (custom disclaimer, checkbox required):**
  ☐ By checking this box, I agree to receive text messages from Novaleo Weight & Wellness about my free assessment call and related services at the number provided. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.
- **Privacy policy:** novaweightandwellness.com privacy page (confirm the URL with the client).
- **Completion screen:** "You're in! Tap below to pick a time for your free assessment call." · Button: **Pick a time** → Katie's booking page.
