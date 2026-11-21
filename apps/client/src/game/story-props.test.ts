import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import { BOXES } from '../content/world/exterior-layout.ts';
import { OUTBUILDING_BOUNDS, PAINTING } from '../content/world/grounds-layout.ts';
import { ALL_ENTITIES, createWorldRegistry, GATES } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { NPC_LOOKS } from '../scene/character-config.ts';
import {
  HOUSE66_DOOR,
  LAST_HOUSE_DOOR,
  PADLOCK,
  SHED,
  lastHouseDoorAjar,
  lastHouseDoorOutline,
  shedDoorOpen,
} from '../content/world/story-props-layout.ts';
import { isGateOpen } from './gates.ts';
import { activeTPuzzle, tHintLine } from './t-hints.ts';

const box = (id: string) => BOXES.find((b) => b.id === id)!;

describe('note 8: Gartner and the shed', () => {
  it('the shed door is shut until Elena knocks, then open for good', () => {
    expect(shedDoorOpen(['walkie_found'], null)).toBe(false);
    expect(shedDoorOpen(['walkie_found'], 'seq4_gartner_confession')).toBe(true);
    expect(shedDoorOpen(['walkie_found'], 'seq2_felix_streetlight')).toBe(false);
    expect(shedDoorOpen(['seq4_done'], null)).toBe(true);
  });

  it('the visual shed matches the collider box, and Gartner and the bulb are inside it', () => {
    const b = box('shed.no40');
    expect(SHED.minX).toBe(b.x - b.w / 2);
    expect(SHED.maxX).toBe(b.x + b.w / 2);
    expect(SHED.minZ).toBe(b.z - b.d / 2);
    expect(SHED.maxZ).toBe(b.z + b.d / 2);
    expect(SHED.height).toBe(b.h);
    // Placements stay on free ground (placements.test.ts); the drawn Gartner and bulb sit inside the shed.
    for (const p of [SHED.gartner, SHED.bulb]) {
      expect(p.x).toBeGreaterThan(SHED.minX);
      expect(p.x).toBeLessThan(SHED.maxX);
      expect(p.z).toBeGreaterThan(SHED.minZ);
      expect(p.z).toBeLessThan(SHED.maxZ);
    }
    expect(NPC_LOOKS['npc.hideout.gartner']!.view).toEqual(SHED.gartner);
    // The doorway is where the knock happens (the door interaction stays at the front, unchanged).
    const door = PLACEMENTS['door.hideout.shed']!;
    expect(door.x).toBeGreaterThanOrEqual(SHED.doorMinX);
    expect(door.x).toBeLessThanOrEqual(SHED.doorMaxX);
  });

  it('the Beat 5 interaction and flags are unchanged', () => {
    const door = ALL_INTERACTIONS.interactions.find((i) => i.id === 'door.hideout.shed')!;
    expect(door.requires?.flags).toEqual(['walkie_found']);
    expect(door.actions).toEqual([{ do: 'startSequence', sequence: 'seq4_gartner_confession' }]);
  });
});

describe('note 11: the 66 on House 66', () => {
  it('the numbered door is on the front (+z) face of the house66 box, inside its width', () => {
    const b = box('house66');
    expect(HOUSE66_DOOR.z).toBe(b.z + b.d / 2);
    expect(HOUSE66_DOOR.x - HOUSE66_DOOR.width / 2).toBeGreaterThan(b.x - b.w / 2);
    expect(HOUSE66_DOOR.x + HOUSE66_DOOR.width / 2).toBeLessThan(b.x + b.w / 2);
    expect(HOUSE66_DOOR.plaqueY).toBeLessThan(HOUSE66_DOOR.height);
  });
});

describe('note 14: the window line', () => {
  it('no longer calls the lane view "our house" and says which house it is', () => {
    const text = getLine('vo_elena_b7_01')!.text;
    expect(text).not.toMatch(/our house/i);
    expect(text).toMatch(/my house/i);
    expect(text).toMatch(/Felix's window/);
  });
});

describe('note 15: the padlock', () => {
  it('hangs on the outbuilding door, keeps its entity and its number-lock interaction', () => {
    const p = PLACEMENTS['puzzle.grounds.padlock']!;
    expect(Math.abs(p.x - PADLOCK.x)).toBeLessThan(0.5);
    expect(PADLOCK.z).toBeLessThan(OUTBUILDING_BOUNDS.minZ); // outside the north wall
    expect(PADLOCK.z).toBeGreaterThan(p.z);
    const i = ALL_INTERACTIONS.interactions.find((x) => x.id === 'puzzle.grounds.padlock')!;
    expect(i.actions).toEqual([{ do: 'openPuzzle', puzzle: 'p3_padlock' }]);
  });
});

describe('note 18: the family painting replaces the mirror and the portrait', () => {
  const registry = createWorldRegistry();
  it('one painting entity, critical, owned by seq5; no mirror and no portrait remain', () => {
    expect(registry.has('clue.grounds.painting')).toBe(true);
    expect(registry.has('mirror.grounds.antique')).toBe(false);
    expect(registry.has('clue.grounds.portrait')).toBe(false);
    expect(ALL_ENTITIES.some((e) => e.kind === ('mirror' as never))).toBe(false);
    const e = ALL_ENTITIES.find((x) => x.id === 'clue.grounds.painting')!;
    expect(e.critical).toBe(true);
    expect(e.owner).toBe('seq5_felix_mirror');
    const p = PLACEMENTS['clue.grounds.painting']!;
    expect(Math.abs(p.x - PAINTING.x)).toBeLessThan(0.01);
    expect(p.z).toBeGreaterThan(OUTBUILDING_BOUNDS.minZ);
    expect(p.z).toBeLessThan(OUTBUILDING_BOUNDS.maxZ);
    const i = ALL_INTERACTIONS.interactions.find((x) => x.id === 'clue.grounds.painting')!;
    expect(i.requires?.flags).toEqual(['padlock_open']);
    expect(i.actions).toEqual([{ do: 'startSequence', sequence: 'seq5_felix_mirror' }]);
    expect(ALL_INTERACTIONS.interactions.some((x) => x.id === 'clue.grounds.portrait')).toBe(false);
    expect(getLine('vo_elena_b8_portrait')).toBeUndefined();
  });

  it('the Angel T ladder explains the hidden runes on the second press, from seq5_done until runes_done', () => {
    const flags = ['seq5_done'] as ProgressFlag[];
    const puzzle = activeTPuzzle(flags)!;
    expect(puzzle.id).toBe('p4_runes');
    expect(tHintLine(puzzle, 1)).toBe('vo_angel_p4_h2');
    expect(tHintLine(puzzle, 2)).toBe('vo_angel_p4_t2');
    expect(tHintLine(puzzle, 5)).toBe('vo_angel_p4_t2');
    for (const id of ['vo_angel_p4_h2', 'vo_angel_p4_t2']) {
      expect(getLine(id)?.text, id).toMatch(/Purify/);
      expect(getLine(id)?.text, id).not.toMatch(/mirror|glass/i);
    }
    expect(activeTPuzzle([...flags, 'runes_done'])).toBeNull();
    expect(activeTPuzzle(['padlock_open'])).toBeNull(); // before the painting scene the ladder is off
  });
});

describe('note 19: the Last House door', () => {
  it('is driven only by the runes_done gate and the door stays an ordinary entry interaction', () => {
    const gate = GATES.find((g) => g.id === 'door.grounds.last_house_front')!;
    expect(gate.opensOn).toBe('runes_done');
    expect(lastHouseDoorAjar([])).toBe(false);
    expect(lastHouseDoorAjar(['seq5_done'])).toBe(false);
    expect(lastHouseDoorAjar(['runes_done'])).toBe(true);
    expect(isGateOpen(gate, ['runes_done'])).toBe(true);
    const enter = ALL_INTERACTIONS.interactions.find((i) => i.id === 'door.grounds.last_house_front')!;
    expect(enter.requires?.flags).toEqual(['runes_done']);
    expect(enter.actions.some((a) => a.do === 'enterScene')).toBe(true);
  });

  it('the leaf is hinged inside the door width on the front face of the house box', () => {
    const b = box('house.last');
    expect(LAST_HOUSE_DOOR.z).toBe(b.z - b.d / 2);
    expect(LAST_HOUSE_DOOR.hingeX).toBeGreaterThan(b.x - b.w / 2);
    expect(LAST_HOUSE_DOOR.hingeX + LAST_HOUSE_DOOR.width).toBeLessThan(b.x + b.w / 2);
    expect(LAST_HOUSE_DOOR.hingeX + LAST_HOUSE_DOOR.width / 2).toBeCloseTo(LAST_HOUSE_DOOR.x, 5); // centred in the opening
    expect(LAST_HOUSE_DOOR.ajarRad).toBeGreaterThan(0);
    expect(LAST_HOUSE_DOOR.ajarRad).toBeLessThan(Math.PI / 2);
  });

  it('the pointed outline fits the opening: square foot, straight jambs to the spring line, apex in the middle', () => {
    const pts = lastHouseDoorOutline(8);
    const { width, height, spring, sill } = LAST_HOUSE_DOOR;
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[1]).toEqual([width, 0]);
    expect(pts[2]).toEqual([width, spring - sill]);
    const top = pts.reduce((a, p) => (p[1] > a[1] ? p : a));
    expect(top[0]).toBeCloseTo(width / 2, 5);
    expect(top[1]).toBeCloseTo(height, 2);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(-1e-9);
      expect(x).toBeLessThanOrEqual(width + 1e-9);
      expect(y).toBeLessThanOrEqual(height + 1e-6);
    }
  });
});
