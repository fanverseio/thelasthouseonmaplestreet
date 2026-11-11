# Asset Manifest

Status: DRAFT, needs author approval.
One entry per asset so separate agents can build them in parallel. Read `asset-conventions.md` first. Each entry gives: **ID**, **brief**, **budget**, **format**, **output path** (under `apps/client/public/assets/`), **generator**, **license note**, **binds to** (entity IDs or system).
Generators: `blender` (modelled in this repo, `.blend` in `assets/src/`), `procedural` (shader or code, no file), `elevenlabs` (via `tools/gen-voice`), `imagegen` (via `tools/gen-image`, then edited), `self` (recorded or synthesised by the author or an agent). Fallback for any entry: CC0 only, recorded in `CREDITS.md`.
Style: stylized realistic Halloween. Slightly exaggerated proportions, hand-painted roughness, moonlit blues and sodium-orange practical lights, wet surfaces, heavy fog. PBR (base colour, normal, ORM).
Priority: **P0** needed for the Nov 13 slice (beats 1-4), **P1** Nov 20, **P2** Nov 27 (asset freeze).

## 1. Environment models
| ID | Brief | Budget | Format | Output | Gen | Binds to | Pri |
|---|---|---|---|---|---|---|---|
| `mdl_home_elena` | No. 12, single-storey: Felix's room, hall with drawer table, kitchen, front door, porch. Exterior shell too | 25k tris, 2 x 2048 | GLB | `models/home_elena.glb` | blender | zone `home`, `door.home.front`, `socket.home.drawer`, `light.home.felix_window` | P0 |
| `mdl_house_kit` | Modular suburban house kit: 3 facades, porches, windows (lit and unlit), roofs, chimneys | 6k tris per variant, shared 2048 atlas | GLB | `models/house_kit.glb` | blender | street houses incl. `prop.street.window_14` | P0 |
| `mdl_house_31` | Mr Briggs' house front, garden, driveway, roll-up garage with shelves and fuse box | 15k tris | GLB | `models/house_31.glb` | blender | zone `garden`, `door.garden.garage`, `pickup.garden.fuse` | P0 |
| `mdl_shed_40` | Garden shed with a dented door, cobwebs, a camping lamp inside | 5k tris | GLB | `models/shed_40.glb` | blender | `door.hideout.shed`, `light.hideout.shed_bulb` | P1 |
| `mdl_house_66` | Tall narrow Victorian, peeling paint, porch with rocking chair, side fuse box, lane gate, upstairs window | 18k tris | GLB | `models/house_66.glb` | blender | zone `house66`, `socket.house66.fusebox`, `gate.house66.lane` | P1 |
| `mdl_lane` | Narrow back lane: fences, nettles, bins, lamp, the view over Elena's back fence | 10k tris | GLB | `models/lane.glb` | blender | zone `lane` | P1 |
| `mdl_last_house_ext` | HERO. The Last House: crooked Gothic Revival, black shingles, one lit attic window, iron front gate, overgrown grounds | 40k tris, 3 x 2048 | GLB | `models/last_house_ext.glb` | blender | `gate.street.last_house_road`, `door.grounds.last_house_front` | P0 (silhouette) / P1 (detail) |
| `mdl_outbuilding` | Carriage house interior: dusty tack, covered furniture, the antique mirror wall | 12k tris | GLB | `models/outbuilding.glb` | blender | `door.grounds.outbuilding`, `mirror.grounds.antique`, `rune.grounds.r1`..`r3` | P1 |
| `mdl_last_house_int` | Entrance hall, staircase (blocked), study, cellar door, hall table for the talking board | 35k tris | GLB | `models/last_house_int.glb` | blender | zone `interior` | P1 |
| `mdl_ritual_chamber` | Circular stone cellar, central seal (floor), three anchor alcoves N/E/W | 30k tris | GLB | `models/ritual_chamber.glb` | blender | zone `ritual`, `seal.ritual.central`, `anchor.ritual.*`, `door.ritual.*` | P1 |
| `mdl_green` | Maple Green: old oak, bandstand, swing, lamp, benches, leaf piles | 15k tris | GLB | `models/green.glb` | blender | `prop.street.swing`, `light.street.green_lamp`, `pickup.street.toy_rabbit` | P1 |
| `mdl_terrain` | Street, pavements, kerbs, grass, garden plots for the whole loop | 20k tris | GLB | `models/terrain.glb` | blender | exterior scene | P0 |

## 2. Props (instanced where possible)
| ID | Brief | Budget | Output | Gen | Binds to | Pri |
|---|---|---|---|---|---|---|
| `prp_streetlight` | Old cast-iron streetlight; bulb mesh separate for flicker and burst | 1.5k | `models/props.glb#streetlight` | blender | `light.street.*`, `light.lane.lamp_1` | P0 |
| `prp_fences` | Picket, iron and lane fences, hedges (cards) | 2k each | `models/props.glb#fences` | blender | exterior | P0 |
| `prp_trees` | Bare maple, oak, conifer; leaf cards | 4k each | `models/props.glb#trees` | blender | exterior | P1 |
| `prp_halloween` | Jack-o'-lanterns (lit), yard gravestones, skeleton, cobweb cards, bunting | 1k each | `models/props.glb#halloween` | blender | exterior dressing | P1 |
| `prp_street_misc` | Parked car, bins, mailbox, bench, garden gate (No. 22), wind chimes | 3k each | `models/props.glb#street` | blender | `door.street.no22_gate`, `prop.street.wind_chimes` | P1 |
| `prp_smoke_veil` | Volumetric-looking card stack + shader for the smoke gates | procedural | `-` | procedural | `gate.street.veil_*` | P0 |
| `prp_story_items` | Drawer key, fuse, fence key, walkie-talkie, candy bag, toy rabbit, photo frame, candles, journal page, Felix's drawing, ceramic pumpkin jar | 500 each | `models/items.glb` | blender | pickups and clues | P0 |
| `prp_locket` | HERO. The Whispering Locket: silver, filigree, a glass window with inner light; three variants (smooth, tarnished, cracked) | 3k, 1024 | `models/locket.glb` | blender | locket UI, hands | P0 |
| `prp_interior_misc` | Piano, chandelier, talking board and planchette, hall table, study desk | 3k each | `models/interior_props.glb` | blender | `prop.interior.piano`, `light.interior.chandelier`, `puzzle.interior.board` | P1 |
| `prp_padlock` | 4-dial brass padlock (dials as separate nodes) | 1k | `models/items.glb#padlock` | blender | `puzzle.grounds.padlock` | P1 |

## 3. Characters and animation
| ID | Brief | Budget | Rig / clips | Output | Gen | Binds to | Pri |
|---|---|---|---|---|---|---|---|
| `chr_hands` | Elena's first-person forearms and hands, wedding ring, cardigan sleeves; emissive veins for magic | 8k, 2048 | idle, walk bob, cast_bolt, charge_loop, release, purify_loop, ward_raise, interact, hurt, hold_locket | `models/hands.glb` | blender | player | P0 |
| `chr_felix_spirit` | 8-year-old in a half-finished ghost costume; translucent shader | 10k | stand, point, whisper, fade_in, fade_out, asleep_float | `models/felix.glb` | blender | `npc.ritual.felix`, Seq 2, Seq 5, `cin_felix_anchor`, endings | P0 |
| `chr_gartner` | About 9, mixed race, warm light-brown skin, short curly dark hair, hoodie, cardboard sword, red eyes from crying | 10k | idle_scared, talk, hand_over, flinch | `models/gartner.glb` | blender | `npc.hideout.gartner` | P1 |
| `chr_briggs` | 60s neighbour in a cardigan; corrupted blend shapes (long limbs, smoke eyes) | 15k | rake_idle, turn, transform, swipe, slam, stagger, stun_kneel, sit_dazed, dissolve | `models/briggs.glb` | blender | `enemy.garden.briggs` | P0 |
| `chr_watcher` | 80s, thin, long coat, binoculars round his neck | 12k | idle, step (12 fps), grab, stagger, stun_kneel, teleport_out, teleport_in, sit_rocking | `models/watcher.glb` | blender | `enemy.house66.watcher`, decoys (same mesh, shadow shader) | P1 |
| `chr_quadruped_small` | Shared rig: fox and cat meshes | 5k each | idle, prowl, run, crouch_telegraph, bite or pounce, stun_lie, flee, dissolve | `models/fox.glb`, `models/cat.glb` | blender | `enemy.street.fox`, `enemy.interior.cat` | P0 (fox) / P1 (cat) |
| `chr_hound` | Lean hound | 6k | same clip set | `models/hound.glb` | blender | `enemy.grounds.hound_*` | P1 |
| `chr_wraith` | Smoke wraith: simple torso mesh + smoke shader | 2k | float, claw, dissolve | `models/wraith.glb` | blender + procedural | `spawn.ritual.wraith_*` | P2 |

## 4. VFX (procedural unless noted)
| ID | Brief | Binds to | Pri |
|---|---|---|---|
| `vfx_bolt` | Violet-white projectile, trail, impact burst; charged variant larger with sparks | Arcane Bolt | P0 |
| `vfx_purify_beam` | Warm gold beam, motes rising from the target, release flash | Purify | P0 |
| `vfx_ward` | Hex-pattern bubble, ripples on hit | Ward | P0 |
| `vfx_smoke_corruption` | Black smoke clinging to enemies; mouth and eye wisps | enemies | P0 |
| `vfx_dissolve` | Body dissolving into smoke (destroy), dissolve into light (purify) | enemies | P0 |
| `vfx_veil_recede` | Smoke wall pulling back along the ground | gates | P0 |
| `vfx_light_flicker_burst` | Flicker curves, bulb burst with glass sparks | lights | P0 |
| `vfx_teleport_puff` | Destination marker and arrival burst | Watcher | P1 |
| `vfx_mirror` | Reflection lag, crack overlay, runes visible only in the reflection | mirror, runes | P1 |
| `vfx_runes_seal` | Glowing floor runes, anchor restore surge, seal light columns | ritual | P1 |
| `vfx_telegraph_ring` | Ground ring telegraph, hazard pool | ritual, Briggs slam | P1 |
| `vfx_locket_glow` | Glow, motes and crack shader per band (continuous) | locket | P0 |
| `vfx_fog_post` | Height fog, film grain, vignette, colour grade LUT (3 LUTs: exterior, interior, ritual) | post | P0 |

## 5. Textures, sky and UI
| ID | Brief | Format | Output | Gen | Pri |
|---|---|---|---|---|---|
| `tex_sky_night` | Moonlit cloudy sky with a large moon; equirect 4k | KTX2 / HDR | `textures/sky_night.ktx2` | imagegen + edit | P0 |
| `tex_surfaces` | Asphalt wet, pavement, grass, leaves, brick, wood siding, slate, stone | KTX2 2048 | `textures/surfaces/*` | imagegen or blender bake | P0 |
| `tex_felix_drawing` | Child's crayon drawing: a pumpkin with a key inside, "my secret hiding place" | WebP 1024 | `textures/felix_drawing.webp` | imagegen + hand edit | P0 |
| `tex_journal_pages` | Five aged journal pages in Rosalind's handwriting (text from the script; page 4 with an ink blot) | WebP 1536 | `ui/journal_1..5.webp` | imagegen (paper) + typeset | P1 |
| `ui_title` | "The Last House on Maple Street" title lockup | SVG | `ui/title.svg` | self | P0 |
| `ui_locket_frame` | Locket conversation frame, 3 band variants | WebP / SVG | `ui/locket_*.webp` | imagegen + edit | P0 |
| `ui_icons` | Spell icons (3), item icons (5), interact prompt glyphs | SVG | `ui/icons/*.svg` | self | P0 |
| `ui_menu_bg` | Menu background: the Last House at the end of the fogged street | WebP 1920 | `ui/menu_bg.webp` | in-engine capture | P1 |
| `ui_end_cards` | Two end cards (Keeper, Broken Seal) | WebP | `ui/end_*.webp` | in-engine capture + type | P2 |
| `font_display`, `font_body` | Open-licence fonts (OFL) | WOFF2 | `fonts/*` | open licence | P0 |

## 6. Audio
| ID | Brief | Format | Output | Gen | Pri |
|---|---|---|---|---|---|
| `amb_<zone>` | One loop per zone: home (clock, fridge hum), street (wind, distant nothing), garden (leaves), house66 (creaks), lane (insects, gravel), grounds (crows, wind), interior (house settling), ritual (low drone) | OGG stereo, 60-90 s loops | `audio/amb/*.ogg` | self | P0 (home, street) / P1 |
| `sfx_footsteps_*` | Surfaces: wood, tile, pavement, grass, gravel, stone; 6 variations each | OGG mono | `audio/sfx/` | self | P0 |
| `sfx_world` | Doors, gates, veil recede, flicker buzz, bulb burst, drawer, padlock dials, planchette, fuse snap, mirror crack, anchor restore, seal choice | OGG mono | `audio/sfx/` | self | P0/P1 |
| `sfx_spells` | Bolt cast, charge loop, release, impact; purify loop and release; ward up and hit | OGG mono | `audio/sfx/` | self | P0 |
| `sfx_creatures` | Fox, hound, cat vocal sets; Briggs and Watcher efforts; wraith hiss; smoke breathing | OGG mono | `audio/sfx/` | self | P0/P1 |
| `sfx_scares` | Six board scares, whispers set (10), footsteps behind | OGG | `audio/sfx/` | self | P1 |
| `mus_*` | Menu theme; exploration tension layers (3 stems); combat stem; ritual music; two ending cues; credits | OGG stereo | `audio/mus/` | self (no copyrighted music) | P1/P2 |
| `vo_*` | All lines in `script/act1.md`, `script/act2-3.md`, `angel-persona.md`, `side-quests.md` (170) | MP3 44.1 kHz 128 kbps mono | `audio/vo/<line_id>.mp3` | elevenlabs | P0 (act 1) / P1 |

## 7. Tools (specified, not yet built)
| Tool | Purpose | Reads | Writes |
|---|---|---|---|
| `tools/gen-voice.mjs` | Generate VO for every line ID in the script files with the voice ID per character; skip lines whose audio already exists unless `--force`; rate-limited | `.env` (`ELEVENLABS_*`), `docs/script/*.md` line tables | `assets/raw/vo/` then copies approved takes to `apps/client/public/assets/audio/vo/` |
| `tools/gen-image.mjs` | Call the configured image API with a prompt file; save drafts | `.env` (`IMAGE_GEN_*`), `tools/prompts/*.txt` | `assets/raw/images/` |
| `tools/optimize-glb.mjs` | meshopt + KTX2 compression of exported GLBs (needs the `@gltf-transform/cli` dev dependency; approval required) | `assets/raw/glb/` | `apps/client/public/assets/models/` |
| `tools/check-assets.mjs` | Compare this manifest and the level manifest with the files on disk; report missing, oversized or unbound assets | manifests | stdout |
| `tools/hash-access-code.mjs` | Print `label:sha256hex` for a new access code | argv | stdout |
All tools read keys only from `.env`, never print them, and never write outside `assets/raw/` or `apps/client/public/assets/`.

## 8. Open questions for the author
1. Is ElevenLabs' licence for your plan compatible with committing generated audio to a public MIT repository?
2. Which image generation tool, and do its terms allow commercial and open-source redistribution of outputs?
3. Is MP3 acceptable for voice (no transcoding dependency), with OGG for everything else?