// Holds the living sky and shares it with every screen. It runs the sky's frame loop on the animation thread
// and offers simple actions: fly somewhere, handle touches, and switch between the Sky tab and the other tabs.

import { useFont } from '@shopify/react-native-skia';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppState, useWindowDimensions } from 'react-native';
import { useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { playSound, type SoundName } from '@/components/common/sounds';
import { sampleConstellations } from '@/data/sample/constellations';
import { constellationLabelSize, skyLabelFont } from '@/theme/text';
import type { CollectionKind } from '@/types/collection';
import type { Constellation } from '@/types/constellation';
import type { CardBox } from './collectionsZone';
import { runSkyFrame, setSkyAtHome, setSkyScreen, skyIsBusy } from './runSkyFrame';
import { createSkyState, type SkyState } from './skyState';
import { handleSkyTap } from './skyTap';
import { beginDrag, endDrag, moveDrag, startFlight } from './stepCamera';
import { useSkyArt, type SkyArt } from './useSkyArt';

/** Time between star-sky redraws while it moves fast, and between moves of the planet and rocket (60 a second). */
const BUSY_FRAME_MS = 1000 / 60;

/** Time between star-sky redraws while only slow things move (20 a second). Twinkles are slow; this is plenty. */
const CALM_FRAME_MS = 1000 / 20;

/** Time between star-sky redraws on the other tabs, where the stars show dimly behind the page (10 a second). */
const AWAY_FRAME_MS = 1000 / 10;

/** Leeway so a screen refresh that comes a hair early still counts. */
const FRAME_SLACK_MS = 4;

/** Where a sky flight or tap leads: the bakery, a constellation by its id, or one collection's list. */
export type SkyDestination = { kind: 'bakery' } | { kind: 'constellation'; id: string } | { kind: 'collection'; list: CollectionKind };

/** What the sky shares with screens. */
type SkyContextValue = {
  /** The sky's memory, changed in place on the animation thread. */
  sky: SharedValue<SkyState>;
  /** The time of the star sky's latest drawn frame. The star canvas redraws when it changes, 10 to 60 times a second. */
  clock: SharedValue<number>;
  /** The time of the latest frame, up to 60 a second. The planet, rocket and flame views move when it changes. */
  pulse: SharedValue<number>;
  /** The sky's ready-made pictures. */
  art: SkyArt;
  /** The constellations in the sky. */
  constellations: readonly Constellation[];
  /** Width of each constellation's name, used to keep the rocket off it. */
  labelWidths: readonly number[];
  /** Each collection card's box in the sky, measured once it shows. Used to tell which card a tap lands on. */
  collectionBoxes: SharedValue<CardBox[]>;
  /** Flies the camera to a sky spot, then opens `destination` if one is given. */
  flyTo: (x: number, y: number, destination?: SkyDestination) => void;
  /** Tells the sky whether the Sky tab is showing. Other tabs show only the stars. */
  setAtHome: (atHome: boolean) => void;
  /** Sets what happens when the camera arrives somewhere (opening a page). */
  setArrivalHandler: (handler: (destination: SkyDestination) => void) => void;
  /** Finger handlers for the sky's touch layer. They run on the animation thread. */
  touch: {
    begin: (x: number, y: number) => void;
    move: (dx: number, dy: number) => void;
    end: (x: number, y: number) => void;
  };
};

const SkyContext = createContext<SkyContextValue | null>(null);

/** Gives screens access to the shared sky. Must be used inside `SkyProvider`. */
export function useSky(): SkyContextValue {
  const value = useContext(SkyContext);
  if (!value) throw new Error('useSky must be used inside SkyProvider');
  return value;
}

/** Turns a destination into the short tag the animation thread passes around. */
function toTag(d: SkyDestination): string {
  if (d.kind === 'bakery') return 'bakery';
  return d.kind === 'constellation' ? `constellation:${d.id}` : `collection:${d.list}`;
}

/** Turns a tag back into a destination. */
function fromTag(tag: string): SkyDestination {
  if (tag === 'bakery') return { kind: 'bakery' };
  const rest = tag.slice(tag.indexOf(':') + 1);
  return tag.startsWith('collection:') ? { kind: 'collection', list: rest as CollectionKind } : { kind: 'constellation', id: rest };
}

/** Plays a sound from the animation thread. */
function sound(name: SoundName): void {
  playSound(name);
}

/** Props for the sky provider. */
type SkyProviderProps = {
  /** The screens that share the sky. */
  children: ReactNode;
};

/** Creates the sky, runs its frame loop and shares it with the screens inside. */
export function SkyProvider({ children }: SkyProviderProps) {
  const { width, height } = useWindowDimensions();
  const constellations = sampleConstellations;
  const sky = useSharedValue<SkyState>(createSkyState(width, height, constellations.length));
  const clock = useSharedValue(0);
  const pulse = useSharedValue(0);
  const pulseResting = useSharedValue(false);
  const reduceMotion = useReducedMotion();
  const font = useFont(skyLabelFont, constellationLabelSize);
  const labelWidths = useMemo(() => constellations.map((c) => (font ? font.measureText(c.name).width : 120)), [constellations, font]);
  const sharedLabelWidths = useSharedValue<number[]>(labelWidths);
  const art = useSkyArt(constellations, font);
  const arrivalHandler = useRef<(d: SkyDestination) => void>(() => {});
  const collectionBoxes = useSharedValue<CardBox[]>([]);

  useEffect(() => sharedLabelWidths.set(labelWidths), [sharedLabelWidths, labelWidths]);
  useEffect(() => {
    scheduleOnUI((w: number, h: number, calm: boolean) => {
      'worklet';
      setSkyScreen(sky.get(), w, h, calm);
    }, width, height, reduceMotion);
  }, [sky, width, height, reduceMotion]);

  /** Runs on the JavaScript thread when a flight or tap arrives somewhere, to open its page. */
  const arrive = useCallback((tag: string) => arrivalHandler.current(fromTag(tag)), []);

  // The sky moves forward every screen refresh. The planet and rocket views follow up to 60 times a second.
  // The star canvas redraws 60 times a second only while something moves fast, 20 while it rests, and 10 on the
  // other tabs. Phones that refresh 120 times a second would otherwise draw twice as much for nothing.
  const frames = useFrameCallback((frame) => {
    'worklet';
    const s = sky.get();
    const now = frame.timestamp;
    const arrivedAt = runSkyFrame(s, now, constellations, sharedLabelWidths.get());
    const away = !s.atHome && s.worldShown === 0;
    // On other tabs the planet, rocket and Sky page are hidden, so the views that follow the pulse rest.
    // One last pulse goes out as the fade ends, so they finish fully hidden.
    if (away ? !pulseResting.get() : now - pulse.get() >= BUSY_FRAME_MS - FRAME_SLACK_MS) pulse.set(now);
    if (pulseResting.get() !== away) pulseResting.set(away);
    const gap = away ? AWAY_FRAME_MS : skyIsBusy(s) ? BUSY_FRAME_MS : CALM_FRAME_MS;
    if (now - clock.get() >= gap - FRAME_SLACK_MS) clock.set(now);
    if (arrivedAt) scheduleOnRN(arrive, arrivedAt);
  });

  // The sky stops completely while the app is in the background, and picks up where it left off on return.
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => frames.setActive(state === 'active'));
    return () => listener.remove();
  }, [frames]);

  const flyTo = useCallback(
    (x: number, y: number, destination?: SkyDestination) => {
      const tag = destination ? toTag(destination) : '';
      scheduleOnUI((tx: number, ty: number, t: string) => {
        'worklet';
        const s = sky.get();
        startFlight(s, tx, ty, t, s.lastFrameAt);
      }, x, y, tag);
    },
    [sky],
  );

  const setAtHome = useCallback(
    (atHome: boolean) => {
      scheduleOnUI((home: boolean) => {
        'worklet';
        setSkyAtHome(sky.get(), home);
      }, atHome);
    },
    [sky],
  );

  const touch = useMemo(
    () => ({
      begin: (x: number, y: number) => {
        'worklet';
        const s = sky.get();
        if (s.atHome) beginDrag(s, x, y, s.lastFrameAt);
      },
      move: (dx: number, dy: number) => {
        'worklet';
        const s = sky.get();
        if (s.drag.on) moveDrag(s, dx, dy, s.lastFrameAt);
      },
      end: (x: number, y: number) => {
        'worklet';
        const s = sky.get();
        if (!endDrag(s, x, y, s.lastFrameAt)) return;
        const wasFlying = s.flight.on;
        const openNow = handleSkyTap(s, x, y, constellations, collectionBoxes.get());
        if (openNow) {
          scheduleOnRN(sound, 'tap');
          scheduleOnRN(arrive, openNow);
        } else if (!wasFlying && s.flight.on) {
          scheduleOnRN(sound, 'tap');
          scheduleOnRN(sound, 'route');
        }
      },
    }),
    [sky, constellations, collectionBoxes, arrive],
  );

  const setArrivalHandler = useCallback((handler: (destination: SkyDestination) => void) => {
    arrivalHandler.current = handler;
  }, []);

  const value = useMemo<SkyContextValue | null>(
    () => art && { sky, clock, pulse, art, constellations, labelWidths, collectionBoxes, flyTo, setAtHome, setArrivalHandler, touch },
    [sky, clock, pulse, art, constellations, labelWidths, collectionBoxes, flyTo, setAtHome, setArrivalHandler, touch],
  );

  // Nothing shows until the sky's pictures are ready, so the planet never pops in late.
  if (!art) return null;
  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}
