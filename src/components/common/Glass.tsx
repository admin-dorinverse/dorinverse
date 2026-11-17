// Frosted glass surfaces that float over the sky, like the tabs, HUD pills, dock and map card.
// The sky is wrapped in a blur target so glass can blur it on Android too.

import { BlurTargetView, BlurView } from 'expo-blur';
import { createContext, useContext, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { glass } from '@/theme/colors';

/** The view that glass blurs. Android needs a reference to it; iPhones blur whatever is behind. */
type BlurTargetRef = RefObject<ComponentRef<typeof View> | null>;

const GlassTargetContext = createContext<BlurTargetRef | null>(null);

/** Props for the blur target. */
type GlassBackdropProps = {
  /** The content glass should blur, usually the sky. */
  children: ReactNode;
  /** Everything that floats on top of the content. */
  overlay: ReactNode;
};

/** Wraps the content that glass blurs (the sky), and shares it with the glass surfaces in `overlay`. */
export function GlassBackdrop({ children, overlay }: GlassBackdropProps) {
  const target = useRef<ComponentRef<typeof View> | null>(null);
  return (
    <GlassTargetContext.Provider value={target}>
      <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
        {children}
      </BlurTargetView>
      {overlay}
    </GlassTargetContext.Provider>
  );
}

/** The two looks of glass in the design. */
type GlassLook = 'plain' | 'pill';

/** The design's shading for each look: fill gradient, edge and shadows. */
const LOOKS: Record<GlassLook, ViewStyle> = {
  plain: {
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
  },
  pill: {
    backgroundImage: `linear-gradient(180deg, ${glass.pillTop}, ${glass.pillBottom})`,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderTopColor: glass.borderTop,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 0 rgba(0,0,0,0.25), 0 10px 18px -8px rgba(0,0,0,0.6)',
  },
};

/** Props for a glass surface. */
type GlassSurfaceProps = {
  /** Size, position and corner rounding. Corner rounding also clips the blur. */
  style?: StyleProp<ViewStyle>;
  /** Plain glass or the brighter pill glass. */
  look?: GlassLook;
  /** What sits on the glass. */
  children?: ReactNode;
};

/** A frosted glass surface. It blurs the sky behind it and adds the design's soft edge and shadow. */
export function GlassSurface({ style, look = 'plain', children }: GlassSurfaceProps) {
  const target = useContext(GlassTargetContext);
  return (
    <View style={[styles.base, LOOKS[look], style]}>
      <BlurView
        style={[StyleSheet.absoluteFill, styles.clip]}
        intensity={40}
        tint="dark"
        blurTarget={target ?? undefined}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  clip: { overflow: 'hidden' },
});
