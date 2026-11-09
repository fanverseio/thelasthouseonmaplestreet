import { describe, expect, it } from 'vitest';
import { createGameStore } from '../store/game-store.ts';
import { createWorldRuntime } from './world-runtime.ts';
import { ANGEL_RGB, CLUSTER_BUFFER_PX, CLUSTER_CSS_PX, MOTE_COUNT, MOTE_RADIUS, MOTE_SIZE, angelRgb, angelRgbFor, createMotes } from './angel-look.ts';
import { panelFor, routeLine } from './speech-target.ts';

describe('angel look', () => {
  it('maps each hidden band to its colour', () => {
    expect(angelRgb('kind')).toEqual([127, 200, 255]);
    expect(angelRgb('neutral')).toEqual([214, 200, 255]);
    expect(angelRgb('dark')).toEqual([255, 96, 80]);
    expect(angelRgbFor(60)).toBe(ANGEL_RGB.kind);
    expect(angelRgbFor(0)).toBe(ANGEL_RGB.neutral);
    expect(angelRgbFor(-60)).toBe(ANGEL_RGB.dark);
  });

  it('builds 18 motes inside the scaled (20% smaller) ranges, deterministically', () => {
    const motes = createMotes();
    expect(motes).toHaveLength(MOTE_COUNT);
    expect(MOTE_COUNT).toBe(18);
    expect(CLUSTER_CSS_PX).toBe(56);
    expect(CLUSTER_BUFFER_PX).toBe(112);
    expect(MOTE_RADIUS.min).toBeCloseTo(8);
    expect(MOTE_RADIUS.max).toBeCloseTo(35.2);
    for (const m of motes) {
      expect(m.radius).toBeGreaterThanOrEqual(MOTE_RADIUS.min);
      expect(m.radius).toBeLessThanOrEqual(MOTE_RADIUS.max);
      expect(m.size).toBeGreaterThanOrEqual(MOTE_SIZE.min);
      expect(m.size).toBeLessThanOrEqual(MOTE_SIZE.max);
    }
    expect(createMotes()).toEqual(motes);
  });
});

describe('which panel shows a line', () => {
  it('sends Angel lines to the Angel panel and everyone else to the subtitles', () => {
    expect(panelFor('Angel')).toBe('angel');
    expect(panelFor('Elena')).toBe('subtitles');
    expect(panelFor('Felix')).toBe('subtitles');
    const a = { speaker: 'Angel', text: 'x' };
    const e = { speaker: 'Elena', text: 'y' };
    expect(routeLine(a)).toEqual({ angel: a, subtitle: null });
    expect(routeLine(e)).toEqual({ angel: null, subtitle: e });
    expect(routeLine(null)).toEqual({ angel: null, subtitle: null });
  });
});

describe('Classic locket no longer pauses', () => {
  it('T yields an Angel line shown as the subtitle while the phase stays playing', () => {
    const store = createGameStore();
    store.getState().startNewGame('classic');
    store.getState().setPhase('playing');
    const lines: string[] = [];
    const rt = createWorldRuntime({ store, onLine: (l) => lines.push(l.lineId) });
    store.getState().setFlag('locket_taken');
    store.getState().setFlag('angel_awake');
    expect(rt.canOpenLocket()).toBe(true);
    const got = rt.locketLine();
    expect(got?.line.speaker).toBe('Angel');
    expect(store.getState().game.phase).toBe('playing');
    expect(rt.subtitle?.lineId).toBe(got?.line.lineId);
    expect(routeLine(rt.subtitle).angel).not.toBeNull();
    expect(lines).toContain(got!.line.lineId);
    if (got?.hasNext) expect(rt.locketLine()?.line.lineId).not.toBe(got.line.lineId);
    expect(store.getState().game.phase).toBe('playing');
  });
});
