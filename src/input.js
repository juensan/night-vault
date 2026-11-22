// Keyboard input for Night Vault. Held keys give a movement vector and a crouch flag;
// one-shot presses (confirm, pause, restart) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);

export function createInput(window) {
  const held = new Set();
  let queued = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (CONFIRM.has(event.code)) queued |= ACTION_CONFIRM;
    if (PAUSE.has(event.code)) queued |= ACTION_PAUSE;
    if (RESTART.has(event.code)) queued |= ACTION_RESTART;
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  return {
    /** Movement intent as a unit-ish vector: x right, y down, each in -1..1. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) x -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) x += 1;
      if (held.has('ArrowUp') || held.has('KeyW')) y -= 1;
      if (held.has('ArrowDown') || held.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    crouching() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** Take (and clear) the one-shot presses queued since the last call. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
