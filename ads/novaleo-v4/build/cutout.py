"""Cut Katie out of her photos for the v4 ads.

Usage: python3 ads/novaleo-v4/build/cutout.py
Writes photos/<name>-cut.png (transparent, cropped to the person) for each photos/katie-*.jpg.

Uses rembg's birefnet-portrait model: u2net_human_seg (the v3 model) kept chair spindles and
the couch arm attached to Katie. Each photo runs in its own process because birefnet leaks
enough memory to get the second photo OOM-killed in a 16 GB container.
The couch photo still keeps couch fabric beside her arm and hands; TRIM erases it and CROP
stops the cutout just below her hands (the layout hides that edge).
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

PHOTOS = Path(__file__).resolve().parent.parent / "photos"

# Rectangles (x0, y0, x1, y1) in source-photo pixels to make transparent, and a bottom crop line.
TRIM = {"katie-couch": [(1110, 1150, 1500, 2000), (960, 1560, 1500, 2000)]}
CROP_BOTTOM = {"katie-couch": 1700}


def cut_one(src: Path) -> None:
    from rembg import new_session, remove

    cut = remove(Image.open(src).convert("RGB"), session=new_session("birefnet-portrait"), post_process_mask=True)
    alpha = cut.getchannel("A")
    draw = ImageDraw.Draw(alpha)
    for box in TRIM.get(src.stem, []):
        draw.rectangle(box, fill=0)
    if src.stem in CROP_BOTTOM:
        draw.rectangle((0, CROP_BOTTOM[src.stem], cut.width, cut.height), fill=0)
    cut.putalpha(alpha)
    cut = cut.crop(alpha.point(lambda a: 255 if a > 20 else 0).getbbox())
    out = PHOTOS / f"{src.stem}-cut.png"
    cut.save(out)
    print(f"wrote {out.name} {cut.size}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        cut_one(Path(sys.argv[1]))
    else:
        for src in sorted(PHOTOS.glob("katie-*.jpg")):
            subprocess.run([sys.executable, __file__, str(src)], check=True)
