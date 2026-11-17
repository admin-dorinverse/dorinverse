// Holds the living sky and shares it with every screen. It runs the sky's frame loop on the animation thread
// and offers simple actions: fly somewhere, handle touches, and switch between the Sky tab and the other tabs.

import { useFont } from '@shopify/react-native-skia';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { playSound, type SoundName } from '@/components/common/sounds';
import { sampleConstellations } from '@/data/sample/constellations';
import { constellationLabelSize, skyLabelFont } from '@/theme/text';
import type { Constellation } from '@/types/constellation';
import { runSkyFrame, setSkyAtHome, setSkyScreen } from './runSkyFrame';
import { createSkyState, type SkyState } from './skyState';
import { handleSkyTap } from './skyTap';
import { beginDrag, endDrag, moveDrag, startFlight } from './stepCamera';

/** Where a sky flight or tap leads: the bakery, or a constellation by its id. */
export type SkyDestination = { kind: 'bakery' } | { kind: 'constellation'; id: string };

/** What the sky shares with screens. */
type SkyContextValue = {
  /** The sky's memory, changed in place on the animation thread. */
  sky: SharedValue<SkyState>;
  /** The time of the latest frame. Drawings re-draw when it changes. */
  clock: SharedValue<number>;
  /** The constellations in the sky. */
  constellations: readonly Constellation[];
  /** Width of each constellation's name, used to keep the rocket off it. */
  labelWidths: readonly number[];
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
  return d.kind === 'bakery' ? 'bakery' : `constellation:${d.id}`;
}

/** Turns a tag back into a destination. */
function fromTag(tag: string): SkyDestination {
  return tag === 'bakery' ? { kind: 'bakery' } : { kind: 'constellation', id: tag.slice('constellation:'.length) };
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
  const reduceMotion = useReducedMotion();
  const font = useFont(skyLabelFont, constellationLabelSize);
  const labelWidths = useMemo(() => constellations.map((c) => (font ? font.measureText(c.name).width : 120)), [constellations, font]);
  const sharedLabelWidths = useSharedValue<number[]>(labelWidths);
  const arrivalHandler = useRef<(d: SkyDestination) => void>(() => {});

  useEffect(() => sharedLabelWidths.set(labelWidths), [sharedLabelWidths, labelWidths]);
  useEffect(() => {
    scheduleOnUI((w: number, h: number, calm: boolean) => {
      'worklet';
      setSkyScreen(sky.get(), w, h, calm);
    }, width, height, reduceMotion);
  }, [sky, width, height, reduceMotion]);

  /** Runs on the JavaScript thread when a flight or tap arrives somewhere, to open its page. */
  const arrive = useCallback((tag: string) => arrivalHandler.current(fromTag(tag)), []);

  useFrameCallback((frame) => {
    'worklet';
    const arrivedAt = runSkyFrame(sky.get(), frame.timestamp, constellations, sharedLabelWidths.get());
    clock.set(frame.timestamp);
    if (arrivedAt) scheduleOnRN(arrive, arrivedAt);
  });

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
        const openNow = handleSkyTap(s, x, y, constellations);
        if (openNow) {
          scheduleOnRN(sound, 'tap');
          scheduleOnRN(arrive, openNow);
        } else if (!wasFlying && s.flight.on) {
          scheduleOnRN(sound, 'tap');
          scheduleOnRN(sound, 'route');
        }
      },
    }),
    [sky, constellations, arrive],
  );

  const value = useMemo<SkyContextValue>(
    () => ({
      sky,
      clock,
      constellations,
      labelWidths,
      flyTo,
      setAtHome,
      setArrivalHandler: (handler) => {
        arrivalHandler.current = handler;
      },
      touch,
    }),
    [sky, clock, constellations, labelWidths, flyTo, setAtHome, touch],
  );

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}
