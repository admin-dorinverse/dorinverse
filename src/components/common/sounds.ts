// Plays the app's little sound effects. The sounds are made once by scripts/app/render-sounds.mjs.
// They respect the phone's silent switch, mix with the person's own music, and can be muted.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/** The sound files, by name. */
const SOURCES = {
  tap: require('../../../assets/sounds/tap.m4a'),
  next: require('../../../assets/sounds/next.m4a'),
  right: require('../../../assets/sounds/right.m4a'),
  wrong: require('../../../assets/sounds/wrong.m4a'),
  word: require('../../../assets/sounds/word.m4a'),
  collect: require('../../../assets/sounds/collect.m4a'),
  burn: require('../../../assets/sounds/burn.m4a'),
  join: require('../../../assets/sounds/join.m4a'),
  box: require('../../../assets/sounds/box.m4a'),
  route: require('../../../assets/sounds/route.m4a'),
  reveal: require('../../../assets/sounds/reveal.m4a'),
  ding: require('../../../assets/sounds/ding.m4a'),
  splash: require('../../../assets/sounds/splash.m4a'),
} as const;

/** A sound effect's name. */
export type SoundName = keyof typeof SOURCES;

/** Players made so far, so each sound file is loaded only once. */
const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** True when sounds are turned off. */
let muted = false;

/** True while something needs quiet, like a recording. Separate from the person's own mute. */
let hushed = false;

/** True once the audio mode has been set. */
let ready = false;

/** Turns all sound effects off or back on. */
export function setSoundsMuted(value: boolean): void {
  muted = value;
}

/**
 * Hushes all of the app's own sounds while a recording runs, then lets them play again. Any app music added later
 * must check `soundsHushed()` and pause too.
 */
export function hushSounds(value: boolean): void {
  hushed = value;
}

/** True while the app's sounds are hushed for a recording. */
export function soundsHushed(): boolean {
  return hushed;
}

/** The player for a sound, made (and its file loaded) the first time it's needed, with the audio mode set once. */
function playerFor(name: SoundName): AudioPlayer {
  if (!ready) {
    ready = true;
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
  }
  return player;
}

/**
 * Loads a sound now, before it's first played, so the first play isn't lost while the file loads (on Android a
 * sound played the instant its player is made can stay silent). Call it when a page that needs the sound opens.
 */
export function preloadSound(name: SoundName): void {
  playerFor(name);
}

/** Plays a sound effect from the start. Does nothing when muted or hushed. */
export function playSound(name: SoundName): void {
  if (muted || hushed) return;
  const player = playerFor(name);
  player.seekTo(0).catch(() => {});
  player.play();
}
