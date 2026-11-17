// Plays the app's little sound effects. The sounds are made once by scripts/app/render-sounds.mjs.
// They respect the phone's silent switch, mix with the person's own music, and can be muted.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/** The sound files, by name. */
const SOURCES = {
  tap: require('../../../assets/sounds/tap.wav'),
  next: require('../../../assets/sounds/next.wav'),
  right: require('../../../assets/sounds/right.wav'),
  wrong: require('../../../assets/sounds/wrong.wav'),
  word: require('../../../assets/sounds/word.wav'),
  collect: require('../../../assets/sounds/collect.wav'),
  burn: require('../../../assets/sounds/burn.wav'),
  join: require('../../../assets/sounds/join.wav'),
  box: require('../../../assets/sounds/box.wav'),
  route: require('../../../assets/sounds/route.wav'),
  reveal: require('../../../assets/sounds/reveal.wav'),
  ding: require('../../../assets/sounds/ding.wav'),
  splash: require('../../../assets/sounds/splash.wav'),
} as const;

/** A sound effect's name. */
export type SoundName = keyof typeof SOURCES;

/** Players made so far, so each sound file is loaded only once. */
const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** True when sounds are turned off. */
let muted = false;

/** True once the audio mode has been set. */
let ready = false;

/** Turns all sound effects off or back on. */
export function setSoundsMuted(value: boolean): void {
  muted = value;
}

/** Plays a sound effect from the start. Does nothing when muted. */
export function playSound(name: SoundName): void {
  if (muted) return;
  if (!ready) {
    ready = true;
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
  }
  player.seekTo(0).catch(() => {});
  player.play();
}
