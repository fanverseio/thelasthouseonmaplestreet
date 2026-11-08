/**
 * Developer test readout: where Elena stands and which way she faces.
 * Map frame: +X east, +Z south. Yaw 0 faces -Z (north); turning left increases yaw.
 */
const COMPASS = ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'] as const;

/** Heading in degrees, 0..359, measured the same way as yaw (0 = north, 90 = west). */
export function headingDegrees(yaw: number): number {
  const deg = ((yaw * 180) / Math.PI) % 360;
  return Math.round(deg < 0 ? deg + 360 : deg) % 360;
}

export function compassOf(yaw: number): (typeof COMPASS)[number] {
  return COMPASS[Math.round(headingDegrees(yaw) / 45) % 8]!;
}

/** Pitch in whole degrees: + looking up, - looking down. */
export function pitchDegrees(pitch: number): number {
  return Math.round((pitch * 180) / Math.PI) || 0;
}

export function formatReadout(x: number, z: number, yaw: number, pitch?: number): string {
  const base = `x ${x.toFixed(1)}  z ${z.toFixed(1)}  facing ${compassOf(yaw)} ${headingDegrees(yaw)}°`;
  return pitch === undefined ? base : `${base}  pitch ${pitchDegrees(pitch)}°`;
}
