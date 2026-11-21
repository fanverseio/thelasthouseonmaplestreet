import type { ProgressFlag } from '@tlh/shared';
import { describe, expect, it } from 'vitest';
import { getLine } from '../content/dialogue/index.ts';
import { ALL_INTERACTIONS } from '../content/interactions/index.ts';
import { BOXES } from '../content/world/exterior-layout.ts';
import { OUTBUILDING_BOUNDS } from '../content/world/grounds-layout.ts';
import { ALL_ENTITIES, createWorldRegistry, GATES } from '../content/world/index.ts';
import { PLACEMENTS } from '../content/world/placements.ts';
import { NPC_LOOKS } from '../scene/character-config.ts';
import {
  HOUSE66_DOOR,
  LAST_HOUSE_DOOR,
  PADLOCK,
  PORTRAIT,
  SHED,
  lastHouseDoorAjar,
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

describe('note 18: the portrait and the rune hint', () => {
  const registry = createWorldRegistry();
  it('is a non-critical inspectable clue inside the outbuilding, with a hint line', () => {
    expect(registry.has('clue.grounds.portrait')).toBe(true);
    const e = ALL_ENTITIES.find((x) => x.id === 'clue.grounds.portrait')!;
    expect(e.critical).toBe(false);
    expect(e.capabilities).toEqual(['inspectable']);
    const p = PLACEMENTS['clue.grounds.portrait']!;
    expect(p.x).toBeGreaterThan(OUTBUILDING_BOUNDS.minX);
    expect(p.x).toBeLessThan(OUTBUILDING_BOUNDS.maxX);
    expect(p.z).toBeGreaterThan(OUTBUILDING_BOUNDS.minZ);
    expect(p.z).toBeLessThan(OUTBUILDING_BOUNDS.maxZ);
    expect(PORTRAIT.x).toBeCloseTo(OUTBUILDING_BOUNDS.minX + 0.48, 1); // on the west wall's inner face
    const i = ALL_INTERACTIONS.interactions.find((x) => x.id === 'clue.grounds.portrait')!;
    expect(i.show?.flags).toEqual(['padlock_open']);
    expect(i.actions).toEqual([{ do: 'say', line: 'vo_elena_b8_portrait' }]);
    expect(getLine('vo_elena_b8_portrait')?.text).toMatch(/mirror/i);
    expect(ALL_INTERACTIONS.hints.find((h) => h.id === 'p4_runes')!.steps.some((s) => s.highlight === 'clue.grounds.portrait')).toBe(true);
  });

  it('the Angel T ladder explains the runes on the second press, from seq5_done until runes_done', () => {
    const flags = ['seq5_done'] as ProgressFlag[];
    const puzzle = activeTPuzzle(flags)!;
    expect(puzzle.id).toBe('p4_runes');
    expect(tHintLine(puzzle, 1)).toBe('vo_angel_p4_h2');
    expect(tHintLine(puzzle, 2)).toBe('vo_angel_p4_t2');
    expect(tHintLine(puzzle, 5)).toBe('vo_angel_p4_t2');
    expect(getLine('vo_angel_p4_t2')?.text).toMatch(/mirror/i);
    expect(activeTPuzzle([...flags, 'runes_done'])).toBeNull();
    expect(activeTPuzzle(['padlock_open'])).toBeNull(); // before the mirror scene the ladder is off
  });
});

describe('note 19: the Last House door ajar', () => {
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
    expect(LAST_HOUSE_DOOR.ajarRad).toBeGreaterThan(0);
    expect(LAST_HOUSE_DOOR.ajarRad).toBeLessThan(Math.PI / 2);
  });
});
