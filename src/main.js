// Boot and the one loop for Night Vault: input is read every frame, the world advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play, paused,
// caught and win.
//
// ?shot=start|play|end (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createWorld, EVENT_CAUGHT, EVENT_LEVEL_CLEAR, LEVELS, stepWorld } from './world.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const input = createInput(window);
const renderer = createRenderer(canvas);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot);
  renderer.draw(staged.screen, staged.world, 0);
  renderer.draw(staged.screen, staged.world, 0);
  window.__shotReady = true;
} else {
  let screen = SCREEN_TITLE;
  let levelIndex = 0;
  let world = createWorld(0);
  let alarms = 0;
  let accumulator = 0;
  let lastTime = performance.now();

  function startLevel(index) {
    levelIndex = index;
    world = createWorld(index);
    screen = SCREEN_PLAY;
    status.textContent = `${LEVELS[index].name}. ${LEVELS[index].briefing}`;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - lastTime) / 1000;
    lastTime = now;
    if (elapsed > 0.25) elapsed = 0.25;
    const actions = input.takeActions();

    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startLevel(0);
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const move = input.moveVector();
          const events = stepWorld(world, { x: move.x, y: move.y, crouch: input.crouching() }, STEP);
          if (events & EVENT_CAUGHT) {
            alarms += 1;
            screen = SCREEN_CAUGHT;
            status.textContent = 'Spotted! The alarm is raised.';
            break;
          }
          if (events & EVENT_LEVEL_CLEAR) {
            if (levelIndex + 1 < LEVELS.length) startLevel(levelIndex + 1);
            else screen = SCREEN_WIN;
            break;
          }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_PAUSE) screen = SCREEN_PLAY;
    } else if (screen === SCREEN_CAUGHT) {
      if (actions & (ACTION_RESTART | ACTION_CONFIRM)) startLevel(levelIndex);
    } else if (screen === SCREEN_WIN) {
      if (actions & ACTION_CONFIRM) startLevel(0);
    }
    renderer.draw(screen, world, alarms);
  }
  requestAnimationFrame(frame);
}
