#!/usr/bin/env python3
"""Prepare game textures from CC0 sources (asset_creation/textures/src/<polyhaven id>/{diff,nor,rough}.jpg).

Idempotent: rewrites asset_creation/textures/game/<name>_{diff,nor,rough}.jpg from SPECS every run.
Albedo is desaturated, normalised and multiplied by the palette colour (art-style.md), so photo detail
keeps the agreed palette. Wallpapers multiply a generated pattern on top of plaster.
Usage: python3 scripts/pipeline/make_textures.py [name ...]
"""
import math, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'asset_creation', 'textures', 'src')
OUT = os.path.join(ROOT, 'asset_creation', 'textures', 'game')

# name: (source id, tint hex, size, keep_saturation 0..1, contrast, pattern, maps)
SPECS = {
    'floor_bedroom': ('old_wood_floor', '#6a4a36', 1024, 0.35, 0.9, None, 'dnr'),
    'floor_hall': ('old_wood_floor', '#4e3628', 1024, 0.35, 0.9, None, 'dnr'),
    'wall_bedroom': ('painted_plaster_wall', '#6f8f95', 1024, 0.0, 0.35, 'stars', 'dn'),
    'wall_hall': ('painted_plaster_wall', '#b79a68', 1024, 0.0, 0.35, 'damask', 'dn'),
    'wall_kitchen': ('painted_plaster_wall', '#8c9d78', 1024, 0.0, 0.35, 'pinstripe', 'dn'),
    'ceiling': ('painted_plaster_wall', '#cfc6b2', 512, 0.0, 0.3, None, 'd'),
    'trim': ('painted_concrete', '#d3cbb8', 512, 0.0, 0.08, None, 'd'),
    'wood_dark': ('fine_grained_wood', '#3a2a20', 512, 0.3, 1.0, None, 'dn'),
    'wood_mid': ('fine_grained_wood', '#6b4a32', 512, 0.3, 1.0, None, 'dn'),
    'wainscot': ('dark_wood', '#5a4232', 512, 0.3, 0.9, None, 'dn'),
    'cabinet': ('wood_cabinet_worn_long', '#5f7f6a', 512, 0.0, 0.7, None, 'dn'),
    'door': ('wood_cabinet_worn_long', '#6e2a24', 512, 0.0, 0.7, None, 'dn'),
    'counter': ('marble_01', '#d8d2c2', 512, 0.0, 0.5, None, 'd'),
    'fabric_blue': ('denim_fabric', '#3d5278', 512, 0.0, 0.9, None, 'dn'),
    'fabric_red': ('quatrefoil_jacquard_fabric', '#8a3a34', 512, 0.0, 1.0, None, 'dn'),
    'fabric_mustard': ('wool_boucle', '#b98c3a', 512, 0.0, 0.9, None, 'dn'),
    'rug': ('wool_boucle', '#a65a3a', 512, 0.0, 0.9, None, 'dn'),
    'curtain_plum': ('velour_velvet', '#5a3b57', 512, 0.0, 0.8, None, 'dn'),
    'gingham': ('gingham_check', '#c9b98f', 512, 0.6, 1.0, None, 'd'),
    'cotton': ('cotton_jersey', '#e3dccb', 512, 0.0, 0.6, None, 'dn'),
    'tile_cream': ('painted_concrete', '#d9d3c2', 256, 0.0, 0.1, None, 'd'),
    'tile_charcoal': ('painted_concrete', '#2c2d33', 256, 0.0, 0.15, None, 'd'),
    'tile_sage': ('painted_concrete', '#c3d0c0', 256, 0.0, 0.08, None, 'd'),
    'siding': ('weathered_plank_siding', '#56657d', 1024, 0.0, 0.8, None, 'dn'),
    'roof': ('roof_slates_02', '#2a2e3a', 1024, 0.0, 1.0, None, 'dn'),
    'brick': ('brick_wall_02', '#6b3a2e', 512, 0.25, 1.0, None, 'dn'),
    'coat_sleeve': ('caban', '#2b2f3a', 512, 0.0, 0.9, None, 'dn'),
    'cuff_knit': ('knitted_fleece', '#cdbfa3', 256, 0.0, 0.8, None, 'dn'),
    'asphalt': ('asphalt_02', '#2a2d36', 512, 0.0, 0.8, None, 'd'),
    'pavement': ('concrete_pavement_02', '#6a6c74', 512, 0.0, 0.7, None, 'd'),
    'grass': ('grass_path_2', '#2c4430', 512, 0.2, 0.8, None, 'd'),
    'leaves': ('forest_leaves_02', '#7a4a22', 256, 0.5, 0.9, None, 'd'),
    'gravel': ('gravel_ground_01', '#55524e', 256, 0.0, 0.8, None, 'd'),
    'siding_sage': ('weathered_plank_siding', '#66745e', 512, 0.0, 0.8, None, 'dn'),
    'siding_cream': ('weathered_plank_siding', '#9a917c', 512, 0.0, 0.8, None, 'dn'),
    'door_green': ('wood_cabinet_worn_long', '#2f4a3c', 256, 0.0, 0.7, None, 'd'),
    'door_blue': ('wood_cabinet_worn_long', '#2c3f63', 256, 0.0, 0.7, None, 'd'),
    'brick_dark': ('brick_wall_02', '#4a2b26', 512, 0.25, 1.0, None, 'dn'),
    'roof_kit': ('roof_slates_02', '#2a2e3a', 512, 0.0, 1.0, None, 'd'),
    'trim_s': ('painted_concrete', '#d3cbb8', 256, 0.0, 0.08, None, 'd'),
    'foundation_s': ('painted_concrete', '#4b4947', 256, 0.0, 0.4, None, 'd'),
    'brick_dark_s': ('brick_wall_02', '#4a2b26', 512, 0.25, 1.0, None, 'd'),
    'siding_black': ('weathered_plank_siding', '#2c2832', 512, 0.0, 0.9, None, 'd'),
    'roof_black': ('roof_slates_02', '#17181f', 512, 0.0, 1.1, None, 'd'),
    'trim_grime': ('painted_concrete', '#7b7566', 256, 0.0, 0.35, None, 'd'),
    'wood_dark_s': ('fine_grained_wood', '#2c2118', 256, 0.3, 1.0, None, 'd'),
    'foundation': ('painted_concrete', '#4b4947', 512, 0.0, 0.4, None, 'd'),
}


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def pattern(kind, n):
    y, x = np.mgrid[0:n, 0:n] / n
    p = np.ones((n, n))
    if kind == 'stars':          # soft vertical bands + small five-point stars (kid's room)
        p *= 1 - 0.06 * (np.sin(x * 2 * math.pi * 6) > 0.6)
        for (cx, cy, r) in ((0.25, 0.25, 0.035), (0.75, 0.75, 0.035), (0.75, 0.25, 0.02), (0.25, 0.75, 0.02)):
            dx, dy = x - cx, y - cy
            ang = np.arctan2(dy, dx)
            rad = np.hypot(dx, dy)
            edge = r * (0.55 + 0.45 * np.cos(5 * ang))
            p = np.where(rad < edge, p * 1.35, p)
    elif kind == 'damask':       # diamond lattice with a dot in each cell (old hall paper)
        u, v = (x + y) * 4, (x - y) * 4
        line = np.minimum(np.abs(u - np.round(u)), np.abs(v - np.round(v)))
        p *= 1 - 0.13 * (line < 0.04)
        cu, cv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
        p *= 1 - 0.1 * (np.hypot(cu, cv) < 0.12)
    elif kind == 'pinstripe':
        p *= 1 - 0.08 * ((x * 16) % 1 < 0.06)
    return p


def make(name):
    sid, tint, size, sat, contrast, pat, maps = SPECS[name]
    d = os.path.join(SRC, sid)
    os.makedirs(OUT, exist_ok=True)
    img = np.asarray(Image.open(os.path.join(d, 'diff.jpg')).convert('RGB').resize((size, size), Image.LANCZOS)) / 255
    lin = srgb_to_lin(img)
    lum = lin @ np.array([0.2126, 0.7152, 0.0722])
    col = lin * sat + lum[..., None] * (1 - sat)
    mean = col.reshape(-1, 3).mean(0)
    rel = col / np.maximum(mean, 1e-4)
    rel = 1 + (rel - 1) * contrast
    if pat:
        rel = rel * pattern(pat, size)[..., None]
    out = lin_to_srgb(rel * srgb_to_lin(hexrgb(tint)))
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, name + '_diff.jpg'), quality=88)
    if 'n' in maps:
        Image.open(os.path.join(d, 'nor.jpg')).convert('RGB').resize((size // 2, size // 2), Image.LANCZOS) \
            .save(os.path.join(OUT, name + '_nor.jpg'), quality=90)
    if 'r' in maps:
        Image.open(os.path.join(d, 'rough.jpg')).convert('L').resize((size // 2, size // 2), Image.LANCZOS) \
            .save(os.path.join(OUT, name + '_rough.jpg'), quality=88)
    print(name, 'ok', size, maps)


if __name__ == '__main__':
    for n in (sys.argv[1:] or SPECS):
        make(n)
