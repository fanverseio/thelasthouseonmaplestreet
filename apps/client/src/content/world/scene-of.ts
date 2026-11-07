import type { SceneId } from '@tlh/shared';

const LAST_HOUSE_ZONES = new Set(['interior', 'ritual']);

/** Which 3D scene an entity lives in, from the zone in its ID (`kind.zone.name`). */
export function sceneOfEntity(id: string): SceneId {
  return LAST_HOUSE_ZONES.has(id.split('.')[1] ?? '') ? 'last_house' : 'exterior';
}
