# Shaperz v4: photo sources

| File (in `photos/`) | Used in | Source | Type |
|---|---|---|---|
| `lynn-from-v3.png` | Ad 1, Ad 3 | Lynn St. Victor-Luckett, FNP-BC. Cropped from the v3 "Meet Lynn" feed ad, whose photo came from shaperzwellness.com | REAL |
| `woman249-from-v3.png` | Ad 2 | Cropped from the v3 "$249" feed ad | STOCK |
| `shaperz-logo.png` | All ads | From the earlier Shaperz build (`claude/shaperz-elite-facebook-ads-eegum9`) | REAL |

The originals weren't in the repo and the network policy blocks shaperzwellness.com, Unsplash and Pexels, so the people were cut from the v3 ads. `build/prep.py` upscales each crop 3× (Lanczos), removes the background with rembg `birefnet-portrait`, and trims a piece of the v3 pink ring that stuck to Lynn's hair. `*-cut.png` are generated; don't edit them by hand.

Ads 1 and 3 use the same photo of Lynn. A second photo of her would let them look different.
