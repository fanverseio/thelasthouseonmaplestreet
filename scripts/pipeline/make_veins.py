#!/usr/bin/env python3
"""Generate the emissive vein mask for Elena's hands (asset_creation/textures/game/hand_veins.png).

Grey-scale, black background; white branching veins with a soft glow. UV layout matches build_hands.py:
u = (side * x + 0.06) / 0.12 across the hand, v = (y - 0.02) / 0.30 from wrist (v~0.1) to fingertips (v~0.95).
The game tints it per spell (bolt violet, Purify gold, Ward blue) and drives the intensity. Deterministic (seeded).
"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'asset_creation', 'textures', 'game', 'hand_veins.png')
N = 512
KNUCKLES_U = [(-0.029 + 0.06) / 0.12, (-0.009 + 0.06) / 0.12, (0.011 + 0.06) / 0.12, (0.029 + 0.06) / 0.12]
KNUCKLE_V = (0.19 - 0.02) / 0.30


def to_px(u, v):
    return u * N, (1 - v) * N


def vein(draw, rnd, start, end, width, depth):
    pts = [start]
    (u0, v0), (u1, v1) = start, end
    steps = 14
    for i in range(1, steps + 1):
        t = i / steps
        wob = math.sin(t * math.pi) * rnd.uniform(-0.03, 0.03)
        pts.append((u0 + (u1 - u0) * t + wob, v0 + (v1 - v0) * t))
    draw.line([to_px(*p) for p in pts], fill=255, width=max(1, int(width)), joint='curve')
    if depth > 0:
        for _ in range(rnd.randint(1, 2)):
            k = rnd.randint(4, steps - 3)
            bu, bv = pts[k]
            vein(draw, rnd, (bu, bv), (bu + rnd.uniform(-0.12, 0.12), bv + rnd.uniform(0.08, 0.18)), width * 0.6, depth - 1)


def main():
    rnd = random.Random(1966)
    img = Image.new('L', (N, N), 0)
    d = ImageDraw.Draw(img)
    for ku in KNUCKLES_U:                           # wrist to each knuckle, then a little way down the finger
        start = (0.5 + rnd.uniform(-0.12, 0.12), 0.08)
        vein(d, rnd, start, (ku, KNUCKLE_V), 4, 2)
        vein(d, rnd, (ku, KNUCKLE_V), (ku + rnd.uniform(-0.02, 0.02), KNUCKLE_V + 0.16), 2.5, 0)
    vein(d, rnd, (0.3, 0.05), (0.12, 0.45), 3, 1)    # toward the thumb
    glow = img.filter(ImageFilter.GaussianBlur(6))
    core = img.filter(ImageFilter.GaussianBlur(1))
    a = np.maximum(np.asarray(core, np.float32), np.asarray(glow, np.float32) * 1.6)
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGB').save(OUT)   # RGB: the glTF/WebP export rejects 1-channel PNG
    print('wrote', OUT)


if __name__ == '__main__':
    main()
