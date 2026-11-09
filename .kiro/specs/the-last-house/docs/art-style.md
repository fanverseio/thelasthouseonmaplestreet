# Art Style and LOD Rules

First art (home + front street) set these rules. Later assets follow them so everything matches. Read with `asset-manifest.md` and `asset-conventions.md`.

## Look
Stylized realistic Halloween. Slightly exaggerated proportions: steep roofs, chunky trim, oversized windows and chimney, 3 m wide doorways. Moonlit blues outside, sodium-orange practicals (streetlights, porch lantern), warm lamp light inside. Lit windows and carved pumpkins are emissive; everything else is lit by the lights in code.

## Palette (sRGB hex)
| Use | Colour |
|---|---|
| Siding / exterior walls | `#56657d` |
| Trim | `#d3cbb8` |
| Roof slate | `#2a2e3a` |
| Brick | `#6b3a2e` |
| Front door | `#6e2a24` |
| Bedroom / hall / kitchen walls | `#6f8f95` / `#b79a68` / `#8c9d78` |
| Floors wood / dark wood / tile | `#5b4030` / `#4a3326` / `#8d8d82` |
| Asphalt (wet) / kerb / sidewalk | `#1d1f26` / `#7a7b80` / `#5d5f66` |
| Grass / leaves | `#1f3a22` / `#8a4a1a`, `#5a3a1c` |
| Sodium light (bulb, lantern) | `#ffb35c`, emission 2.5 to 4 |
| Lit window | base `#2a3a52`, emission `#ffb866` x 1.2 |
| Pumpkin / carved glow | `#e8741a` / emission `#ffa33a` x 3 |
| Glow-in-the-dark star | emission `#b8ff9a` x 1.2 |

## Material rules
- Principled BSDF only. Flat values: base colour, roughness, metallic, optional emission. No procedural nodes, no image textures (until a baked atlas is agreed).
- Metallic is 0 or 1. Metals: brass `#b08a3e` (roughness 0.35), cast iron `#2a2c33` (0.5).
- Roughness: matte plaster, siding, fabric 0.85 to 0.95; wood 0.5 to 0.6; ceramic 0.25; wet asphalt 0.35; glass pane 0.2.
- Names: `MAT-<what>_<colour or finish>` (for example `MAT-siding_blue`). Reuse a material rather than making a near copy.

## Triangle budgets (after triangulation)
| Asset type | Budget |
|---|---|
| House shell + interior (`mdl_home_elena`) | 25k (first art uses about 4.3k) |
| Front street strip + streetlight | 8k (first art about 0.8k) |
| Hero prop (locket, hands) | per manifest |
| Entity prop (clue, pickup, socket) | 100 to 500 |
| Furniture | 50 to 300 |
| Streetlight / mailbox / small street prop | 200 / 40 |
| Pumpkin | 180 |
Boxes are 12 tris; use boxes and 6 to 12 segment cylinders. No bevels below 5 cm. Smooth-shade only round things (pumpkin, ghost sheet).
File size: each GLB under 3 MB (first art: 256 KB and 53 KB, no compression needed).

## Naming and binding
- Entity props: the node is named after the entity id with dots as underscores (`door.home.front` -> `door_home_front`). Registry entities with a mesh node hide their greybox box; a missing node keeps the greybox.
- Scenery: `geo_<zone>_<part>` (merged by material, origin 0,0,0). Decorative props: `prop_<zone>_<name>`. Lights are never in the GLB: an empty named after the light entity marks the spot (`light_home_felix_window`); `light_street_front_bulb` is the glowing bulb mesh only.
- The entity node's origin is its placement (x, z) from `placements.ts`, at floor level (y 0); geometry is modelled around it in absolute positions.
- The front door is its own node so the game can hide it when `door.home.front` opens.
- Collection per GLB: `ASSET-<id>` (`ASSET-home_elena`, `ASSET-street_front`).

## Coordinates
Game: metres, +X east, +Z south, Y up. Blender (Z up): `(x, y, z)_blender = (x, -z, y)_game`. glTF export converts Y up, which gives back the game frame (glTF z = game z). Walls sit exactly on the collider rectangles in `home-layout.ts` (0.4 m thick, 3.2 m high, doorways 3 m wide, door leaves 2.5 m high). Furniture stays against walls because it has no collider: keep the middle of rooms and all doorways clear. Floor top at y 0.02, interior floor never above the ground plane by more than 2 cm. Sidewalk 0.09, kerb 0.15, porch deck 0.2 (the eye height is fixed, so these are visual only).

## Export settings
Headless Blender 4.5 from a saved copy (`bpy.ops.wm.save_as_mainfile(..., copy=True)`), one export per collection:

```
bpy.ops.export_scene.gltf(filepath=..., export_format='GLB', collection='ASSET-<id>',
  export_apply=False, export_animations=False, export_cameras=False, export_lights=False,
  export_yup=True, export_image_format='NONE', export_skins=False, export_morph=False,
  export_draco_mesh_compression_enable=False)
```
Apply rotation and scale first (the builders write geometry with identity rotation and scale). Output to `apps/client/public/assets/models/`. Emissive strength uses `KHR_materials_emissive_strength` (three.js reads it).

## Runtime rules
- Loader: `scene/models.tsx` (`Model`, drei `useGLTF`, cached). Suspense and failure both show the greybox fallback.
- Shadows: meshes cast and receive from the moon only; no baked or per-light shadows.
- Hint highlight: entity nodes get their own cloned materials; the hint pulse is emissive `#ffd27a`.
- Lights: in `exterior-scene.tsx` (hall `#ffcf8a`, porch lantern and streetlight `#ffb35c`). Keep the count low: every point light costs every fragment.
