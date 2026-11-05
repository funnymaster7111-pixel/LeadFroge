# Shaperz ads v4: people fill the frame

The three v3 Shaperz ads, re-laid out so the person takes at least half the image and runs off the edges, with text filling the rest. Feed 1080×1350 and Stories 1080×1920.

| Ad | Person | Feed layout | Stories layout |
|---|---|---|---|
| `ad1-medical` · Medical Weight Loss on 111th St | **Lynn** (replaces the pink-blazer stock model) | Lynn fills the right half, off the right/top/bottom edges | Lynn fills the bottom half; headline left, checklist + button right |
| `ad2-offer` · $249 First Month | Stock woman (orange top) | She fills the left half, off the left and bottom edges; $249, checklist, button fill the right side | She fills the bottom half; $249 left, checklist + button right |
| `ad3-provider` · Meet Lynn | Lynn | Lynn fills the right half; bigger "Meet LYNN" and checklist; gold "Best of 2025" badge under the button | Lynn fills the bottom half; badge under the button |

In Stories the person sits in the bottom half, where Instagram's reply bar covers the bottom ~290px, so faces are kept above it. A half-width panel in a 9:16 frame would be 540×1920, too narrow for these portraits.

## Photo quality
No original photos were available, so both people are cropped from the finished v3 feed ads (~560×710) and upscaled 3× with Lanczos resampling (see `photos.md`). They look fine at phone size; replace `photos/*-from-v3.png` with the originals when the clinic sends them and rerun the build.

## Build
```
python3 ads/shaperz-v4/build/prep.py     # needs: pip install "rembg[cpu]"
node ads/shaperz-v4/build/render.js
```
Fonts in `build/fonts/` (all OFL): Anton (@fontsource/anton), Great Vibes and Montserrat (from the earlier Shaperz build), Montserrat 900 (@fontsource/montserrat).
