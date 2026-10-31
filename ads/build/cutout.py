"""Cut people out of their photo backgrounds for the ads.

Usage: python3 ads/build/cutout.py [slug ...]
For each ads/<slug>/photos/{hero-1,hero-2,provider}.{jpg,jpeg,png,webp} writes
<slot>-cut.png (transparent background, cropped to the person).
"""
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ADS = Path(__file__).resolve().parent.parent
SLOTS = ("hero-1", "hero-2", "provider")
EXTS = (".jpg", ".jpeg", ".png", ".webp")

session = new_session("u2net_human_seg")
slugs = sys.argv[1:] or ["shaperz", "virtualhealth78", "novaleo"]
for slug in slugs:
    photos = ADS / slug / "photos"
    for slot in SLOTS:
        src = next((photos / f"{slot}{e}" for e in EXTS if (photos / f"{slot}{e}").exists()), None)
        if not src:
            print(f"skip {slug}/{slot}: no source photo")
            continue
        img = Image.open(src).convert("RGB")
        cut = remove(img, session=session, alpha_matting=True, post_process_mask=True)
        cut = cut.crop(cut.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox())
        out = photos / f"{slot}-cut.png"
        cut.save(out)
        print(f"wrote {out.relative_to(ADS)} {cut.size}")
