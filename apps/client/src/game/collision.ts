/**
 * 2D (XZ plane) collision: the mover is a circle; statics are AABBs and cylinders.
 * Movement is sub-stepped and pushed out of overlaps, which gives wall sliding and no tunnelling.
 */

export interface AabbCollider {
  kind: 'aabb';
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface CylinderCollider {
  kind: 'cylinder';
  x: number;
  z: number;
  radius: number;
}

export type Collider = AabbCollider | CylinderCollider;

export interface Vec2 {
  x: number;
  z: number;
}

export function aabb(minX: number, minZ: number, maxX: number, maxZ: number): AabbCollider {
  return { kind: 'aabb', minX, minZ, maxX, maxZ };
}

export function cylinder(x: number, z: number, radius: number): CylinderCollider {
  return { kind: 'cylinder', x, z, radius };
}

/** Push the circle out of one collider. Returns true if it moved. */
function pushOut(p: Vec2, radius: number, c: Collider): boolean {
  if (c.kind === 'cylinder') {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const min = radius + c.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return false;
    const d = Math.sqrt(d2);
    if (d < 1e-9) {
      p.x = c.x + min;
      return true;
    }
    p.x = c.x + (dx / d) * min;
    p.z = c.z + (dz / d) * min;
    return true;
  }
  const nx = Math.min(Math.max(p.x, c.minX), c.maxX);
  const nz = Math.min(Math.max(p.z, c.minZ), c.maxZ);
  const dx = p.x - nx;
  const dz = p.z - nz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return false;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    p.x = nx + (dx / d) * radius;
    p.z = nz + (dz / d) * radius;
    return true;
  }
  // Centre inside the box: leave through the nearest face.
  const left = p.x - c.minX;
  const right = c.maxX - p.x;
  const near = p.z - c.minZ;
  const far = c.maxZ - p.z;
  const m = Math.min(left, right, near, far);
  if (m === left) p.x = c.minX - radius;
  else if (m === right) p.x = c.maxX + radius;
  else if (m === near) p.z = c.minZ - radius;
  else p.z = c.maxZ + radius;
  return true;
}

/**
 * Move `from` by `delta`, resolving against colliders. Returns the new position.
 * Sub-steps are at most half the radius long, so a fast mover cannot skip a thin wall.
 */
export function moveAndSlide(from: Vec2, delta: Vec2, radius: number, colliders: readonly Collider[]): Vec2 {
  const dist = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.ceil(dist / (radius * 0.5)));
  const p = { x: from.x, z: from.z };
  const sx = delta.x / steps;
  const sz = delta.z / steps;
  for (let i = 0; i < steps; i++) {
    p.x += sx;
    p.z += sz;
    // Two passes settle corners where two colliders meet.
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;
      for (const c of colliders) moved = pushOut(p, radius, c) || moved;
      if (!moved) break;
    }
  }
  return p;
}
