# Asset handoff: home interior, lighting, hands, atmosphere, shadow houses, street, house kit, Last House

Status: imported from the asset-build workspace (`D:\Codes\TheLastHouse_Assetbuild`). This file is the context for wiring and maintaining these assets in this repo. Read with `art-style.md` and `asset-conventions.md`; where they disagree, this file is newer (see "Supersedes").

## What arrived

| File | What it is | Budget / checks |
|---|---|---|
| `apps/client/public/assets/models/home_elena.glb` | No. 12 v2: furnished bedroom, hall, kitchen, exterior shell; CC0 photo textures (WebP, tinted to the palette); baked lighting | 24,948 tris (budget 25k), 2.97 MB (< 3 MB) |
| `apps/client/public/assets/models/hands.glb` | Elena's first-person hands: two skinned forearms (17 bones each), coat sleeves, knit cuffs, wedding ring (left), vein glow mask, 14 finger-pose clips | 6,308 tris (budget 8k), 400 KB |
| `apps/client/public/assets/models/backdrop.glb` | 'Shadow houses': two rows of house silhouettes, bare trees and telephone poles beyond the play area | 3.6k tris, 200 KB |
| `apps/client/public/assets/models/terrain.glb` | Ground for the whole loop: grass, road ring with centre dashes, kerbs, pavements, door paths, gravel lane and Last House apron, leaf piles. A hole is left for `street_front.glb` (x -36..-4, z 24.5..43) | 3.3k tris, 330 KB |
| `apps/client/public/assets/models/house_kit.glb` | Street houses `kit_house_a/b/c`, front facing +Z, built at the origin (A and B 12 x 8 two-storey, C 14 x 8 bungalow) | ~0.7k tris each, 270 KB |
| `apps/client/public/assets/models/props.glb` | `prop_streetlight` (+ child `prop_streetlight_bulb`, own emissive material) | 0.3k tris, 23 KB |
| `apps/client/public/assets/models/last_house_ext.glb` | The Last House from outside: `geo_last_house`, `geo_last_house_grounds` (iron fence + chained gate at x -46, bushes, dead trees), `light_last_house_attic` (lit window, emissive) | 8.3k tris (budget 40k), 590 KB |
| `apps/client/src/scene/kit.tsx` + `kit.test.ts` | NEW: `HouseKit` (clones kit nodes at `KIT_HOUSES`), `Streetlight`; greybox fallback while loading or on error | |
| `apps/client/src/scene/models.tsx` | `applyBakedLighting()`: baked meshes become unlit + lightMap; new `lightmapGain` prop | |
| `apps/client/src/scene/lighting.ts` | Presets gained `lightmap`, `mist`, `mistColor`, `halo`; darker values; denser fog | |
| `apps/client/src/scene/exterior-scene.tsx` | Passes `lightmapGain`; adds `GroundMist`, lamp `Halo`s, `Backdrop` | |
| `apps/client/src/scene/hands.tsx` | Loads `hands.glb` (box hands stay as the fallback) | |
| `apps/client/src/scene/glow.tsx` | Interaction highlight toned down (floor ring; faint low column in `bright`) | |
| `apps/client/src/scene/atmosphere.tsx` | NEW: ground mist (points) and lamp halos (sprites), canvas-drawn textures | |
| `apps/client/src/scene/mist-layout.ts` + `.test.ts` | NEW: seeded mist puff placement, kept out of buildings | |
| `apps/client/src/scene/backdrop.tsx` | NEW: shadow houses, unlit, tinted from the fog colour | |
| `apps/client/src/game/hand-pose.ts` | NEW export `handFingers()` (finger pose + vein glow per spell state) | |
| `apps/client/src/game/combat-feedback.test.ts` | Test for `handFingers()` | |
| `apps/client/src/content/world/art-assets.test.ts` | Checks for `hands.glb` (2 skins, 14 clips) and `backdrop.glb` (every vertex outside the play area) | |
| `CREDITS.md` | Texture credits (Poly Haven, CC0) | |

After import: `npm run typecheck` and `npm test` (the asset-build run was 862 tests green, lint clean on the changed files).

## How the code hooks up

### Home model (unchanged contract)
- Entity nodes keep the v1 names (`door_home_front`, `socket_home_drawer`, `prop_home_pumpkin_jar`, `pickup_home_drawer_key`, `clue_home_drawing`, `clue_home_costume`, `clue_home_journal_1`, `light_home_felix_window`) at their `placements.ts` positions. Layout, walls and colliders still come from `home-layout.ts`; furniture has no colliders and stays against walls.
- Static scenery nodes: `geo_home_shell`, `geo_home_trim`, `geo_home_bedroom`, `geo_home_hall`, `geo_home_kitchen`.

### Baked lighting
- Those five `geo_home_*` meshes share one 2048 lightmap on their second UV set (`TEXCOORD_1`). It is stored in the glTF **occlusion** slot (`texCoord: 1`), and each of those nodes carries `extras.lightmapIntensity`.
- `models.tsx` `applyBakedLighting()` swaps every material that has an `aoMap` on such a node to `MeshBasicMaterial({ map, color, lightMap: aoMap (sRGB), lightMapIntensity })`, and turns their shadows off. Realtime lights then do not light them twice. Lamps, glass and metal have no occlusion map, so they stay standard and realtime-lit.
- Brightness: `lighting.ts` `lightmap` gain (normal 0.6, bright 1.0) via `<Model lightmapGain={light.lightmap}>`. To darken or lighten the house, change that number.
- Without the code, the GLB still works: the occlusion texture just darkens ambient light.

### Hands
- Nodes `hand_R` / `hand_L` (armatures, origin = forearm centre). Clips `R_<pose>` / `L_<pose>` with poses `idle, open, spread, claw, flick, grab, cup`.
- `hands.tsx`: one `AnimationMixer` per hand, 0.12 s crossfades. Arms pivot at the elbow (`ELBOW_OFFSET = 0.15` behind the forearm centre). Pose pitch from `hand-pose.ts` is negated for the model (hand-pose convention: a negative pitch raises the fingers).
- `handFingers()` picks the pose: charge = claw, bolt cast = flick, Purify = spread (both), Ward = open (left). The skin's emissive map is a vein mask, tinted bolt `#b49cff`, Purify `#ffd27a`, Ward `#7fc8ff`, intensity 0 at rest.
- Not wired yet: `grab` (interact) and `cup` (holding the locket).

### Atmosphere
- Fog: normal `#0c0f17` / 0.055, bright `#1a2232` / 0.03, background matched.
- `GroundMist`: 110 / 240 / 380 puffs for graphics low / medium / high, 0.25 to 1.5 m high. Each puff wanders 1 m, less than the 1.2 m clearance from No. 12, the outbuilding and solid boxes (test-enforced).
- `Halo`: additive glow sprites on every streetlight, the porch lantern and the No. 12 streetlight. Sequence lights drive halo opacity with the same flicker/off/burst factor as the bulb.
- `Backdrop`: fog **off** on purpose (at 80 to 100 m the fog would hide it); colours are the fog colour × 0.40 (near row) and × 0.65 (far row), so it matches both brightness modes. The sky behind the Last House (x < -42, z > 22) is left empty for the hero silhouette.

### Street, house kit, streetlights, Last House (added 2026-11-09, evening)
- `exterior-scene.tsx` renders `terrain.glb` under `street_front.glb`; the flat ground plane stays underneath as a fallback. Terrain layers sit at y 0.02 (grass), 0.03 (road), 0.09 (pavement), 0.15 (kerb) and never overlap on the same layer.
- **House kit:** `KIT_HOUSES` in `scene/kit.tsx` maps greybox box ids to a variant, position and Y rotation (`PI` = front faces north, for the south arc). The greybox boxes are no longer drawn for those ids, but stay in `BOXES` as colliders. Footprints match, a test checks it. House 14's upper middle window is `prop.street.window_14`; `WindowShadow` now draws on that facade (z + 1.06 from the placement).
- **Streetlights:** every lamp is `Streetlight` (kit.tsx); the lamp light and halo stay in code. `SeqLight` poles now stand on the pavement (`SEQ_POLE` in exterior-scene.tsx) while the entity placements stay in the road, so `placements.ts` is untouched. `STREETLIGHTS` positions moved to the kerb side for the same reason.
- **Last House:** `house.last` is no longer drawn as a box (it is only the collider and the fallback). The GLB is authored in game coordinates (no node transforms). A warm point light and halo sit at the attic window (`light_last_house_attic`). The iron fence and gate are at x -46, inside the veil `gate.street.last_house_road` (z 21..44), so they never block anything the veil does not.
- Guessed layout (tune by eye, edit the constants at the top of `build_terrain.py`): road bands W x -59..-53, E x 52..60, N z -31..-25, S z 25..29; lane x -65..-60.
- Budgets: draw calls are one per material (terrain 7, kit variants 7-9, Last House 7+5+1), over the 3-per-asset target in the pipeline rules. Texture memory per kit variant is under 10 MB (no normal maps, 256-512 px).

## Supersedes
- `art-style.md` "flat values, no image textures" and "lights are never in the GLB / everything lit in code": the home now uses CC0 textures and baked lighting. (Lights themselves are still not in GLBs.)
- `asset-manifest.md` `chr_hands` clip list: the shipped clips are finger poses; arm motion comes from `hand-pose.ts`.

## Licences
- Textures: Poly Haven, CC0 1.0 (see `CREDITS.md`). Geometry, wallpaper patterns and the vein mask were made procedurally for this project.

## Addendum: No. 31, story items, locket

| File | Contents | Binding |
|---|---|---|
| `house_31.glb` | `geo_house31_garage`, `geo_house31_yard` (picket fence with gaps for path and drive), `light_house31_pumpkins` | `exterior-scene.tsx` (fallback box `garage.no31`) |
| `items.glb` | nodes named by entity id: `pickup_garden_fuse`, `clue_garden_walkie`, `clue_street_candy_bag`, `pickup_house66_fence_key`, `clue_hideout_journal_2`, `clue_lane_journal_3` (about 1.5x life size for readability) | placement x,z checked in `art-assets.test.ts` |
| `locket.glb` | `locket_smooth`, `locket_tarnished`, `locket_cracked` at the origin, life size, face +Z, emissive glass (scale per band), about 3.2k tris each | not wired yet: hook into the locket HUD/hand prop |

Notes: the east road band is x 52..56 (garden lawn east of it); `lib_nature.py` holds `dead_tree`, `branch`, `torus` helpers; `build_terrain.py` constants control the road bands. Fence, trees and bushes have no colliders.

## Characters (rigged + animated, 2026-11-11)

| File | What it is | Budget / checks |
|---|---|---|
| `public/assets/models/briggs.glb`, `watcher.glb` (Mr Corwin) | Corrupted bipeds, 23 joints, clips idle, walk, run, windup, strike, slam_windup, slam, stagger, stunned (kneel), purified (sit dazed / rocking); `eye_L`/`eye_R` nodes on the head | 14.7k / 11.8k tris, ~0.9 MB |
| `fox.glb`, `cat.glb`, `hound.glb` | Corrupted quadrupeds, 26 joints, clips idle, walk (prowl), run, windup (crouch), strike (lunge), stagger, stunned (on its side), purified (lies down); eye nodes | 4.9k / 4.9k / 5.9k tris, 0.5-0.7 MB |
| `gartner.glb`, `felix.glb` | NPCs: base clips plus `idle_scared` + `talk` (Gartner) and `asleep_float` (Felix) | 9.8k each |
| `src/scene/character-config.ts` | NEW: enemy def id / NPC entity -> model + look (`ENEMY_LOOKS`, `NPC_LOOKS`), `enemyClip()` FSM state -> clip | |
| `src/scene/characters.tsx` | NEW: `EnemyModel` (clips, facing, telegraph tint, hit flash, dissolve; red eye glow + two dark aura shells while corrupted, fading out once purified), `Npcs` / `NpcModel` | |
| `src/scene/fsm-enemies.tsx` | Draws `EnemyModel` when the def has a look; the greybox box stays as loading/failure fallback; the smoke wraith keeps its box | |
| `src/ui/game-view.tsx` | Mounts `<Npcs runtime />` | |
| `src/scene/characters.test.ts` | GLB checks (skin, budget, clips, eye nodes) + `enemyClip` / turning tests | |
| `apps/client/char-preview.html` + `src/dev/char-preview.tsx` | Dev-only preview page (`/char-preview.html?only=fox&state=chase&cam=near&bright=1`), not in the build | |

Where they appear: Briggs `enemy.garden.briggs`, the Watcher + shadow decoys (all-black Watcher) `enemy.house66.watcher`, fox `enemy.street.fox`, cat `enemy.interior.cat`, hounds `enemy.grounds.hound_*` and the training hound. Gartner stands on `npc.hideout.gartner` while the runtime shows that entity (his greybox marker hides itself through `registerModelNodes`). Felix floats asleep 1.1 m above `seal.ritual.central` whenever the Last House scene is loaded (`npc.ritual.felix` has no placement of its own), translucent, with a soft blue light.

State -> clip: idle/patrol/chase by measured speed (walk, run for animals only; Briggs shambles and the Watcher steps at 12 fps); a telegraph scrubs `windup` (or `slam_windup` when a slam ring shows) by its 0..1 progress, then `strike`/`slam` plays once; `staggered` -> stagger; stunned and destroyed -> stunned (destroyed dissolves with `coatOpacity`); purified -> purified, and the eyes and aura fade out. Enemies face their movement, or Elena when engaged. Rebuild with `scripts/pipeline/rig_characters.py` then `animate_characters.py` (headless Blender). Elena and Rosalind are rigged too (in `asset_creation/char-glb/rigged/`) but not placed: Elena is first-person and Rosalind only speaks through the journals.
