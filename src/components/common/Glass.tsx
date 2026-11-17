// Frosted glass surfaces that float over the sky, like the tabs, HUD pills, dock and map card.
// The glass is a fixed dark tint with the design's light edge and shadows. It does not blur the sky behind it:
// a live blur over a moving sky is one of the costliest things a phone can draw, and over the night sky a tint
// looks nearly the same.

import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { glass } from '@/theme/colors';

/** Props for the sky's backdrop. */
type GlassBackdropProps = {
  /** The content the glass floats over, usually the sky. */
  children: ReactNode;
  /** Everything that floats on top of the content. */
  overlay: ReactNode;
};

/** Holds the sky and everything that floats over it. */
export function GlassBackdrop({ children, overlay }: GlassBackdropProps) {
  return (
    <>
      <View style={StyleSheet.absoluteFill}>{children}</View>
      {overlay}
    </>
  );
}

/** The two looks of glass in the design. */
type GlassLook = 'plain' | 'pill';

/** The design's shading for each look: edge and shadows on the surface, and a light fill laid over the tint. */
const LOOKS: Record<GlassLook, { edge: ViewStyle; fill: ViewStyle }> = {
  plain: {
    edge: {
      borderWidth: 1,
      borderColor: glass.border,
      boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
    },
    fill: { backgroundColor: glass.fill },
  },
  pill: {
    edge: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      borderTopColor: glass.borderTop,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 0 rgba(0,0,0,0.25), 0 10px 18px -8px rgba(0,0,0,0.6)',
    },
    fill: { backgroundImage: `linear-gradient(180deg, ${glass.pillTop}, ${glass.pillBottom})` },
  },
};

/** Props for a glass surface. */
type GlassSurfaceProps = {
  /** Size, position and corner rounding. */
  style?: StyleProp<ViewStyle>;
  /** Plain glass or the brighter pill glass. */
  look?: GlassLook;
  /** What sits on the glass. */
  children?: ReactNode;
};

/** A frosted glass surface with the design's soft edge and shadow. */
export function GlassSurface({ style, look = 'plain', children }: GlassSurfaceProps) {
  return (
    <View style={[styles.base, LOOKS[look].edge, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, LOOKS[look].fill]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: glass.still },
});
