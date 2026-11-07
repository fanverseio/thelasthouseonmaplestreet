# Asset and Audio Conventions

## Folders
| Path | Contents | Git |
|---|---|---|
| `assets/src/` | `.blend` sources and texture working files | committed if each file is under ~50 MB; otherwise ask before adding Git LFS |
| `assets/raw/` | Raw generator output: ElevenLabs takes, image drafts, unoptimised GLB exports | **ignored** |
| `apps/client/public/assets/` | Final, optimised, game-ready files loaded at runtime | **committed** (a fresh clone must run) |
Every final asset is listed in `asset-manifest.md`. `tools/check-assets.mjs` (planned) compares the manifest with disk.

## Pipeline
Blender (`assets/src/`) -> export GLB to `assets/raw/glb/` -> optimise (meshopt, KTX2) -> `apps/client/public/assets/models/`. Voice: ElevenLabs -> `assets/raw/vo/` -> approved takes -> `apps/client/public/assets/audio/vo/<line_id>.mp3`. Images: image API -> `assets/raw/images/` -> edited -> `apps/client/public/assets/textures/` or `ui/`.

## Naming
- One GLB per environment block (`home_elena.glb`, `house_66.glb`), shared props grouped (`props.glb`, `items.glb`).
- Blender node names equal entity IDs: a node named `door.home.front` binds to the registry entity `door.home.front`.
- Colliders: `col_<anything>` (hidden boxes). Triggers: `trg.<zone>.<name>`. Spawns: `spawn.<zone>.<name>`. Teleport nodes: `node.<zone>.<name>`. Lights: the light entity ID on an empty.
- Units metres, Y up, transforms applied, prop origins at the floor.
- A registry entity with no mesh falls back to a greybox shape; never a crash.

## Budgets
Visible triangles < 250k per frame. Textures 1024-2048 px, KTX2. Total initial download < 40 MB; the Last House interior lazy-loaded. Max ~6 shadowed lights.

## Audio
- Voice: MP3 44.1 kHz 128 kbps mono, one file per line ID. Everything else OGG (Opus or Vorbis); mono for positional sounds, stereo for beds and music.
- Loudness: beds around -23 LUFS; dialogue the loudest element; stingers below dialogue.
- Buses: master, music, sfx, ambience, voice; each with a volume setting.
- Names: `amb_<zone>`, `sfx_<what>`, `mus_<what>`, `vo_<character>_<id>`.
- Audio starts only after the first user click.

## Licences and credits
- `CREDITS.md` lists every third-party or generated asset: name, author or tool, source, licence or terms.
- Allowed: self-made, CC0, CC-BY (with attribution), OFL fonts, AI-generated outputs whose terms allow redistribution in an MIT repository. Record the tool for every AI-generated asset.
- No copyrighted music, trademarks or unlicensed samples (also required for the demo video).

## Greybox
Each entity kind has a flat debug colour (door brown, gate black, clue yellow, pickup cyan, socket teal, enemy red, npc green, anchor violet, seal white) so the route reads before art arrives.