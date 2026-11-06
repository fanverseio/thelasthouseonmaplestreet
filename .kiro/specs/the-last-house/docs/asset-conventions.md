# Asset and Audio Conventions

## Pipeline
Blender (.blend in `assets/src/`) -> export GLB (`assets/glb/`) -> compress (meshopt, KTX2 textures) -> loaded by zone. Keep sources in git only if size is reasonable; use Git LFS or exclude large originals and keep exports.

## Naming
- One GLB per zone environment: `zone_<zoneId>.glb`. Reusable props: `prop_<name>.glb`.
- Scene object names map to entity IDs: a node named `door.home.front` in Blender binds to registry entity `door.home.front`.
- Collider nodes: `col_<anything>` (hidden box meshes). Interaction triggers: `trg_<entityId>`. Spawn points: `spawn_<name>`. Lights: `light_<entityId>`.
- Units: metres. Y-up. Apply transforms before export. Origin at the floor for props.
- A missing mesh for a registry entity must fall back to a greybox box, never crash.

## Budgets
Triangles: <250k visible per frame. Textures: 1024 or 2048 px max, KTX2. Total download target <40 MB; interior lazy-loaded. Max ~6 shadowed lights.

## Audio
- Format: OGG/Opus or MP3, mono for positional sounds, stereo for beds/music. Loudness: normalise beds around -23 LUFS, stingers lower than dialogue.
- Buses: master, music, sfx, ambience, voice. Each with its own volume setting.
- Naming: `amb_<zone>`, `sfx_<what>`, `mus_<what>`, `vo_<character>_<id>`.
- Unlock audio on the first menu click.

## Licenses and credits (hackathon requires no copyrighted material without permission)
- Keep `CREDITS.md` with every third-party asset: name, author, source URL, license (CC0/CC-BY/etc.).
- Only use CC0, CC-BY (with attribution) or self-made assets. No unlicensed music; the demo video must not contain copyrighted music.
- Fonts: open licenses only.
- AI-generated assets: note the tool and confirm its terms allow use.

## Greybox convention
Greybox boxes use a flat debug material with the entity kind as colour (door, clue, enemy, anchor) so the route is readable before art arrives.