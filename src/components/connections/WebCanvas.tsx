// The Character Connections web you can drag, pinch and tap, as in the owner's artifact. The web is drawn once into
// a picture (drawWeb.ts); a finger only moves and scales that picture, so it stays smooth on a cheap phone. Taps
// open a person or a link. The +, − and "show everything" buttons sit at the bottom right.

import { Canvas, Group, Picture, Skia, createPicture, useFont } from '@shopify/react-native-skia';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { webPage } from '@/theme/characterWebColors';
import { fontFiles } from '@/theme/text';
import { drawWeb, WEB_FONT_SIZE } from './drawWeb';
import { webBounds, webHit, type Web, type WebLink, type WebNode } from './webModel';

/** The closest and farthest the web can zoom. */
const MAX_ZOOM = 3;
const MIN_ZOOM = 0.02;

/** How long a button zoom takes (ms). */
const ZOOM_MS = 260;

/** Room around the web when it is fitted to the screen. */
const FIT_PAD = 24;

/** Props for the web view. */
type WebCanvasProps = {
  /** The web to show. */
  web: Web;
  /** Opens a person. */
  onPerson: (node: WebNode) => void;
  /** Opens a link. */
  onLink: (link: WebLink) => void;
};

/** What the page can ask of the web view. */
export type WebCanvasControls = {
  /** Zooms in (more than 1) or out (less than 1) around the middle of the screen. */
  zoom: (factor: number) => void;
  /** Shows the whole web. */
  fit: () => void;
  /** Moves the view to center a person, zoomed in to read them. */
  focus: (node: WebNode) => void;
};

/** The draggable web. */
export const WebCanvas = forwardRef<WebCanvasControls, WebCanvasProps>(function WebCanvas({ web, onPerson, onLink }, ref) {
  const bold = useFont(fontFiles.Nunito_800ExtraBold, WEB_FONT_SIZE);
  const regular = useFont(fontFiles.Nunito_600SemiBold, WEB_FONT_SIZE);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // The view: where the web's (0, 0) sits on screen, and the zoom.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const k = useSharedValue(1);

  // Drawn once each time the web changes (the collection or the filter), never while moving.
  const picture = useMemo(() => {
    if (!bold || !regular) return null;
    const b = webBounds(web.nodes);
    return createPicture((canvas) => drawWeb(canvas, web, bold, regular), Skia.XYWHRect(b.x0 - 40, b.y0 - 40, b.x1 - b.x0 + 80, b.y1 - b.y0 + 80));
  }, [web, bold, regular]);
  const transform = useDerivedValue(() => [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: k.get() }]);

  /** The view that fits the whole web on screen. */
  const fitView = () => {
    const b = webBounds(web.nodes);
    const scale = Math.min((size.w - FIT_PAD * 2) / (b.x1 - b.x0), (size.h - FIT_PAD * 2) / (b.y1 - b.y0), 1.2);
    return { k: scale, x: size.w / 2 - (scale * (b.x0 + b.x1)) / 2, y: size.h / 2 - (scale * (b.y0 + b.y1)) / 2 };
  };
  /** Glides the view to a spot and zoom. */
  const glideTo = (v: { k: number; x: number; y: number }) => {
    k.set(withTiming(v.k, { duration: ZOOM_MS }));
    tx.set(withTiming(v.x, { duration: ZOOM_MS }));
    ty.set(withTiming(v.y, { duration: ZOOM_MS }));
  };

  useImperativeHandle(ref, () => ({
    zoom: (factor) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k.get() * factor));
      const f = next / k.get();
      glideTo({ k: next, x: size.w / 2 - (size.w / 2 - tx.get()) * f, y: size.h / 2 - (size.h / 2 - ty.get()) * f });
    },
    fit: () => glideTo(fitView()),
    focus: (n) => glideTo({ k: 1.2, x: size.w / 2 - n.x * 1.2, y: size.h / 2 - n.y * 1.2 }),
  }));

  /** Sets the first view once the web's size is known. */
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w === size.w && h === size.h) return;
    const first = size.w === 0;
    setSize({ w, h });
    if (first) {
      const b = webBounds(web.nodes);
      const scale = Math.min((w - FIT_PAD * 2) / (b.x1 - b.x0), (h - FIT_PAD * 2) / (b.y1 - b.y0), 1.2);
      k.set(scale);
      tx.set(w / 2 - (scale * (b.x0 + b.x1)) / 2);
      ty.set(h / 2 - (scale * (b.y0 + b.y1)) / 2);
    }
  };

  /** Works out what a tap at a screen spot landed on, and opens it. */
  const tapAt = (sx: number, sy: number, zoom: number, x0: number, y0: number) => {
    const hit = webHit(web, (sx - x0) / zoom, (sy - y0) / zoom, 16 / zoom);
    if (hit && 'node' in hit) onPerson(hit.node);
    else if (hit) onLink(hit.link);
  };

  const pan = usePanGesture({
    maxPointers: 1,
    onUpdate: (e) => {
      'worklet';
      tx.set(tx.get() + e.changeX);
      ty.set(ty.get() + e.changeY);
    },
    onDeactivate: (e) => {
      'worklet';
      // A flick keeps the web gliding for a moment, as in the artifact.
      tx.set(withDecay({ velocity: e.velocityX }));
      ty.set(withDecay({ velocity: e.velocityY }));
    },
  });
  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k.get() * e.scaleChange));
      const f = next / k.get();
      tx.set(e.focalX - (e.focalX - tx.get()) * f);
      ty.set(e.focalY - (e.focalY - ty.get()) * f);
      k.set(next);
    },
  });
  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      scheduleOnRN(tapAt, e.x, e.y, k.get(), tx.get(), ty.get());
    },
  });
  const gestures = useSimultaneousGestures(pan, pinch, tap);

  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.stage} onLayout={onLayout} accessibilityLabel="Web of Bible characters and how they are connected">
        <Canvas style={StyleSheet.absoluteFill}>
          {picture && (
            <Group transform={transform}>
              <Picture picture={picture} />
            </Group>
          )}
        </Canvas>
      </View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: webPage.background },
});
