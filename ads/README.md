# Clinic ad samples v3

3 clinics × 3 ads × 2 sizes (1080×1350 feed, 1080×1920 Stories), rendered from HTML with Playwright.

```
ads/
  build/clinics.js       brand colors + on-image copy per clinic
  build/render.js        HTML layouts -> PNGs + preview.html
  build/cutout.py        rembg background removal for people photos
  build/fetch_assets.sh  downloads the two known logo URLs
  build/fonts/           Anton, Montserrat, Great Vibes, Kaushan Script, DM Serif Display (Google Fonts, OFL)
  <clinic>/photos/       source photos + generated *-cut.png cutouts
  <clinic>/photos.md     every image and its source (STOCK marked)
  <clinic>/ad-copy.md    primary text, headline, description, CTA, video scripts
```

## Build
```
ads/build/fetch_assets.sh            # logos (needs clinic sites allowed in network settings)
# put hero-1.jpg, hero-2.jpg, provider.jpg in each <clinic>/photos/
python3 ads/build/cutout.py          # needs: pip install "rembg[cpu]"
node ads/build/render.js             # writes <clinic>/<clinic>-adN-<feed|story>.png + preview.html
node ads/build/render.js --proof DIR # layout proofs with labeled photo slots, no photos needed
```
