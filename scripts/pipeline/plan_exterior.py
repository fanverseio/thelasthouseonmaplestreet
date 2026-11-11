#!/usr/bin/env python3
"""Top-down plan of the exterior from the game data (exterior-layout.ts BOXES/VEILS, placements.ts, home-layout.ts).
Writes asset_creation/plans/exterior_plan.png. Read-only on the code; regenerate after layout changes."""
import os, re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = os.path.join(ROOT, 'apps', 'client', 'src', 'content', 'world')
OUT = os.path.join(ROOT, 'asset_creation', 'plans', 'exterior_plan.png')
S, HX, HZ, PAD = 12, 70, 45, 40


def px(x, z):
    return PAD + (x + HX) * S, PAD + (z + HZ) * S


lay = open(os.path.join(W, 'exterior-layout.ts')).read()
boxes = re.findall(r"box\('([^']+)', (-?[\d.]+), (-?[\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), '(#[0-9a-f]+)'(?:, (false))?\)", lay)
veils = re.findall(r"gate: '([^']+)'.*?x: (-?[\d.]+), z: (-?[\d.]+), w: ([\d.]+), d: ([\d.]+)", lay)
pl = {m[0]: (float(m[1]), float(m[2])) for m in re.findall(r"'([a-z0-9_.]+)': \{ x: (-?[\d.]+), z: (-?[\d.]+)", open(os.path.join(W, 'placements.ts')).read())}

img = Image.new('RGB', (2 * PAD + 2 * HX * S, 2 * PAD + 2 * HZ * S + 120), '#0b0d12')
d = ImageDraw.Draw(img)
try:
    F = ImageFont.truetype('DejaVuSans.ttf', 15); FB = ImageFont.truetype('DejaVuSans-Bold.ttf', 18); FS = ImageFont.truetype('DejaVuSans.ttf', 12)
except OSError:
    F = FB = FS = ImageFont.load_default()

d.rectangle([px(-HX, -HZ), px(HX, HZ)], fill='#151a22', outline='#3a4150')          # fog boundary
d.rectangle([px(-HX + 2, -HZ + 2), px(HX - 2, HZ - 2)], outline='#2a303c')
# the street ring around the green (walkable asphalt, approximate)
d.rectangle([px(-56, -33), px(56, 33)], fill='#23262e')
for gx in range(-60, 61, 4):
    pass
for b in boxes:
    name, x, z, w, dd, h, col, nonsolid = b
    x, z, w, dd = map(float, (x, z, w, dd))
    d.rectangle([px(x - w / 2, z - dd / 2), px(x + w / 2, z + dd / 2)], fill=col, outline='#888' if not nonsolid else None)
# No. 12 footprint (hollow, modelled) and the modelled front street strip
d.rectangle([px(-27, 34), px(-13, 43)], fill='#56657d', outline='#d3cbb8', width=2)
d.rectangle([px(-36, 24.5), px(-4, 33.9)], outline='#ffb35c', width=2)
d.text(px(-35.5, 23.6), 'modelled: street_front.glb', fill='#ffb35c', font=FS, anchor='lb')
for g, x, z, w, dd in veils:
    x, z, w, dd = map(float, (x, z, w, dd))
    iron = g.endswith('last_house_road')
    d.rectangle([px(x - w / 2, z - dd / 2), px(x + w / 2, z + dd / 2)], fill='#7a6a8a' if iron else '#c03030')
labels = {
    'green': ('Maple Green', 0, 0), 'house.no31': ('No. 31 Briggs', 66, -6.5), 'garage.no31': ('garage', 66, 21.5),
    'house.no40': ('No. 40', 50, -46.5), 'shed.no40': ("Gartner's shed", 62, -38), 'house66': ('House 66', -60, -45.5),
    'yard.house66': ("Watcher's yard", -58, -29.5), 'house.last': ('THE LAST HOUSE', -62, 45.5),
    'fence.back_garden': ('back fence', -63, 3), 'house.south_a': ('No. 14', 5, 41), 'house.south_b': ('No. 16', 30, 41),
    'house.north_a': ('No. 38', 20, -41),
}
for k, (t, x, z) in labels.items():
    d.text(px(x, z), t, fill='#e8e2d0', font=FB if k in ('green', 'house.last') else F, anchor='mm')
d.text(px(-20, 38.5), 'No. 12\nElena', fill='#ffffff', font=F, anchor='mm', align='center')
d.text(px(-52, 37), 'outbuilding', fill='#cfc6b2', font=FS, anchor='mm')
for k, (x, z) in pl.items():
    if k.startswith('light.'):
        cx, cy = px(x, z); d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill='#ffb35c')
    elif k.startswith('enemy.'):
        cx, cy = px(x, z); d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill='#8b1e3f', outline='#ff8fa3')
        d.text((cx + 9, cy), k.split('.')[-1], fill='#ff8fa3', font=FS, anchor='lm')
    elif k.split('.')[0] in ('clue', 'pickup', 'socket', 'puzzle', 'npc', 'mirror', 'door'):
        cx, cy = px(x, z); d.rectangle([cx - 4, cy - 4, cx + 4, cy + 4], fill='#ffd27a')
# route
route = [(-19.5, 31), (20, 30), (57, 29), (58, 18), (58, -10), (58, -28), (62, -31), (58, -28), (58, 10), (60, 16),
         (58, -10), (40, -30), (-12, -30), (-52, -33), (-59.5, -23), (-60, 0), (-60, 12), (-57, 20), (-52, 28)]
d.line([px(x, z) for x, z in route], fill='#7fc8ff', width=3)
for i, (x, z) in enumerate([(-19.5, 31), (57, 29), (58, 4), (62, -31), (60, 16), (-52, -33), (-60, 6), (-52, 28)]):
    cx, cy = px(x, z); d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill='#0b0d12', outline='#7fc8ff', width=2)
    d.text((cx, cy), str(i + 1), fill='#7fc8ff', font=FS, anchor='mm')
cx, cy = px(-19.5, 38); d.polygon([(cx, cy - 10), (cx - 8, cy + 6), (cx + 8, cy + 6)], fill='#7fff9a')
d.text((PAD, 8), 'Maple Street - exterior plan (from exterior-layout.ts / placements.ts). North is up; 1 grid = 10 m.', fill='#e8e2d0', font=F)
for gx in range(-70, 71, 10):
    d.line([px(gx, -HZ), px(gx, -HZ + 1)], fill='#555')
y0 = 2 * PAD + 2 * HZ * S + 10
legend = [('#7fc8ff', 'player route (1 home, 2 streetlight, 3 Briggs, 4 Gartner, 5 garage fuse, 6 House 66, 7 back lane, 8 grounds)'),
          ('#c03030', 'smoke veil (opens with story)'), ('#7a6a8a', 'iron gate to the Last House (never opens)'),
          ('#ffb35c', 'streetlight / lamp'), ('#ffd27a', 'clue, pickup, door, puzzle'), ('#8b1e3f', 'enemy'),
          ('#7fff9a', 'start (No. 12 hall)')]
for i, (c, t) in enumerate(legend):
    x = PAD + (i % 2) * 820; y = y0 + (i // 2) * 24
    d.rectangle([x, y, x + 14, y + 14], fill=c); d.text((x + 22, y), t, fill='#cfd6e0', font=FS)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT)
print('wrote', OUT, img.size)
