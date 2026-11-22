// The screenshot scenes behind ?shot=start|play|end (with &seed=N, kept for parity with
// the kit's shots.json). Each scene is the real game: the play scene runs the actual
// rules forward from a fresh world for a fixed number of fixed steps, steered by a
// simple scripted route, so the frame is what a short run really looks like and the
// same scene always paints the same frame.

import { STEP } from './config.js';
import { createWorld, stepWorld } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

// A short route across Floor 1: east along the bottom, north past the crates, east again.
const ROUTE = [
  { seconds: 1.1, input: { x: 1, y: 0, crouch: false } },
  { seconds: 1.4, input: { x: 0, y: -1, crouch: false } },
  { seconds: 1.2, input: { x: 1, y: 0, crouch: false } },
  { seconds: 0.8, input: { x: 0, y: 1, crouch: true } },
];

export function stageShot(which) {
  if (which === 'play') {
    const world = createWorld(0);
    for (const leg of ROUTE) {
      const steps = Math.round(leg.seconds / STEP);
      for (let i = 0; i < steps; i++) stepWorld(world, leg.input, STEP);
    }
    return { screen: SCREEN_PLAY, world };
  }
  if (which === 'end') {
    const world = createWorld(1);
    world.hasGem = true;
    return { screen: SCREEN_WIN, world };
  }
  return { screen: SCREEN_TITLE, world: createWorld(0) };
}
