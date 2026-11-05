"""Build the people cutouts for the Shaperz v4 ads.

Usage: python3 ads/shaperz-v4/build/prep.py
No original photos were available, so the people are cropped from the finished v3 feed ads
(photos/*-from-v3.png, about 560x710). Each crop is upscaled 3x (Lanczos + light unsharp mask),
cut out with rembg's birefnet-portrait model (one process per photo; it leaks memory), and
trimmed where the old v3 circle stuck to the hair. Writes photos/<name>-cut.png.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PHOTOS = Path(__file__).resolve().parent.parent / "photos"
SCALE = 3
# Boxes (x0, y0, x1, y1) in cutout pixels: the v3 pink ring and a hair tuft it dragged along.
TRIM = {"lynn": [(1440, 260, 1530, 360)]}
PINK_SWEEP = {"lynn": (1380, 240, 1540, 380)}  # inside this box, drop leftover ring-pink pixels


def cut_one(name: str) -> None:
    from rembg import new_session, remove

    src = Image.open(PHOTOS / f"{name}-from-v3.png").convert("RGB")
    up = src.resize((src.width * SCALE, src.height * SCALE), Image.LANCZOS)
    up = up.filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    cut = remove(up, session=new_session("birefnet-portrait"), post_process_mask=True)
    a = np.array(cut)
    for x0, y0, x1, y1 in TRIM.get(name, []):
        a[y0:y1, x0:x1, 3] = 0
    if name in PINK_SWEEP:
        x0, y0, x1, y1 = PINK_SWEEP[name]
        box = a[y0:y1, x0:x1].astype(int)
        pink = (box[..., 0] > 170) & (box[..., 0] - box[..., 1] > 60)
        a[y0:y1, x0:x1, 3][pink] = 0
    Image.fromarray(a).save(PHOTOS / f"{name}-cut.png")
    print(f"wrote {name}-cut.png {cut.size}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        cut_one(sys.argv[1])
    else:
        for name in ("lynn", "woman249"):
            subprocess.run([sys.executable, __file__, name], check=True)
