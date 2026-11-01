# Novaleo ads v4: Katie's real photos

3 ads (Ad 1 in two photo versions) × 2 sizes (1080×1350 feed, 1080×1920 Stories). Same navy + gold look as v3, with every stock person replaced by Katie.

| Ad | Photo | Files |
|---|---|---|
| 1A · Weight Loss Stalled? Find Out WHY. | `katie-black-table` | `novaleo-v4-ad1a-stalled-{feed,story}.png` |
| 1B · same as 1A, photo A/B test | `katie-blue-shirt` | `novaleo-v4-ad1b-stalled-{feed,story}.png` |
| 2 · Meet Katie | `katie-blue-shirt` | `novaleo-v4-ad2-meet-katie-{feed,story}.png` |
| 3 · Only 4 spots / Root Cause Restoration Program | `katie-couch` | `novaleo-v4-ad3-program-{feed,story}.png` |

Every image shows the service, the offer (free assessment call) and social proof (Board-Certified NP · 20+ years · 5.0 on Google). Copy and the Instant Form: `ad-copy.md`. Photo sources: `photos.md`. Stories keep the top 180px and bottom 290px free of key text for Meta's overlay.

## Build
```
pip install "rembg[cpu]"
python3 ads/novaleo-v4/build/cutout.py   # photos/katie-*.jpg -> photos/*-cut.png
node ads/novaleo-v4/build/render.js      # PNGs + preview.html
```
Fonts in `build/fonts/` are Montserrat and Playfair Display (OFL, from @fontsource on npm), embedded into the page at render time.
