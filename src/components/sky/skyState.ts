// Everything the sky remembers between frames: the camera, the rocket, the particles and the timers.
// It lives on the animation thread and is changed in place every frame.

import { HOME_Y } from './skyLayout';

/** Where the view is looking and how fast it is gliding. */
export type Camera = { x: number; y: number; vx: number; vy: number };

/** A smooth camera flight to a spot, started by a tap or a Star Map pin. */
export type Flight = {
  /** True while flying. */
  on: boolean;
  /** Start position. */
  fromX: number;
  fromY: number;
  /** End position. */
  toX: number;
  toY: number;
  /** When the flight started, in milliseconds. */
  startedAt: number;
  /** How long the flight takes, in milliseconds. */
  duration: number;
  /** What to open on arrival, or an empty string for nothing. */
  arrivalTag: string;
};

/** A finger dragging the sky. */
export type Drag = {
  /** True while a finger is down. */
  on: boolean;
  /** Where the finger started on screen. */
  startX: number;
  startY: number;
  /** When the finger went down, in milliseconds. */
  startedAt: number;
  /** Recent camera spots, used to work out the throw speed. */
  history: { t: number; x: number; y: number }[];
};

/** The rocket that follows the view. `bob` is its gentle up-and-down float while resting. */
export type Rocket = { x: number; y: number; vx: number; vy: number; rotation: number; speed: number; bob: number };

/** One glowing particle behind the rocket. */
export type TrailParticle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; radius: number; color: string };

/** One shooting star crossing the screen. */
export type ShootingStar = { x: number; y: number; vx: number; vy: number; life: number };

/** One cookie box puffing out of the bakery chimney. */
export type ChimneyBox = { startedAt: number; duration: number; dx: number; dy: number; spin: number; image: number };

/** The whole sky's memory. */
export type SkyState = {
  /** Screen width and height in points. */
  width: number;
  height: number;
  camera: Camera;
  flight: Flight;
  drag: Drag;
  rocket: Rocket;
  trail: TrailParticle[];
  shootingStars: ShootingStar[];
  /** When the next shooting star appears, in milliseconds. */
  nextShootingStar: number;
  chimneyBoxes: ChimneyBox[];
  /** When the next chimney box puffs out, in milliseconds. */
  nextChimneyBox: number;
  /** How far each constellation has drawn itself in (0 to 1). */
  drawnIn: number[];
  /** How visible each constellation's name is (0 to 1). */
  labelShown: number[];
  /** True on the Sky tab. False on other tabs, where only the stars show. */
  atHome: boolean;
  /** How visible the planet, rocket and other sky objects are (0 to 1). They fade on other tabs. */
  worldShown: number;
  /** Last time the sky moved, in milliseconds. The map button grows while it moves. */
  lastMovedAt: number;
  /** Time of the previous frame, in milliseconds. */
  lastFrameAt: number;
  /** Time since the last trail particle, in seconds. */
  trailTimer: number;
  /** True when the phone asks for less motion. */
  reduceMotion: boolean;
  /** When the sky started, in milliseconds. Star drift is measured from here. */
  startedAt: number;
};

/** Makes a fresh sky memory for a screen of the given size. */
export function createSkyState(width: number, height: number, constellationCount: number): SkyState {
  return {
    width,
    height,
    camera: { x: 0, y: HOME_Y, vx: 0, vy: 0 },
    flight: { on: false, fromX: 0, fromY: 0, toX: 0, toY: 0, startedAt: 0, duration: 0, arrivalTag: '' },
    drag: { on: false, startX: 0, startY: 0, startedAt: 0, history: [] },
    rocket: { x: 0, y: 200, vx: 0, vy: 0, rotation: 0, speed: 0, bob: 0 },
    trail: [],
    shootingStars: [],
    nextShootingStar: -1,
    chimneyBoxes: [],
    nextChimneyBox: -1,
    drawnIn: Array.from({ length: constellationCount }, () => 0),
    labelShown: Array.from({ length: constellationCount }, () => 0),
    atHome: true,
    worldShown: 1,
    lastMovedAt: -1e9,
    lastFrameAt: -1,
    trailTimer: 0,
    reduceMotion: false,
    startedAt: -1,
  };
}

/** How far below the view's center the rocket rides. */
export function rocketOffset(height: number): number {
  'worklet';
  return Math.min(200, height * 0.24);
}
