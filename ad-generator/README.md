# Med Spa GLP-1 Ad Generator

Renders 10 Meta-compliant GLP-1 / medical weight loss ads for a med spa from one JSON config.
Each ad comes out as a 1080×1080 feed PNG and a 1080×1350 portrait PNG, plus `copy.md` with the primary text, headline and CTA for every ad.

## Setup (once)

```bash
cd ad-generator
npm install
npx playwright install chromium   # skip if Chromium is already installed for Playwright
```

## New clinic

```bash
cp clinic.json acme.json      # then edit acme.json with the clinic's real details
npm run ads -- --config acme.json
```

Output goes to `out/<clinic-slug>/`:

- `01-local-provider-feed.png`, `01-local-provider-portrait.png`, … (20 PNGs)
- `copy.md`: primary text (≤125 chars), headline (≤40 chars), CTA for each ad
- `preview.html`: every image and its copy on one page, for client review

Options: `--out <dir>` changes the output root. `--only local-seal,price-dual` re-renders just those ads (`copy.md` and `preview.html` then list only those ads).

## Config

| Field | Notes |
|---|---|
| `clinicName`, `city`, `phone` | Required. Used on the images and in the copy. |
| `neighborhoods[]` | Shown as chips on the neighborhoods ad (up to 4 on feed, 6 on portrait). |
| `semaglutidePrice`, `tirzepatidePrice` | e.g. `"$99/week"` or `"$399/month"`. The part after `/` is set smaller. |
| `newClientOffer` | e.g. `"First week free"`, `"50% off your first month"`. |
| `brandColors` | `primary` (headlines and dark panels), `accent` (CTA and highlights), `background`. Contrast is corrected automatically. |
| `logoPath` | Optional. PNG, JPG, SVG or WebP. Without it, the clinic name is set as a wordmark. |
| `photoPaths[]` | Optional. **Real** clinic or provider photos only. Used on the local-provider and seal ads. Without them, those ads use branded graphics. |
| `fonts` | Optional Google Fonts names. Defaults: `Fraunces` for headings, `Inter` for body. |

Paths are relative to the config file.

## The 10 ads

| # | id | Type | CTA |
|---|---|---|---|
| 1 | `local-provider` | Local + medically supervised: split panel with photo or pin graphic | Book Now |
| 2 | `local-neighborhoods` | Local: "Now serving {city}" with neighborhood chips and phone | Book Now |
| 3 | `local-seal` | Local: dark seal, "Real providers. Right here in {city}." | Book Now |
| 4 | `consult-where-to-start` | Free consult: "Not sure where to start?" | Book Now |
| 5 | `consult-steps` | Free consult: 3-step "Your first step is free" | Book Now |
| 6 | `consult-questions` | Free consult: chat-bubble questions | Book Now |
| 7 | `price-dual` | Price: semaglutide + tirzepatide cards and offer | Get Offer |
| 8 | `price-from` | Price: big "From $X/week" with an offer coupon | Get Offer |
| 9 | `quiz-card` | Quiz: mock quiz UI, "See if you qualify." | Learn More |
| 10 | `quiz-timer` | Quiz: 2-minute dial with checklist | Learn More |

## Built-in checks

Every run audits each rendered image, and exits with code 2 and a list of problems if anything fails:

- **Layout:** no text runs off the canvas, gets clipped or overlaps other text. Headlines shrink automatically to fit long city names, prices and offers.
- **Text coverage:** text covers ≤ 25% of each image, measured from the rendered text boxes.
- **Disclaimer:** "Prescription required. Eligibility determined by a licensed provider. Results vary." appears on every image.
- **Copy limits:** primary text ≤ 125 chars, headline ≤ 40 chars. Each ad has shorter fallback copy that is used when long clinic details push a line over the limit.
- **Compliance lint** on the copy, the image text and the config. It flags brand-name drugs (Ozempic, Wegovy, Mounjaro, Zepbound…), pounds-lost claims, "lose weight fast" claims, results timelines, before/after language, summer-body, wedding and vacation hooks, body-shaming or personal-attribute words, and guarantee or miracle claims.

The templates never use people, bodies, scales or tape measures. They use only typography, icons and the clinic's own photos. You still need to review the final set: the clinic is responsible for its offer, its pricing claims and the photos it supplies.
