// Drawing only for Night Vault: the world and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled with
// the backdrop colour. Vision cones are drawn honestly — each cone is a fan of rays
// that stop at the first wall or crate, so what the player sees is what the guard sees.

import { FIELD, FONT, GUARD, PALETTE, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

/** Distance from (x, y) along the unit direction to the nearest solid edge, or maxDist. */
function rayDistance(x, y, dirX, dirY, solids, maxDist) {
  let best = maxDist;
  for (const rect of solids) {
    let tMin = 0;
    let tMax = best;
    if (Math.abs(dirX) < 1e-9) {
      if (x < rect.x || x > rect.x + rect.w) continue;
    } else {
      let t1 = (rect.x - x) / dirX;
      let t2 = (rect.x + rect.w - x) / dirX;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }
    if (Math.abs(dirY) < 1e-9) {
      if (y < rect.y || y > rect.y + rect.h) continue;
    } else {
      let t1 = (rect.y - y) / dirY;
      let t2 = (rect.y + rect.h - y) / dirY;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) continue;
    }
    if (tMin < best) best = tMin;
  }
  return best;
}

function drawCone(ctx, level, guard, suspicion) {
  const rays = 26;
  const colour =
    suspicion > 0.66 ? PALETTE.coneAlarm : suspicion > 0.25 ? PALETTE.coneWary : PALETTE.coneCalm;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i++) {
    const angle = guard.facing - GUARD.viewHalfAngle + (2 * GUARD.viewHalfAngle * i) / rays;
    const dist = rayDistance(guard.x, guard.y, Math.cos(angle), Math.sin(angle), level.solids, GUARD.viewRange);
    ctx.lineTo(guard.x + Math.cos(angle) * dist, guard.y + Math.sin(angle) * dist);
  }
  ctx.closePath();
  ctx.fill();
}

function drawWorld(ctx, world) {
  const level = world.level;
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.strokeStyle = PALETTE.floorGrid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= FIELD.width; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
  }
  for (let y = 0; y <= FIELD.height; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
  }
  ctx.stroke();

  // Exit pad.
  ctx.fillStyle = world.hasGem ? PALETTE.exit : PALETTE.exitDark;
  ctx.fillRect(level.exit.x, level.exit.y, level.exit.w, level.exit.h);
  ctx.fillStyle = PALETTE.text;
  ctx.font = FONT.small;
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', level.exit.x + level.exit.w / 2, level.exit.y + level.exit.h / 2 + 5);

  // Walls and cover.
  for (const rect of level.solids) {
    ctx.fillStyle = rect.kind === 'crate' ? PALETTE.crate : PALETTE.wall;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = rect.kind === 'crate' ? PALETTE.crateTop : PALETTE.wallTop;
    ctx.fillRect(rect.x, rect.y, rect.w, 5);
  }

  // The gem, while it is still in the vault.
  if (!world.hasGem) {
    ctx.save();
    ctx.translate(level.gem.x, level.gem.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.gem;
    const s = level.gem.r * 0.95;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }

  for (const guard of world.guards) drawCone(ctx, level, guard, world.suspicion);

  // Guards: body, facing tick, and a "!" when they can see the player.
  for (const guard of world.guards) {
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.text;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * (GUARD.radius + 6), guard.y + Math.sin(guard.facing) * (GUARD.radius + 6));
    ctx.stroke();
    if (guard.seesPlayer) {
      ctx.fillStyle = PALETTE.alarm;
      ctx.font = FONT.head;
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - GUARD.radius - 10);
    }
  }

  // The thief.
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.arc(world.player.x, world.player.y, PLAYER.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(world.player.x, world.player.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  if (world.hasGem) {
    ctx.fillStyle = PALETTE.gem;
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y - PLAYER.radius - 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, world, alarms) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 52);
  ctx.fillStyle = PALETTE.text;
  ctx.font = FONT.hud;
  ctx.textAlign = 'left';
  ctx.fillText(world.level.name, 18, 34);
  ctx.textAlign = 'center';
  ctx.fillText(world.hasGem ? 'Gem stolen — get to the EXIT!' : 'Steal the ◆ gem, then reach the EXIT', FIELD.width / 2, 34);
  ctx.textAlign = 'right';
  const eye = world.suspicion > 0.02 ? `👁 ${Math.round(world.suspicion * 100)}%` : '👁 —';
  ctx.fillStyle = world.anySees ? PALETTE.alarm : PALETTE.text;
  ctx.fillText(`${eye}   Alarms: ${alarms}`, FIELD.width - 18, 34);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = FONT.small;
  ctx.textAlign = 'center';
  ctx.fillText('Move: WASD / arrows · Crouch: Shift (harder to spot) · Pause: P', FIELD.width / 2, FIELD.height - 10);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = FONT.title;
  ctx.fillText(title, FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = FONT.body;
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 330 + i * 34));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    draw(screen, world, alarms) {
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      if (world) {
        drawWorld(ctx, world);
        drawHud(ctx, world, alarms);
      }
      if (screen === SCREEN_TITLE) {
        panel(ctx, 'NIGHT VAULT', [
          'A top-down stealth job. Guards patrol with vision cones —',
          'walls and crates block their sight, so use the cover.',
          '',
          'Steal the ◆ gem, then reach the EXIT unseen.',
          'Crouch (Shift) to be spotted half as fast.',
          '',
          'Press Enter to start',
        ], PALETTE.gem);
      } else if (screen === SCREEN_PAUSED) {
        panel(ctx, 'PAUSED', ['Press P or Esc to resume'], PALETTE.text);
      } else if (screen === SCREEN_CAUGHT) {
        panel(ctx, 'SPOTTED!', ['The alarm is raised. Press R to try the floor again.'], PALETTE.alarm);
      } else if (screen === SCREEN_WIN) {
        panel(ctx, 'CLEAN GETAWAY', [
          'Both floors cleared, gem in hand, never caught.',
          '',
          'Press Enter to play again',
        ], PALETTE.exit);
      }
      ctx.restore();
    },
  };
}
