// The Night Vault world: two facility floors, their walls and cover, the gem and the
// exit, and the guards who patrol them. Guards walk waypoint loops, pause to scan at
// each waypoint, and see in a cone that walls and crates block. Step the world with a
// fixed dt and the same run always plays out the same way.

import { FIELD, GUARD, PLAYER } from './config.js';

export const EVENT_CAUGHT = 1;
export const EVENT_GEM = 2;
export const EVENT_LEVEL_CLEAR = 4;

const BORDER = 24;

function borderWalls() {
  return [
    { x: 0, y: 0, w: FIELD.width, h: BORDER, kind: 'wall' },
    { x: 0, y: FIELD.height - BORDER, w: FIELD.width, h: BORDER, kind: 'wall' },
    { x: 0, y: 0, w: BORDER, h: FIELD.height, kind: 'wall' },
    { x: FIELD.width - BORDER, y: 0, w: BORDER, h: FIELD.height, kind: 'wall' },
  ];
}

function wall(x, y, w, h) {
  return { x, y, w, h, kind: 'wall' };
}

function crate(x, y, size) {
  return { x, y, w: size, h: size, kind: 'crate' };
}

export const LEVELS = [
  {
    name: 'Floor 1 — Lobby',
    briefing: 'Lift the gem from the vault office, then slip out the service exit.',
    solids: [
      ...borderWalls(),
      wall(420, BORDER, 24, 446),
      wall(444, 300, 456, 24),
      wall(900, 324, 24, 372),
      wall(180, 470, 240, 24),
      crate(250, 520, 64),
      crate(620, 140, 64),
      crate(1020, 480, 64),
      crate(700, 520, 48),
      crate(1010, 190, 56),
    ],
    playerStart: { x: 90, y: 620 },
    gem: { x: 1140, y: 120, r: 16 },
    exit: { x: 1166, y: 596, w: 90, h: 100 },
    guardPaths: [
      [
        { x: 300, y: 150 },
        { x: 1050, y: 150 },
        { x: 1050, y: 250 },
        { x: 300, y: 250 },
      ],
      [
        { x: 620, y: 620 },
        { x: 620, y: 420 },
        { x: 980, y: 420 },
        { x: 980, y: 620 },
      ],
    ],
  },
  {
    name: 'Floor 2 — Vault Floor',
    briefing: 'More patrols, tighter halls. Same job: gem first, then the exit.',
    solids: [
      ...borderWalls(),
      wall(320, BORDER, 24, 536),
      wall(640, 160, 24, 536),
      wall(960, BORDER, 24, 536),
      wall(344, 380, 296, 24),
      wall(664, 200, 296, 24),
      crate(450, 560, 64),
      crate(780, 300, 64),
      crate(1080, 600, 48),
      crate(150, 200, 64),
    ],
    playerStart: { x: 80, y: 80 },
    gem: { x: 1150, y: 620, r: 16 },
    exit: { x: 40, y: 596, w: 90, h: 100 },
    guardPaths: [
      [
        { x: 480, y: 120 },
        { x: 880, y: 120 },
        { x: 880, y: 300 },
        { x: 480, y: 300 },
      ],
      [
        { x: 180, y: 630 },
        { x: 540, y: 630 },
        { x: 540, y: 470 },
        { x: 180, y: 470 },
      ],
      [
        { x: 1120, y: 130 },
        { x: 1120, y: 430 },
        { x: 1010, y: 430 },
        { x: 1010, y: 130 },
      ],
      [
        { x: 150, y: 420 },
        { x: 270, y: 420 },
        { x: 270, y: 560 },
        { x: 150, y: 560 },
      ],
    ],
  },
];

/** Does the segment a→b cross the rect (touching an edge counts as blocked)? */
function segmentHitsRect(ax, ay, bx, by, rect) {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (ax < rect.x || ax > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - ax) / dx;
    let t2 = (rect.x + rect.w - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (ay < rect.y || ay > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - ay) / dy;
    let t2 = (rect.y + rect.h - ay) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

export function lineOfSightBlocked(ax, ay, bx, by, solids) {
  for (const rect of solids) {
    if (segmentHitsRect(ax, ay, bx, by, rect)) return true;
  }
  return false;
}

/** Push a circle out of every solid rect it overlaps; returns the corrected centre. */
function resolveCircle(x, y, radius, solids) {
  for (const rect of solids) {
    const nearX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    const dx = x - nearX;
    const dy = y - nearY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    if (distSq > 1e-9) {
      const dist = Math.sqrt(distSq);
      x = nearX + (dx / dist) * radius;
      y = nearY + (dy / dist) * radius;
    } else {
      // Centre is inside the rect: leave by the shallowest side.
      const left = x - rect.x;
      const right = rect.x + rect.w - x;
      const top = y - rect.y;
      const bottom = rect.y + rect.h - y;
      const shallowest = Math.min(left, right, top, bottom);
      if (shallowest === left) x = rect.x - radius;
      else if (shallowest === right) x = rect.x + rect.w + radius;
      else if (shallowest === top) y = rect.y - radius;
      else y = rect.y + rect.h + radius;
    }
  }
  return { x, y };
}

function createGuard(path) {
  return {
    path,
    x: path[0].x,
    y: path[0].y,
    target: 1,
    facing: Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x),
    pauseLeft: 0,
    pauseElapsed: 0,
    seesPlayer: false,
  };
}

function stepGuard(guard, dt) {
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.pauseElapsed += dt;
    const next = guard.path[guard.target];
    const base = Math.atan2(next.y - guard.y, next.x - guard.x);
    guard.facing = base + Math.sin(guard.pauseElapsed * GUARD.turnRate) * 0.9;
    return;
  }
  const next = guard.path[guard.target];
  const dx = next.x - guard.x;
  const dy = next.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const step = GUARD.speed * dt;
  if (dist <= step) {
    guard.x = next.x;
    guard.y = next.y;
    guard.target = (guard.target + 1) % guard.path.length;
    guard.pauseLeft = GUARD.pauseSeconds;
    guard.pauseElapsed = 0;
  } else {
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
    guard.facing = Math.atan2(dy, dx);
  }
}

/** Can this guard see the player right now: in range, inside the cone, no wall between? */
export function guardSeesPlayer(level, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange) return false;
  let angle = Math.atan2(dy, dx) - guard.facing;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  if (Math.abs(angle) > GUARD.viewHalfAngle) return false;
  return !lineOfSightBlocked(guard.x, guard.y, player.x, player.y, level.solids);
}

export function createWorld(levelIndex) {
  const level = LEVELS[levelIndex];
  return {
    levelIndex,
    level,
    time: 0,
    player: { x: level.playerStart.x, y: level.playerStart.y },
    guards: level.guardPaths.map(createGuard),
    suspicion: 0,
    hasGem: false,
    anySees: false,
  };
}

/**
 * Advance the world one fixed step. input is {x, y, crouch} with x/y in -1..1.
 * Returns an EVENT_* bitmask for what happened during the step.
 */
export function stepWorld(world, input, dt) {
  let events = 0;
  world.time += dt;
  const level = world.level;

  for (const guard of world.guards) stepGuard(guard, dt);

  const speed = input.crouch ? PLAYER.crouchSpeed : PLAYER.speed;
  let px = world.player.x + input.x * speed * dt;
  let py = world.player.y + input.y * speed * dt;
  const resolved = resolveCircle(px, py, PLAYER.radius, level.solids);
  world.player.x = resolved.x;
  world.player.y = resolved.y;

  world.anySees = false;
  for (const guard of world.guards) {
    guard.seesPlayer = guardSeesPlayer(level, guard, world.player);
    if (guard.seesPlayer) world.anySees = true;
  }
  if (world.anySees) {
    const crouchFactor = input.crouch ? 0.5 : 1;
    world.suspicion += (dt / GUARD.spotSeconds) * crouchFactor;
  } else {
    world.suspicion -= dt / GUARD.calmSeconds;
  }
  world.suspicion = Math.max(0, Math.min(1, world.suspicion));
  if (world.suspicion >= 1) events |= EVENT_CAUGHT;

  if (!world.hasGem) {
    const gemDist = Math.hypot(world.player.x - level.gem.x, world.player.y - level.gem.y);
    if (gemDist < PLAYER.radius + level.gem.r) {
      world.hasGem = true;
      events |= EVENT_GEM;
    }
  } else {
    const exit = level.exit;
    const inside =
      world.player.x > exit.x && world.player.x < exit.x + exit.w &&
      world.player.y > exit.y && world.player.y < exit.y + exit.h;
    if (inside) events |= EVENT_LEVEL_CLEAR;
  }
  return events;
}
