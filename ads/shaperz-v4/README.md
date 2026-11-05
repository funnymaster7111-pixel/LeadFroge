# Shaperz ads v4: Novaleo-style layouts

The three Shaperz ads, rebuilt on the Novaleo v4 template in Shaperz colors:
- Navy background, with the person cut out on a hot-pink disc with a gold ring and arc. The person runs off the side and into the address band.
- Text column with a gold-outlined pill, a Great Vibes script word over a heavy Montserrat headline, gold checks and a gold pill button.
- Proof line (FNP-BC · Nearly 30 Years · Best of 2025), with the address band at the bottom.

Feed 1080×1350 and Stories 1080×1920.

| Ad | Person | Layout |
|---|---|---|
| `ad1-medical` · Medical Weight Loss on 111th St. | **Lynn** (replaces the pink-blazer stock model) | Text left, Lynn right |
| `ad2-offer` · Your first month $249 | Stock woman (orange top) | Woman left (her photo has a hard left edge), text right-aligned on the right |
| `ad3-provider` · Meet Lynn | Lynn | Text left with the gold "Best of 2025" badge under the button, Lynn right |

Stories keep the top 170px and the bottom 290px (address band) free of key text, as in the Novaleo Stories. White text may run over the edge of the people's dark hair, but never over a face.

## Photo quality
No original photos were available, so both people are cropped from the finished v3 feed ads (~560×710) and upscaled 3× with Lanczos resampling (see `photos.md`). They look fine at phone size; replace `photos/*-from-v3.png` with the originals when the clinic sends them and rerun the build.

## Build
```
python3 ads/shaperz-v4/build/prep.py     # needs: pip install "rembg[cpu]"
node ads/shaperz-v4/build/render.js
```
Fonts in `build/fonts/` (all OFL): Anton (@fontsource/anton), Great Vibes and Montserrat (from the earlier Shaperz build), Montserrat 900 (@fontsource/montserrat).
