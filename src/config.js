// Every tuning number and colour of Night Vault in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  speed: 235, // px per second on foot
  crouchSpeed: 120, // holding Shift: slower, but half as quick to be recognised
};

export const GUARD = {
  radius: 15,
  speed: 98, // patrol pace, px per second
  pauseSeconds: 1.4, // stands and turns at each waypoint before walking on
  turnRate: 2.4, // radians per second while scanning at a waypoint
  viewRange: 215, // how far a guard can see, px
  viewHalfAngle: 0.58, // half the vision cone, radians (about 33 degrees)
  spotSeconds: 0.55, // standing fully seen this long raises the alarm
  calmSeconds: 2.2, // unseen this long, suspicion drains away
};

export const PALETTE = {
  backdrop: '#0b0e14',
  floor: '#1a2130',
  floorGrid: '#232c40',
  wall: '#3d4a68',
  wallTop: '#5a6c96',
  crate: '#7a5c33',
  crateTop: '#9c7743',
  player: '#37e0b0',
  playerDark: '#1d8f6e',
  guard: '#e5484d',
  guardDark: '#8f2b30',
  coneCalm: 'rgba(250, 204, 21, 0.20)',
  coneWary: 'rgba(249, 115, 22, 0.30)',
  coneAlarm: 'rgba(239, 68, 68, 0.38)',
  gem: '#ffd94d',
  exit: '#2fbf71',
  exitDark: '#177a45',
  text: '#e8edf7',
  textDim: '#93a1bd',
  panel: 'rgba(10, 13, 20, 0.82)',
  alarm: '#ff5252',
};

export const FONT = {
  title: '700 64px system-ui, sans-serif',
  head: '700 30px system-ui, sans-serif',
  body: '400 20px system-ui, sans-serif',
  small: '400 16px system-ui, sans-serif',
  hud: '600 19px system-ui, sans-serif',
};
